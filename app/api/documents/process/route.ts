import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/server';
import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema';
import { processDocumentQueue, retryDocumentProcessing } from '@/lib/queue/processor';
import { eq, and } from 'drizzle-orm';

/**
 * POST /api/documents/process
 * Process a document (extract text, chunk, generate embeddings, index)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let documentId: string | undefined;

  try {
    const body = await request.json().catch(() => ({}));
    documentId = body.documentId;
    const { retry, userId: bodyUserId } = body;

    if (!documentId) {
      console.error('[Process] Missing documentId in request body');
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    // Try to get session (for user-initiated requests)
    const session = await getServerSession();
    let userId: string;

    if (session?.user) {
      // User-initiated request with valid session
      userId = session.user.id;
    } else if (bodyUserId) {
      // Internal request from upload route - verify the userId matches the document
      userId = bodyUserId;
      console.log(`[Process] Internal request detected for document ${documentId} (userId: ${userId})`);
    } else {
      console.error('[Process] Unauthorized: No session or userId provided');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[Process] Starting processing for document ${documentId} (user: ${userId}, retry: ${retry || false})`);

    // Verify document belongs to user
    const [document] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.userId, userId)))
      .limit(1);

    if (!document) {
      console.error(`[Process] Document not found: ${documentId} for user ${userId}`);
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Check if document is already processing
    if (document.status === 'processing') {
      console.log(`[Process] Document ${documentId} is already being processed`);
      return NextResponse.json({ message: 'Document is already being processed', documentId }, { status: 200 });
    }

    // Check if document is already completed
    if (document.status === 'completed' && !retry) {
      console.log(`[Process] Document ${documentId} is already completed`);
      return NextResponse.json({ message: 'Document is already processed', documentId }, { status: 200 });
    }

    // Process document - await to ensure it completes before function terminates
    // This ensures errors are caught and logged properly
    try {
      if (retry) {
        console.log(`[Process] Retrying processing for document ${documentId}`);
        await retryDocumentProcessing(documentId);
      } else {
        console.log(
          `[Process] Processing document ${documentId} (fileType: ${document.fileType}, s3Key: ${document.s3Key})`
        );
        await processDocumentQueue(documentId, userId, document.s3Key, document.fileType as 'pdf' | 'docx' | 'xlsx');
      }

      const duration = Date.now() - startTime;
      console.log(`[Process] Successfully processed document ${documentId} in ${duration}ms`);
    } catch (processingError) {
      const duration = Date.now() - startTime;
      const errorMessage = processingError instanceof Error ? processingError.message : 'Unknown error';
      const errorStack = processingError instanceof Error ? processingError.stack : undefined;

      console.error(`[Process] Failed to process document ${documentId} after ${duration}ms:`, {
        error: errorMessage,
        stack: errorStack,
        documentId,
        userId,
        fileType: document.fileType,
      });

      // Re-throw to be caught by outer try-catch
      throw processingError;
    }

    return NextResponse.json({
      success: true,
      message: 'Document processing completed',
      documentId,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error(`[Process] Process route error after ${duration}ms:`, {
      error: errorMessage,
      stack: errorStack,
      documentId: documentId || 'unknown',
    });

    return NextResponse.json(
      {
        error: errorMessage,
        documentId: documentId || undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/documents/process?documentId=xxx
 * Get processing status of a document
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

    return NextResponse.json({
      documentId: document.id,
      status: document.status,
      metadata: document.metadata,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  } catch (error) {
    console.error('Get process status error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get processing status' },
      { status: 500 }
    );
  }
}
