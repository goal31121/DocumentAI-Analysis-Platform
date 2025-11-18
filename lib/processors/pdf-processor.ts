import { getFileFromS3 } from '../storage/s3';
import { PDFParse } from 'pdf-parse';

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
 * Uses pdf-parse v2 API with PDFParse class
 * @param fileBuffer - PDF file buffer
 * @returns Processing result with extracted text and metadata
 */
export async function processPDF(fileBuffer: Buffer): Promise<PDFProcessingResult> {
  const parser = new PDFParse({ data: fileBuffer });

  try {
    // Extract text using v2 API
    const textResult = await parser.getText();

    // Extract metadata/info
    const infoResult = await parser.getInfo({ parsePageInfo: true });

    // Access metadata from InfoResult.info (PDF Info dictionary)
    const info = infoResult.info || {};

    // Get dates from DateNode helper
    const dateNode = infoResult.getDateNode();

    return {
      text: textResult.text,
      pageCount: infoResult.total || textResult.pages?.length || 0,
      metadata: {
        title: info?.Title,
        author: info?.Author,
        subject: info?.Subject,
        creator: info?.Creator,
        producer: info?.Producer,
        creationDate: dateNode?.CreationDate || undefined,
        modificationDate: dateNode?.ModDate || undefined,
      },
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to process PDF: ${error.message}`);
    }
    throw new Error('Failed to process PDF: Unknown error');
  } finally {
    // Always destroy parser to free memory
    await parser.destroy();
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
