import { Pinecone, RecordMetadata } from '@pinecone-database/pinecone';

// Note: In Next.js runtime, environment variables are automatically loaded.
// For standalone scripts, import '../scripts/load-env' at the top of the script file.

if (!process.env.PINECONE_API_KEY) {
  console.warn('PINECONE_API_KEY environment variable is not set. Vector operations will fail.');
}

if (!process.env.PINECONE_INDEX) {
  console.warn('PINECONE_INDEX environment variable is not set. Vector operations will fail.');
}

// Initialize Pinecone client
let pineconeClient: Pinecone | null = null;

/**
 * Get or initialize the Pinecone client
 * @returns Pinecone client instance
 * @throws Error if API key is not configured
 */
function getPineconeClient(): Pinecone {
  if (!process.env.PINECONE_API_KEY) {
    throw new Error('PINECONE_API_KEY environment variable is not set');
  }

  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
  }

  return pineconeClient;
}

/**
 * Get the Pinecone index
 * @returns Pinecone index instance
 * @throws Error if index name or API key is not configured
 */
export async function getPineconeIndex() {
  const client = getPineconeClient();
  const indexName = process.env.PINECONE_INDEX;

  if (!indexName) {
    throw new Error('PINECONE_INDEX environment variable is not set');
  }

  return client.index(indexName);
}

/**
 * Vector metadata structure for document chunks
 * All values must be compatible with Pinecone's RecordMetadataValue:
 * string | boolean | number | Array<string>
 */
export interface VectorMetadata {
  documentId: string;
  chunkIndex: number;
  text: string;
  pageNumber?: number;
  fileName?: string;
  fileType?: string;
  userId: string;
  createdAt?: string;
}

/**
 * Upsert vectors into Pinecone index
 * @param vectors - Array of vectors with embeddings and metadata
 * @throws Error if index is not configured or upsert fails
 */
export async function upsertVectors(
  vectors: Array<{
    id: string;
    values: number[];
    metadata: VectorMetadata;
  }>
): Promise<void> {
  if (vectors.length === 0) {
    return;
  }

  const index = await getPineconeIndex();

  try {
    // Pinecone supports batch upserts up to 100 vectors at a time
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      // Type assertion: VectorMetadata is compatible with RecordMetadata
      // All values are string | number | boolean | Array<string> (RecordMetadataValue)
      // Using double assertion to satisfy TypeScript's structural typing
      await index.upsert(batch as unknown as Array<{ id: string; values: number[]; metadata: RecordMetadata }>);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to upsert vectors to Pinecone: ${error.message}`);
    }
    throw new Error('Failed to upsert vectors to Pinecone: Unknown error');
  }
}

/**
 * Query Pinecone index for similar vectors
 * @param queryVector - The query embedding vector
 * @param topK - Number of results to return (default: 5)
 * @param filter - Optional metadata filter
 * @returns Array of matching vectors with scores
 */
export async function queryVectors(
  queryVector: number[],
  topK: number = 5,
  filter?: Record<string, unknown>
): Promise<Array<{ id: string; score: number; metadata: VectorMetadata }>> {
  if (!queryVector || queryVector.length === 0) {
    throw new Error('Query vector cannot be empty');
  }

  const index = await getPineconeIndex();

  try {
    const queryResponse = await index.query({
      vector: queryVector,
      topK,
      includeMetadata: true,
      ...(filter && { filter }),
    });

    if (!queryResponse.matches) {
      return [];
    }

    return queryResponse.matches.map((match) => ({
      id: match.id || '',
      score: match.score || 0,
      // Type assertion: RecordMetadata from Pinecone is compatible with VectorMetadata
      // Using double assertion to satisfy TypeScript's structural typing
      metadata: (match.metadata as unknown as VectorMetadata) || ({} as VectorMetadata),
    }));
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to query Pinecone: ${error.message}`);
    }
    throw new Error('Failed to query Pinecone: Unknown error');
  }
}

/**
 * Delete vectors by IDs
 * @param ids - Array of vector IDs to delete
 * @throws Error if deletion fails
 */
export async function deleteVectors(ids: string[]): Promise<void> {
  if (ids.length === 0) {
    return;
  }

  const index = await getPineconeIndex();

  try {
    await index.deleteMany(ids);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to delete vectors from Pinecone: ${error.message}`);
    }
    throw new Error('Failed to delete vectors from Pinecone: Unknown error');
  }
}

/**
 * Delete all vectors for a specific document
 * @param documentId - The document ID to delete vectors for
 * @throws Error if deletion fails
 */
export async function deleteDocumentVectors(documentId: string): Promise<void> {
  const index = await getPineconeIndex();

  try {
    // Query for all vectors with this documentId
    const queryResponse = await index.query({
      vector: new Array(1536).fill(0), // Dummy vector for metadata-only query
      topK: 10000, // Maximum allowed
      includeMetadata: true,
      filter: {
        documentId: { $eq: documentId },
      },
    });

    if (queryResponse.matches && queryResponse.matches.length > 0) {
      const ids = queryResponse.matches.map((match) => match.id || '').filter(Boolean);
      if (ids.length > 0) {
        await index.deleteMany(ids);
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to delete document vectors from Pinecone: ${error.message}`);
    }
    throw new Error('Failed to delete document vectors from Pinecone: Unknown error');
  }
}

/**
 * Check if Pinecone is properly configured
 * @returns true if configuration is valid, false otherwise
 */
export function isPineconeConfigured(): boolean {
  return !!(process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX);
}
