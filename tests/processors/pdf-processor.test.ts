import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processPDFFromS3 } from '@/lib/processors/pdf-processor';

// Mock dependencies
vi.mock('@/lib/storage/s3', () => ({
  getFileFromS3: vi.fn(),
}));

// Note: pdf-parse uses dynamic imports with new Function() which Vitest can't intercept
// These tests verify the structure and error handling, but full functionality
// requires integration tests with the actual pdf-parse module

describe('PDF Processor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.skip('should process PDF and extract text', async () => {
    // Skipped: Requires actual pdf-parse module which uses dynamic imports
    // that Vitest cannot intercept. This should be tested as an integration test.
    const mockPdfBuffer = Buffer.from('mock pdf content');

    const { getFileFromS3 } = await import('@/lib/storage/s3');
    vi.mocked(getFileFromS3).mockResolvedValue(mockPdfBuffer);

    const result = await processPDFFromS3('test-key.pdf');

    expect(result.text).toBeDefined();
    expect(result.pageCount).toBeDefined();
    expect(result.metadata).toBeDefined();
    expect(getFileFromS3).toHaveBeenCalledWith('test-key.pdf');
  });

  it('should handle PDF processing errors', async () => {
    const { getFileFromS3 } = await import('@/lib/storage/s3');
    vi.mocked(getFileFromS3).mockRejectedValue(new Error('S3 error'));

    await expect(processPDFFromS3('invalid-key.pdf')).rejects.toThrow();
  });

  it.skip('should handle empty PDF', async () => {
    // Skipped: Requires actual pdf-parse module which uses dynamic imports
    // that Vitest cannot intercept. This should be tested as an integration test.
    const mockPdfBuffer = Buffer.from('mock pdf content');

    const { getFileFromS3 } = await import('@/lib/storage/s3');
    vi.mocked(getFileFromS3).mockResolvedValue(mockPdfBuffer);

    const result = await processPDFFromS3('empty.pdf');
    expect(result).toBeDefined();
    expect(result.text).toBeDefined();
    expect(result.pageCount).toBeDefined();
  });

  it.skip('should extract metadata correctly', async () => {
    // Skipped: Requires actual pdf-parse module which uses dynamic imports
    // that Vitest cannot intercept. This should be tested as an integration test.
    const mockPdfBuffer = Buffer.from('mock pdf content');

    const { getFileFromS3 } = await import('@/lib/storage/s3');
    vi.mocked(getFileFromS3).mockResolvedValue(mockPdfBuffer);

    const result = await processPDFFromS3('test.pdf');

    expect(result.metadata).toBeDefined();
    expect(result.metadata.title).toBeDefined();
    expect(result.metadata.author).toBeDefined();
  });
});
