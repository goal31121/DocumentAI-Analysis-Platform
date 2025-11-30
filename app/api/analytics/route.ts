import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/server';
import { db } from '@/lib/db';
import { documents, usage } from '@/lib/db/schema';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { getUsageStats } from '@/lib/ai/cost-tracker';

/**
 * GET /api/analytics
 * Get analytics data for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    // Get all documents for the user
    const userDocuments = await db
      .select()
      .from(documents)
      .where(eq(documents.userId, session.user.id))
      .orderBy(desc(documents.createdAt));

    // Get usage statistics
    const usageStats = await getUsageStats(session.user.id, start, end);

    // Get document timeline data
    const timelineData = userDocuments.map((doc) => ({
      id: doc.id,
      fileName: doc.fileName,
      fileType: doc.fileType,
      status: doc.status,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));

    // Get entity frequency (aggregate from all documents)
    // This would require querying entities for each document, which is expensive
    // For now, we'll return a placeholder structure
    const entityFrequency: Array<{ name: string; count: number; type: string }> = [];

    // Get sentiment distribution
    const sentimentDistribution = {
      positive: 0,
      negative: 0,
      neutral: 0,
    };

    // Calculate document statistics
    const documentStats = {
      total: userDocuments.length,
      byType: {
        pdf: userDocuments.filter((d) => d.fileType === 'pdf').length,
        docx: userDocuments.filter((d) => d.fileType === 'docx').length,
        xlsx: userDocuments.filter((d) => d.fileType === 'xlsx').length,
      },
      byStatus: {
        uploaded: userDocuments.filter((d) => d.status === 'uploaded').length,
        processing: userDocuments.filter((d) => d.status === 'processing').length,
        completed: userDocuments.filter((d) => d.status === 'completed').length,
        error: userDocuments.filter((d) => d.status === 'error').length,
      },
    };

    return NextResponse.json({
      success: true,
      data: {
        documentStats,
        usageStats,
        timelineData,
        entityFrequency,
        sentimentDistribution,
      },
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch analytics',
      },
      { status: 500 }
    );
  }
}
