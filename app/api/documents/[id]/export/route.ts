import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/server';
import { db } from '@/lib/db';
import { documents, conversations, messages } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/documents/[id]/export?format=json|csv|pdf
 * Export document analysis data
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'json';

    // Verify document belongs to user
    const [document] = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, id), eq(documents.userId, session.user.id)))
      .limit(1);

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Get conversations for this document
    const documentConversations = await db
      .select()
      .from(conversations)
      .where(eq(conversations.documentId, id))
      .orderBy(conversations.createdAt);

    // Get all messages for these conversations
    const conversationIds = documentConversations.map((c) => c.id);
    let allMessages: Array<{
      id: string;
      conversationId: string;
      role: string;
      content: string;
      sources: unknown;
      model: string | null;
      createdAt: Date | null;
    }> = [];

    if (conversationIds.length > 0) {
      // Get messages from all conversations
      const messagesList = await Promise.all(
        conversationIds.map((convId) =>
          db.select().from(messages).where(eq(messages.conversationId, convId)).orderBy(messages.createdAt)
        )
      );
      allMessages = messagesList.flat();
    }

    // Prepare export data
    const exportData = {
      document: {
        id: document.id,
        fileName: document.fileName,
        fileType: document.fileType,
        fileSize: document.fileSize,
        status: document.status,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      },
      conversations: documentConversations.map((conv) => ({
        id: conv.id,
        title: conv.title,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      })),
      messages: allMessages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        sources: msg.sources,
        model: msg.model,
        createdAt: msg.createdAt,
      })),
      exportedAt: new Date().toISOString(),
    };

    // Format response based on requested format
    if (format === 'json') {
      return NextResponse.json(exportData, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${document.fileName.replace(/\.[^/.]+$/, '')}_analysis.json"`,
        },
      });
    }

    if (format === 'csv') {
      // Convert to CSV format
      const csvRows: string[] = [];
      csvRows.push('Type,Content,Model,Created At');
      allMessages.forEach((msg) => {
        const content = msg.content.replace(/"/g, '""'); // Escape quotes
        csvRows.push(`"${msg.role}","${content}","${msg.model || ''}","${msg.createdAt}"`);
      });

      const csvContent = csvRows.join('\n');
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${document.fileName.replace(/\.[^/.]+$/, '')}_analysis.csv"`,
        },
      });
    }

    if (format === 'pdf') {
      // For PDF, return JSON for now (PDF generation would require a library like pdfkit or puppeteer)
      // This is a placeholder - you can implement actual PDF generation later
      return NextResponse.json(
        { error: 'PDF export is not yet implemented. Please use JSON or CSV format.' },
        { status: 501 }
      );
    }

    return NextResponse.json({ error: 'Invalid format. Use json, csv, or pdf' }, { status: 400 });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to export document',
      },
      { status: 500 }
    );
  }
}
