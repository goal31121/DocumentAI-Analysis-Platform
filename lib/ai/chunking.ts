/**
 * Document chunking utilities for RAG pipeline
 * Chunks documents into smaller pieces with overlap for better context preservation
 */

export interface DocumentChunk {
  text: string;
  chunkIndex: number;
  startChar: number;
  endChar: number;
  metadata?: {
    pageNumber?: number;
    documentId?: string;
    [key: string]: unknown;
  };
}

/**
 * Estimate token count for a text string
 * Uses a simple approximation: ~4 characters per token for English text
 * For more accurate counting, consider using tiktoken library
 * @param text - The text to estimate tokens for
 * @returns Estimated token count
 */
function estimateTokenCount(text: string): number {
  // Rough approximation: 1 token ≈ 4 characters for English text
  // This is a conservative estimate
  return Math.ceil(text.length / 4);
}

/**
 * Split text into chunks with specified token size and overlap
 * @param text - The text to chunk
 * @param chunkSize - Maximum tokens per chunk (default: 500)
 * @param overlap - Number of tokens to overlap between chunks (default: 50)
 * @param metadata - Optional metadata to attach to each chunk
 * @returns Array of document chunks
 */
export function chunkDocument(
  text: string,
  chunkSize: number = 500,
  overlap: number = 50,
  metadata?: DocumentChunk['metadata']
): DocumentChunk[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  if (chunkSize <= 0) {
    throw new Error('Chunk size must be greater than 0');
  }

  if (overlap < 0 || overlap >= chunkSize) {
    throw new Error('Overlap must be non-negative and less than chunk size');
  }

  const chunks: DocumentChunk[] = [];
  let currentIndex = 0;
  let chunkIndex = 0;

  // Split text into sentences to preserve semantic boundaries
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  let currentChunk = '';
  let currentStartChar = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const sentenceTokens = estimateTokenCount(sentence);
    const currentChunkTokens = estimateTokenCount(currentChunk);

    // If adding this sentence would exceed chunk size, save current chunk
    if (currentChunkTokens + sentenceTokens > chunkSize && currentChunk.length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        chunkIndex: chunkIndex++,
        startChar: currentStartChar,
        endChar: currentStartChar + currentChunk.length,
        metadata,
      });

      // Start new chunk with overlap
      // Calculate overlap in characters (approximate)
      const overlapChars = Math.floor((overlap / chunkSize) * currentChunk.length);
      const overlapText = currentChunk.slice(-overlapChars);
      currentChunk = overlapText + sentence;
      currentStartChar = currentStartChar + currentChunk.length - overlapChars - sentence.length;
    } else {
      // Add sentence to current chunk
      if (currentChunk.length === 0) {
        currentStartChar = currentIndex;
      }
      currentChunk += sentence;
    }

    currentIndex += sentence.length;
  }

  // Add the last chunk if it exists
  if (currentChunk.trim().length > 0) {
    chunks.push({
      text: currentChunk.trim(),
      chunkIndex: chunkIndex,
      startChar: currentStartChar,
      endChar: currentStartChar + currentChunk.length,
      metadata,
    });
  }

  // If text is shorter than chunk size, return single chunk
  if (chunks.length === 0 && text.trim().length > 0) {
    chunks.push({
      text: text.trim(),
      chunkIndex: 0,
      startChar: 0,
      endChar: text.length,
      metadata,
    });
  }

  return chunks;
}

/**
 * Chunk document with page-aware splitting (for PDFs)
 * @param text - The text to chunk
 * @param pageBreaks - Array of character positions where pages break
 * @param chunkSize - Maximum tokens per chunk (default: 500)
 * @param overlap - Number of tokens to overlap between chunks (default: 50)
 * @param metadata - Optional metadata to attach to each chunk
 * @returns Array of document chunks with page numbers
 */
export function chunkDocumentWithPages(
  text: string,
  pageBreaks: number[],
  chunkSize: number = 500,
  overlap: number = 50,
  metadata?: DocumentChunk['metadata']
): DocumentChunk[] {
  if (pageBreaks.length === 0) {
    return chunkDocument(text, chunkSize, overlap, metadata);
  }

  const chunks: DocumentChunk[] = [];
  const pages: { text: string; pageNumber: number }[] = [];

  // Split text by page breaks
  let lastBreak = 0;
  pageBreaks.forEach((breakPos, index) => {
    pages.push({
      text: text.slice(lastBreak, breakPos),
      pageNumber: index + 1,
    });
    lastBreak = breakPos;
  });
  // Add last page
  if (lastBreak < text.length) {
    pages.push({
      text: text.slice(lastBreak),
      pageNumber: pages.length + 1,
    });
  }

  // Chunk each page separately, preserving page numbers
  let globalChunkIndex = 0;
  pages.forEach((page) => {
    const pageChunks = chunkDocument(page.text, chunkSize, overlap, {
      ...metadata,
      pageNumber: page.pageNumber,
    });

    // Update chunk indices to be globally unique
    pageChunks.forEach((chunk) => {
      chunks.push({
        ...chunk,
        chunkIndex: globalChunkIndex++,
        metadata: {
          ...chunk.metadata,
          pageNumber: page.pageNumber,
        },
      });
    });
  });

  return chunks;
}

/**
 * Merge small chunks that are below a minimum size threshold
 * Useful for cleaning up chunks that are too small to be meaningful
 * @param chunks - Array of chunks to merge
 * @param minChunkSize - Minimum token size for a chunk (default: 100)
 * @returns Array of merged chunks
 */
export function mergeSmallChunks(chunks: DocumentChunk[], minChunkSize: number = 100): DocumentChunk[] {
  if (chunks.length === 0) {
    return [];
  }

  const merged: DocumentChunk[] = [];
  let currentChunk: DocumentChunk | null = null;

  for (const chunk of chunks) {
    const chunkTokens = estimateTokenCount(chunk.text);

    if (chunkTokens < minChunkSize && currentChunk) {
      // Merge with previous chunk
      currentChunk.text += ' ' + chunk.text;
      currentChunk.endChar = chunk.endChar;
    } else {
      // Save current chunk and start new one
      if (currentChunk) {
        merged.push(currentChunk);
      }
      currentChunk = { ...chunk };
    }
  }

  // Add the last chunk
  if (currentChunk) {
    merged.push(currentChunk);
  }

  return merged;
}
