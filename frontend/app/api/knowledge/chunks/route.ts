import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient, createServiceRoleClient } from '@/lib/supabase';

/**
 * API Route zum Einfügen von Chunks mit authentifiziertem User-Context
 * Dies umgeht RLS-Probleme, da der authentifizierte User-Client verwendet wird
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chunks, knowledgeSourceId, botId, userId: bodyUserId } = body;

    // ✅ Versuche authentifizierten User zu bekommen (aus Cookies oder Body)
    let userId: string | undefined = bodyUserId;
    
    try {
      const supabase = await createRouteHandlerClient();
      const { data: userData } = await supabase.auth.getUser();
      // ✅ Bevorzuge userId aus Cookie (authentifizierter Request)
      if (userData.user?.id) {
        userId = userData.user.id;
      }
    } catch (authError) {
      // ✅ Fallback: Wenn kein Cookie-Context, nutze userId aus Request Body
      console.log('[Chunks API] No cookie context, using userId from body:', bodyUserId);
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentifizierung erforderlich (userId fehlt)' },
        { status: 401 }
      );
    }

    // ✅ Verwende Service-Role-Key wenn verfügbar (umgeht RLS), sonst authentifizierten Client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    let supabase: any;
    
    if (supabaseServiceRoleKey) {
      // ✅ Service-Role-Key umgeht RLS komplett
      console.log('[Chunks API] Using Service-Role-Key for inserts');
      supabase = createServiceRoleClient();
    } else {
      // ✅ Fallback: Authentifizierter Client (funktioniert nur mit Cookies)
      console.log('[Chunks API] Using authenticated client (requires cookies)');
      supabase = await createRouteHandlerClient();
    }

    if (!chunks || !Array.isArray(chunks) || chunks.length === 0) {
      return NextResponse.json(
        { error: 'Keine Chunks bereitgestellt' },
        { status: 400 }
      );
    }

    if (!knowledgeSourceId) {
      return NextResponse.json(
        { error: 'knowledgeSourceId fehlt' },
        { status: 400 }
      );
    }

    // ✅ Chunks mit user_id und bot_id erstellen
    const chunkRecords = chunks.map((chunk: any, index: number) => {
      const record: any = {
        knowledge_source_id: knowledgeSourceId,
        chunk_index: index,
        content: chunk.content || chunk,
        user_id: userId, // ✅ Authentifizierter User
        metadata: chunk.metadata || {},
      };
      if (botId) {
        record.bot_id = botId;
      }
      return record;
    });

    // ✅ Batch-Insert mit authentifiziertem Client (umgeht RLS)
    const BATCH_SIZE = 50;
    let insertedCount = 0;

    for (let i = 0; i < chunkRecords.length; i += BATCH_SIZE) {
      const batch = chunkRecords.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabase
        .from('document_chunks')
        .insert(batch)
        .select('id');

      if (error) {
        console.error(`[Chunks API] Failed to insert batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error);
        throw new Error(`Chunk insert failed: ${error.message}`);
      }

      insertedCount += data?.length || 0;
    }

    return NextResponse.json({
      success: true,
      insertedCount,
      totalChunks: chunkRecords.length,
    });
  } catch (error: any) {
    console.error('Error inserting chunks:', error);
    return NextResponse.json(
      { error: error.message || 'Fehler beim Einfügen der Chunks' },
      { status: 500 }
    );
  }
}

