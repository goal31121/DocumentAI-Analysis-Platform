import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/server';
import { deleteConversation } from '@/lib/ai/conversations';

/**
 * DELETE /api/conversations/[id]
 * Delete a conversation and all its messages
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: conversationId } = await params;

    const deleted = await deleteConversation(conversationId, session.user.id);

    if (!deleted) {
      return NextResponse.json({ error: 'Conversation not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Conversation deleted successfully',
    });
  } catch (error) {
    console.error('Delete conversation error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete conversation',
      },
      { status: 500 }
    );
  }
}
