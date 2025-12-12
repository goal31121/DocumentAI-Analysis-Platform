import { getFileFromS3 } from '../storage/s3';
// Static import so webpack can trace and Next.js can include in Vercel deployment
// Using pdf-parse v1.1.1 which works in serverless environments (no DOM dependencies)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

/**
 * PDF processing result
 */
export interface PDFProcessingResult {
  text: string;
  pageCount: number;
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: Date;
    modificationDate?: Date;
  };
}

/**
 * Process a PDF file and extract text content
 * Uses pdf-parse v1 API (function-based)
 * @param fileBuffer - PDF file buffer
 * @returns Processing result with extracted text and metadata
 */
export async function processPDF(fileBuffer: Buffer): Promise<PDFProcessingResult> {
  try {
    // pdf-parse v1 API - pass buffer directly to the function
    const data = await pdfParse(fileBuffer);

    return {
      text: data.text || '',
      pageCount: data.numpages || 0,
      metadata: {
        title: data.info?.Title,
        author: data.info?.Author,
        subject: data.info?.Subject,
        creator: data.info?.Creator,
        producer: data.info?.Producer,
        creationDate: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined,
        modificationDate: data.info?.ModDate ? new Date(data.info.ModDate) : undefined,
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to process PDF: ${error.message}`);
    }
    throw new Error('Failed to process PDF: Unknown error');
  }
}

/**
 * Process a PDF file from S3
 * @param s3Key - S3 key of the PDF file
 * @returns Processing result with extracted text and metadata
 */
export async function processPDFFromS3(s3Key: string): Promise<PDFProcessingResult> {
  const fileBuffer = await getFileFromS3(s3Key);
  return processPDF(fileBuffer);
}
