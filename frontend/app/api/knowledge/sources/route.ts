import { NextRequest, NextResponse } from 'next/server';
import { createBackgroundAnonClient } from '@/lib/supabase';

/**
 * Erstellt einen Supabase-Client für anonyme Demo-Sessions
 * Verwendet direkt die Anon-Key ohne Cookie-Handling für bessere RLS-Kompatibilität
 */
function createAnonSupabaseClient() {
  return createBackgroundAnonClient();
}

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID ist erforderlich' },
        { status: 400 }
      );
    }

    // ✅ Für anonyme Demo-Sessions: Verwende direkten Anon-Client
    // RLS-Policy "Allow anonymous access for demo sessions" erlaubt Zugriff wenn session_id IS NOT NULL
    const supabase = createAnonSupabaseClient();

    const { data, error } = await supabase
      .from('knowledge_sources')
      .select('id, name, type, status, created_at, metadata')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Sources API] Supabase Error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        sessionId,
      });
      throw error;
    }

    console.log(`[Sources API] Found ${data?.length || 0} sources for sessionId: ${sessionId}`);

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error('Error fetching sources:', error);
    return NextResponse.json(
      { error: error.message || 'Fehler beim Laden der Quellen' },
      { status: 500 }
    );
  }
}

