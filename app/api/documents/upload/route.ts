import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/server';
import { db } from '@/lib/db';
import { documents } from '@/lib/db/schema';
import { uploadFileToS3, generateS3Key } from '@/lib/storage/s3';
import { rateLimitMiddleware } from '@/lib/rate-limit/middleware';
import { checkUploadQuotas } from '@/lib/quota/quota-manager';
import { getUserSubscription } from '@/lib/subscription/service';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only PDF, DOCX, and XLSX are supported' }, { status: 400 });
    }

    // Get user's subscription tier
    const userTier = await getUserSubscription(session.user.id);

    // Check rate limit
    const { response: rateLimitResponse } = await rateLimitMiddleware(session.user.id, userTier, 'upload');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Check quotas using user's actual subscription tier
    const quotaCheck = await checkUploadQuotas(session.user.id, userTier, file.size);
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Quota exceeded',
          message: quotaCheck.reasons.join('; '),
          quotas: {
            document: quotaCheck.documentQuota,
            storage: quotaCheck.storageQuota,
            fileSize: quotaCheck.fileSizeQuota,
            concurrent: quotaCheck.concurrentQuota,
          },
        },
        { status: 403 }
      );
    }

    // Validate file size (50MB - this is a hard limit, tier limits are checked above)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 50MB limit' }, { status: 400 });
    }

    // Generate S3 key
    const s3Key = generateS3Key(session.user.id, file.name);

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to S3
    await uploadFileToS3(s3Key, buffer, file.type);

    // Determine file type
    let fileType = 'pdf';
    if (file.type.includes('wordprocessingml')) fileType = 'docx';
    if (file.type.includes('spreadsheetml')) fileType = 'xlsx';

    // Save document metadata to database
    const [document] = await db
      .insert(documents)
      .values({
        userId: session.user.id,
        fileName: file.name,
        fileType,
        fileSize: file.size,
        s3Key,
        status: 'uploaded',
      })
      .returning();

    // Trigger document processing in a separate serverless function via HTTP
    // This ensures processing runs independently and doesn't get killed by function timeouts
    // Use the request origin to build the internal API URL
    const baseUrl = request.nextUrl.origin;
    const processUrl = `${baseUrl}/api/documents/process`;

    // Trigger processing asynchronously (non-blocking)
    // Don't await - let it run in the background
    fetch(processUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward the authorization cookie so the process route can authenticate
        Cookie: request.headers.get('cookie') || '',
      },
      body: JSON.stringify({
        documentId: document.id,
        userId: session.user.id, // Pass userId for internal authentication
      }),
    }).catch((error) => {
      // Log error but don't fail the upload
      // The user can manually trigger processing later via the API if needed
      console.error(`[Upload] Failed to trigger processing for document ${document.id}:`, error);
    });

    return NextResponse.json({
      success: true,
      documentId: document.id,
      document,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
