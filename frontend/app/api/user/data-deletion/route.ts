import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase';

/**
 * GDPR Art. 17 - Right to Erasure ("Right to be Forgotten")
 * DELETE /api/user/data-deletion
 * 
 * Allows users to request deletion of their personal data
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }

    // Get confirmation from request body
    const { confirm } = await request.json();
    if (confirm !== true) {
      return NextResponse.json(
        { error: 'Bitte bestätigen Sie die Löschung explizit' },
        { status: 400 }
      );
    }

    // 1. Delete all bots owned by user
    const { error: botsError } = await supabase
      .from('bots')
      .delete()
      .eq('user_id', user.id);

    if (botsError) {
      console.error('[Data Deletion] Error deleting bots:', botsError);
    }

    // 2. Delete all knowledge sources owned by user
    const { error: knowledgeError } = await supabase
      .from('knowledge_sources')
      .delete()
      .eq('user_id', user.id);

    if (knowledgeError) {
      console.error('[Data Deletion] Error deleting knowledge sources:', knowledgeError);
    }

    // 3. Delete all chat sessions owned by user
    const { error: chatSessionsError } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('user_id', user.id);

    if (chatSessionsError) {
      console.error('[Data Deletion] Error deleting chat sessions:', chatSessionsError);
    }

    // 4. Delete all chat messages for user's sessions
    // First, get all session IDs
    const { data: sessions } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('user_id', user.id);

    if (sessions && sessions.length > 0) {
      const sessionIds = sessions.map((s: { id: string }) => s.id);
      const { error: messagesError } = await supabase
        .from('chat_messages')
        .delete()
        .in('chat_session_id', sessionIds);

      if (messagesError) {
        console.error('[Data Deletion] Error deleting chat messages:', messagesError);
      }
    }

    // 5. Delete user account from Supabase Auth
    // Note: This also triggers CASCADE deletions in database
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(user.id);

    if (deleteUserError) {
      console.error('[Data Deletion] Error deleting user from auth:', deleteUserError);
      // Try alternative: Update user email to anonymized
      await supabase.auth.admin.updateUserById(user.id, {
        email: `deleted_${user.id}@deleted.local`,
        email_confirm: false,
      });
    }

    // 6. Log the deletion (for audit purposes, anonymized)
    console.log(`[Data Deletion] User data deleted for user: ${user.id} at ${new Date().toISOString()}`);

    return NextResponse.json({
      success: true,
      message: 'Ihre Daten wurden erfolgreich gelöscht. Sie werden nun abgemeldet.',
    });
  } catch (error: any) {
    console.error('[Data Deletion] Exception:', error);
    return NextResponse.json(
      { error: error.message || 'Fehler beim Löschen der Daten' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/user/data-deletion - Get information about data deletion
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 401 }
      );
    }

    // Get data summary
    const [botsResult, knowledgeResult, chatSessionsResult] = await Promise.all([
      supabase.from('bots').select('id').eq('user_id', user.id),
      supabase.from('knowledge_sources').select('id').eq('user_id', user.id),
      supabase.from('chat_sessions').select('id').eq('user_id', user.id),
    ]);

    return NextResponse.json({
      userId: user.id,
      email: user.email,
      dataSummary: {
        bots: botsResult.data?.length || 0,
        knowledgeSources: knowledgeResult.data?.length || 0,
        chatSessions: chatSessionsResult.data?.length || 0,
      },
      warning: 'Das Löschen ist endgültig und kann nicht rückgängig gemacht werden. Alle Ihre Bots, Wissensquellen und Daten werden unwiderruflich gelöscht.',
    });
  } catch (error: any) {
    console.error('[Data Deletion Info] Exception:', error);
    return NextResponse.json(
      { error: error.message || 'Fehler beim Abrufen der Informationen' },
      { status: 500 }
    );
  }
}

