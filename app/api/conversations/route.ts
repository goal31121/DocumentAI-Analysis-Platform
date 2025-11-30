import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/server';
import { getUserConversations } from '@/lib/ai/conversations';

/**
 * GET /api/conversations?documentId=xxx
 * Get all conversations for the current user, optionally filtered by document
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const documentId = searchParams.get('documentId') || undefined;

    const conversations = await getUserConversations(session.user.id, documentId);

    return NextResponse.json({
      success: true,
      conversations: conversations.map((conv) => ({
        id: conv.id,
        title: conv.title,
        documentId: conv.documentId,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch conversations',
      },
      { status: 500 }
    );
  }
}

