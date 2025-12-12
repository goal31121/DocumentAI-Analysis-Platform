import { db } from '../db';
import { documents } from '../db/schema';
import { processDocument } from '../processors';
import { indexDocumentChunks } from '../ai/rag-pipeline';
import { eq } from 'drizzle-orm';

/**
 * Process a document asynchronously
 * This function handles the full processing pipeline:
 * 1. Extract text from document
 * 2. Chunk the text
 * 3. Generate embeddings
 * 4. Store in vector database
 * 5. Update document status
 *
 * @param documentId - ID of the document to process
 * @param userId - ID of the user who owns the document
 * @param s3Key - S3 key of the document file
 * @param fileType - Type of the document (pdf, docx, xlsx)
 */
export async function processDocumentQueue(
  documentId: string,
  userId: string,
  s3Key: string,
  fileType: 'pdf' | 'docx' | 'xlsx'
): Promise<void> {
  const startTime = Date.now();
  console.log(
    `[Processor] Starting processing pipeline for document ${documentId} (userId: ${userId}, fileType: ${fileType}, s3Key: ${s3Key})`
  );

  try {
    // Step 1: Update status to processing
    console.log(`[Processor] Step 1: Updating document ${documentId} status to 'processing'`);
    await db
      .update(documents)
      .set({
        status: 'processing',
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));
    console.log(`[Processor] Step 1: Successfully updated document ${documentId} status to 'processing'`);

    // Step 2: Process the document (extract text)
    console.log(`[Processor] Step 2: Extracting text from document ${documentId} (fileType: ${fileType})`);
    const extractStartTime = Date.now();
    const processingResult = await processDocument(s3Key, fileType);
    const extractDuration = Date.now() - extractStartTime;
    console.log(
      `[Processor] Step 2: Successfully extracted text from document ${documentId} in ${extractDuration}ms (text length: ${processingResult.text.length})`
    );

    // Step 3: Update document with extracted metadata
    console.log(`[Processor] Step 3: Updating document ${documentId} with extracted metadata`);
    await db
      .update(documents)
      .set({
        status: 'completed',
        metadata: processingResult.metadata,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));
    console.log(`[Processor] Step 3: Successfully updated document ${documentId} with metadata`);

    // Step 4: Chunk the document
    console.log(`[Processor] Step 4: Chunking document ${documentId}`);
    const chunkStartTime = Date.now();
    const { chunkDocument } = await import('../ai/chunking');
    const chunks = chunkDocument(processingResult.text);
    const chunkDuration = Date.now() - chunkStartTime;
    console.log(
      `[Processor] Step 4: Successfully chunked document ${documentId} into ${chunks.length} chunks in ${chunkDuration}ms`
    );

    // Step 5: Index chunks in vector database
    console.log(`[Processor] Step 5: Indexing ${chunks.length} chunks for document ${documentId} in vector database`);
    const indexStartTime = Date.now();
    await indexDocumentChunks(chunks, documentId, userId, {
      fileName: processingResult.metadata.pdfMetadata?.title || undefined,
      fileType,
    });
    const indexDuration = Date.now() - indexStartTime;
    console.log(`[Processor] Step 5: Successfully indexed chunks for document ${documentId} in ${indexDuration}ms`);

    const totalDuration = Date.now() - startTime;
    console.log(
      `[Processor] Successfully completed processing pipeline for document ${documentId} in ${totalDuration}ms`
    );
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error(`[Processor] Error processing document ${documentId} after ${totalDuration}ms:`, {
      error: errorMessage,
      stack: errorStack,
      documentId,
      userId,
      s3Key,
      fileType,
    });

    // Update status to error
    try {
      await db
        .update(documents)
        .set({
          status: 'error',
          metadata: {
            error: errorMessage,
            errorAt: new Date().toISOString(),
            errorStack: errorStack?.substring(0, 1000), // Limit stack trace length
          },
          updatedAt: new Date(),
        })
        .where(eq(documents.id, documentId));
      console.log(`[Processor] Updated document ${documentId} status to 'error'`);
    } catch (dbError) {
      // If we can't update the database, log it but don't mask the original error
      console.error(`[Processor] Failed to update document ${documentId} status to 'error':`, dbError);
    }

    // Re-throw to allow caller to handle
    throw error;
  }
}

/**
 * Retry processing a failed document
 * @param documentId - ID of the document to retry
 * @param maxRetries - Maximum number of retries (default: 3)
 */
export async function retryDocumentProcessing(documentId: string, maxRetries: number = 3): Promise<void> {
  console.log(`[Processor] Retry: Starting retry for document ${documentId} (maxRetries: ${maxRetries})`);

  const [document] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);

  if (!document) {
    const error = `Document not found: ${documentId}`;
    console.error(`[Processor] Retry: ${error}`);
    throw new Error(error);
  }

  if (document.status === 'completed') {
    console.log(`[Processor] Retry: Document ${documentId} is already completed, skipping retry`);
    return; // Already completed
  }

  // Check retry count from metadata
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const retryCount = (document.metadata as any)?.retryCount || 0;
  if (retryCount >= maxRetries) {
    const error = `Maximum retry attempts (${maxRetries}) exceeded for document ${documentId}`;
    console.error(`[Processor] Retry: ${error} (current retry count: ${retryCount})`);
    throw new Error(error);
  }

  console.log(`[Processor] Retry: Retrying document ${documentId} (attempt ${retryCount + 1}/${maxRetries})`);

  // Update retry count
  await db
    .update(documents)
    .set({
      metadata: {
        ...((document.metadata as object) || {}),
        retryCount: retryCount + 1,
        lastRetryAt: new Date().toISOString(),
      },
    })
    .where(eq(documents.id, documentId));

  // Retry processing
  await processDocumentQueue(documentId, document.userId, document.s3Key, document.fileType as 'pdf' | 'docx' | 'xlsx');
}
