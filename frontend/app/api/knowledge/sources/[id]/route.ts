import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient, createBackgroundAnonClient } from '@/lib/supabase';

/**
 * Erstellt einen Supabase-Client für anonyme Demo-Sessions
 */
function createAnonSupabaseClient() {
  return createBackgroundAnonClient();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // ✅ Sicherstellen, dass kein Body mit GET gesendet wird
    if (request.method !== 'GET') {
      throw new Error(`Invalid method: ${request.method}. Expected GET.`);
    }
    
    // ✅ WICHTIG: Versuche NICHT, den Body zu lesen bei GET-Requests
    // Next.js kann versuchen, request.json() oder request.body zu lesen,
    // was den Fehler "Request has method 'GET' and cannot have a body" verursacht
    // Wir umgehen das komplett, indem wir den Body nie lesen
    
    const supabase = await createRouteHandlerClient();
    
    // Try to get user first (for authenticated requests)
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    // Get knowledge source - RLS policies handle authorization
    // For authenticated users: RLS allows access if user_id matches
    // For bot-specific sources: RLS allows access if bot_id belongs to user
    const { data: source, error } = await supabase
      .from('knowledge_sources')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      // If authenticated query failed, try with anon client (for demo sessions)
      // This handles cases where session_id is used instead of user_id
      const anonSupabase = createAnonSupabaseClient();
      const { data: anonSource, error: anonError } = await anonSupabase
        .from('knowledge_sources')
        .select('*')
        .eq('id', id)
        .single();

      if (anonError) {
        console.error('[GET Source] Error fetching source:', {
          id,
          userId,
          error: error.message,
          anonError: anonError.message,
        });
        throw error;
      }
      return NextResponse.json(anonSource);
    }

    if (!source) {
      return NextResponse.json(
        { error: 'Wissensquelle nicht gefunden' },
        { status: 404 }
      );
    }

    return NextResponse.json(source);
  } catch (error: any) {
    console.error('Error fetching source:', error);
    return NextResponse.json(
      { error: error.message || 'Fehler beim Laden der Wissensquelle' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const supabase = await createRouteHandlerClient();
    
    // Try to get user first (for authenticated requests)
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    // ✅ Try to get body, but handle case where body might be empty
    // WICHTIG: Nur für DELETE-Requests Body lesen (GET-Requests haben keinen Body!)
    let sessionId: string | null = null;
    if (request.method === 'DELETE') {
      try {
        // ✅ Nur bei DELETE: Versuche Body zu lesen
        const body = await request.json().catch(() => null);
        sessionId = body?.sessionId || null;
      } catch (error) {
        // Body might be empty or invalid - continue without sessionId
        // This is OK for authenticated users
        console.log('[DELETE Source] No body provided, checking authentication');
      }
    }

    // Get knowledge source - verify ownership
    const { data: source, error: sourceError } = await supabase
      .from('knowledge_sources')
      .select('id, session_id, user_id, bot_id')
      .eq('id', id)
      .single();

    if (sourceError || !source) {
      return NextResponse.json(
        { error: 'Wissensquelle nicht gefunden' },
        { status: 404 }
      );
    }

    // ✅ Verify ownership: authenticated user OR sessionId match
    if (userId && source.user_id === userId) {
      // Authenticated user owns the source - allow deletion
    } else if (sessionId && source.session_id === sessionId) {
      // Demo session matches - allow deletion
    } else {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 403 }
      );
    }

    // Delete source (cascade will delete chunks)
    const { error } = await supabase
      .from('knowledge_sources')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting source:', error);
    return NextResponse.json(
      { error: error.message || 'Fehler beim Löschen' },
      { status: 500 }
    );
  }
}

