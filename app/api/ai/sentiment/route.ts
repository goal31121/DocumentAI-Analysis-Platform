import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/server';
import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema';
import { queryDocuments } from '@/lib/ai/rag-pipeline';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/ai/sentiment?documentId=xxx
 * Analyze the sentiment of the document
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    // Verify document belongs to user
    const [document] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.userId, session.user.id)))
      .limit(1);

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (document.status !== 'completed') {
      return NextResponse.json({ error: 'Document is still processing' }, { status: 202 });
    }

    // Analyze sentiment using RAG pipeline
    const sentimentPrompt = `Analyze the overall sentiment of this document. Determine if the sentiment is:
- Positive: Optimistic, favorable, encouraging
- Negative: Pessimistic, critical, unfavorable
- Neutral: Factual, balanced, objective

Provide your analysis as a JSON object with this exact structure:
{
  "sentiment": "positive" | "negative" | "neutral",
  "score": 0.0-1.0 (where 0.0 is very negative, 0.5 is neutral, 1.0 is very positive),
  "confidence": 0.0-1.0 (how confident you are in this analysis)
}

Return only the JSON object, no additional text.`;

    const ragResult = await queryDocuments(sentimentPrompt, {
      documentIds: [documentId],
      userId: session.user.id,
      topK: 10,
      minScore: 0.3,
      modelOptions: {
        strategy: 'fallback',
        temperature: 0.3,
        maxTokens: 500,
      },
    });

    // Try to parse the JSON response
    let sentiment;
    try {
      // Extract JSON from the response (might have markdown code blocks)
      const jsonMatch = ragResult.answer.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        sentiment = JSON.parse(jsonMatch[0]);
      } else {
        sentiment = JSON.parse(ragResult.answer);
      }
    } catch (parseError) {
      console.error('Failed to parse sentiment JSON:', parseError);
      return NextResponse.json(
        {
          error: 'Failed to parse sentiment analysis results.',
          rawResponse: ragResult.answer,
        },
        { status: 500 }
      );
    }

    // Validate sentiment object
    if (
      !sentiment ||
      !['positive', 'negative', 'neutral'].includes(sentiment.sentiment) ||
      typeof sentiment.score !== 'number' ||
      typeof sentiment.confidence !== 'number'
    ) {
      return NextResponse.json({ error: 'Invalid sentiment format' }, { status: 500 });
    }

    // Ensure values are in valid ranges
    sentiment.score = Math.max(0, Math.min(1, sentiment.score));
    sentiment.confidence = Math.max(0, Math.min(1, sentiment.confidence));

    return NextResponse.json({
      success: true,
      sentiment: {
        sentiment: sentiment.sentiment,
        score: sentiment.score,
        confidence: sentiment.confidence,
      },
      model: ragResult.model,
    });
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to analyze sentiment',
      },
      { status: 500 }
    );
  }
}
