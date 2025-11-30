import OpenAI from 'openai';
import { getCachedEmbedding, cacheEmbedding } from '@/lib/cache/redis-cache';

// Note: In Next.js runtime, environment variables are automatically loaded.
// For standalone scripts, import '../scripts/load-env' at the top of the script file.

if (!process.env.OPENAI_API_KEY) {
  console.warn('OPENAI_API_KEY environment variable is not set. Embedding generation will fail.');
}

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

/**
 * Generate embeddings for a given text using OpenAI's text-embedding-3-large model
 * @param text - The text to generate embeddings for
 * @returns A promise that resolves to an array of 1536-dimensional embedding vectors
 * @throws Error if OpenAI API key is not configured or if the API call fails
 */
export async function generateEmbeddings(text: string): Promise<number[]> {
  if (!openai) {
    throw new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY environment variable.');
  }

  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty');
  }

  // Check cache first
  const cached = await getCachedEmbedding(text);
  if (cached) {
    return cached;
  }

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: text,
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('No embeddings returned from OpenAI API');
    }

    const embedding = response.data[0].embedding;

    // Cache the embedding
    await cacheEmbedding(text, embedding);

    return embedding;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to generate embeddings: ${error.message}`);
    }
    throw new Error('Failed to generate embeddings: Unknown error');
  }
}

/**
 * Generate embeddings for multiple texts in a single batch
 * @param texts - Array of texts to generate embeddings for
 * @returns A promise that resolves to an array of embedding vectors
 * @throws Error if OpenAI API key is not configured or if the API call fails
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  if (!openai) {
    throw new Error('OpenAI API key is not configured. Please set OPENAI_API_KEY environment variable.');
  }

  if (!texts || texts.length === 0) {
    throw new Error('Texts array cannot be empty');
  }

  // Filter out empty texts
  const validTexts = texts.filter((text) => text && text.trim().length > 0);
  if (validTexts.length === 0) {
    throw new Error('No valid texts provided');
  }

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: validTexts,
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('No embeddings returned from OpenAI API');
    }

    return response.data.map((item) => item.embedding);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to generate batch embeddings: ${error.message}`);
    }
    throw new Error('Failed to generate batch embeddings: Unknown error');
  }
}

/**
 * Get the embedding dimension for the configured model
 * @returns The dimension size (1536 for text-embedding-3-large)
 */
export function getEmbeddingDimension(): number {
  return 1536;
}
