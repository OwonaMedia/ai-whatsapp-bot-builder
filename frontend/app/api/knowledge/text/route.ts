import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient, createBackgroundAnonClient } from '@/lib/supabase';

/**
 * Erstellt einen Supabase-Client für anonyme Demo-Sessions oder Background-Prozesse
 */
function createAnonSupabaseClient() {
  return createBackgroundAnonClient();
}

/**
 * Helper function to chunk text with safety checks
 */
function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const startTime = Date.now();
  console.log(`[chunkText] Starting: text.length=${text.length}, chunkSize=${chunkSize}, overlap=${overlap}`);
  
  // ✅ Safety check: overlap muss kleiner als chunkSize sein
  if (overlap >= chunkSize) {
    console.error(`[chunkText] ERROR: overlap (${overlap}) >= chunkSize (${chunkSize}), using overlap=0`);
    overlap = 0;
  }
  
  // ✅ Safety: Wenn Text zu groß ist, warnen
  if (text.length > 1000000) {
    console.warn(`[chunkText] WARNING: Very large text (${text.length} chars), this might take a while`);
  }
  
  const chunks: string[] = [];
  let start = 0;
  let iteration = 0;
  const MAX_ITERATIONS = 10000; // Safety limit
  const CHUNKING_TIMEOUT = 30000; // 30 Sekunden max für Chunking

  try {
    while (start < text.length && iteration < MAX_ITERATIONS) {
      iteration++;
      
      // ✅ Timeout-Check während Processing
      if (Date.now() - startTime > CHUNKING_TIMEOUT) {
        console.error(`[chunkText] TIMEOUT: Chunking exceeded ${CHUNKING_TIMEOUT}ms after ${iteration} iterations`);
        throw new Error(`Chunking timeout after ${CHUNKING_TIMEOUT}ms`);
      }
      
      // ✅ Log progress bei großen Texten
      if (text.length > 100000 && iteration % 100 === 0) {
        console.log(`[chunkText] Progress: iteration ${iteration}, start=${start}, chunks=${chunks.length}`);
      }
      
      const end = Math.min(start + chunkSize, text.length);
      
      // ✅ Safety: Wenn end <= start, stoppen
      if (end <= start) {
        console.error(`[chunkText] ERROR: end (${end}) <= start (${start}), stopping`);
        break;
      }
      
      const chunk = text.slice(start, end);
      
      // ✅ Safety: Leere Chunks überspringen (außer beim letzten)
      if (chunk.length === 0 && start < text.length - 1) {
        console.warn(`[chunkText] WARNING: Empty chunk at iteration ${iteration}, skipping`);
        break;
      }
      
      chunks.push(chunk);
      
      // ✅ Prevent infinite loop: ensure we always move forward
      const nextStart = end - overlap;
      if (nextStart <= start) {
        console.error(`[chunkText] ERROR: Infinite loop detected! start=${start}, end=${end}, overlap=${overlap}, nextStart=${nextStart}`);
        break;
      }
      
      start = nextStart;
    }
    
    if (iteration >= MAX_ITERATIONS) {
      console.error(`[chunkText] WARNING: Reached MAX_ITERATIONS (${MAX_ITERATIONS}), stopping`);
      console.error(`[chunkText] Final state: start=${start}, text.length=${text.length}, chunks=${chunks.length}`);
    }
    
    const duration = Date.now() - startTime;
    console.log(`[chunkText] Completed: ${chunks.length} chunks in ${iteration} iterations (${duration}ms)`);
    
    // ✅ Safety: Wenn keine Chunks erstellt wurden, aber Text vorhanden ist
    if (chunks.length === 0 && text.length > 0) {
      console.error(`[chunkText] ERROR: No chunks created but text has ${text.length} chars!`);
      // Fallback: Ein großer Chunk mit allem
      chunks.push(text);
    }
    
    return chunks;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[chunkText] EXCEPTION after ${duration}ms, iteration ${iteration}:`, error);
    
    // ✅ Fallback: Wenn Error, versuche wenigstens einen großen Chunk zu erstellen
    if (chunks.length === 0 && text.length > 0) {
      console.warn(`[chunkText] FALLBACK: Creating single large chunk as fallback`);
      return [text.substring(0, Math.min(text.length, chunkSize * 10))];
    }
    
    return chunks; // Return was wir haben
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title, content, botId, sessionId } = await request.json();

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required.' }, { status: 400 });
    }

    const supabase = await createRouteHandlerClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id || null;

    if (!userId && !sessionId) {
      return NextResponse.json({ error: 'Authentifizierung erforderlich' }, { status: 401 });
    }

    // Create knowledge source entry
    const insertData: any = {
      name: title,
      type: 'text',
      content: content,
      status: 'processing',
    };

    // ✅ WICHTIG: session_id IMMER setzen wenn vorhanden (auch bei eingeloggten Usern!)
    // Dies ermöglicht Demo-Sessions auch für eingeloggte User
    if (sessionId) {
      insertData.session_id = sessionId;
    }
    
    if (userId) {
      insertData.user_id = userId;
    }
    
    if (botId) {
      insertData.bot_id = botId;
    }

    const { data: sourceData, error: sourceError } = await supabase
      .from('knowledge_sources')
      .insert(insertData)
      .select()
      .single();

    if (sourceError) {
      console.error('Error inserting knowledge source:', sourceError);
      return NextResponse.json({ error: 'Failed to create knowledge source.' }, { status: 500 });
    }

    // ✅ NEUE LÖSUNG: Text-Verarbeitung über authentifizierte Route
    // Dies umgeht RLS-Probleme, da der authentifizierte User-Context verwendet wird
    if (userId) {
      // ✅ Verarbeite Text über authentifizierte Route (behält User-Context)
      console.log(`[Text Processing] ✅ Using processTextDirectly with userId: ${userId}`);
      (async () => {
        try {
          // ✅ Direkt verarbeiten mit authentifiziertem Client
          const processSupabase = await createRouteHandlerClient();
          console.log(`[Text Processing] ✅ Created authenticated client, calling processTextDirectly...`);
          await processTextDirectly(content, sourceData.id, userId, botId || undefined, processSupabase);
          console.log(`[Text Processing] ✅ Text processing completed successfully`);
        } catch (error: any) {
          console.error('[Text Processing] ❌ Text processing failed:', error);
          const errorSupabase = await createRouteHandlerClient();
          await errorSupabase
            .from('knowledge_sources')
            .update({ 
              status: 'error', 
              metadata: { error: error.message || 'Unknown error' } 
            })
            .eq('id', sourceData.id);
        }
      })();
    } else {
      // ✅ Fallback: Alte Methode für Demo-Sessions (ohne User)
      console.log(`[Text Processing] No userId, using background processing for demo session`);
      processText(content, sourceData.id, botId, userId, sessionId).catch(async (error) => {
        console.error('[Text Processing] Background error:', error);
        // ✅ Background-Prozess: Verwende Anon-Client
        const errorSupabase = createAnonSupabaseClient();
        errorSupabase
          .from('knowledge_sources')
          .update({
            status: 'error',
            metadata: {
              error: error?.message || 'Unbekannter Fehler',
              errorType: error?.name || 'UnknownError',
              timestamp: new Date().toISOString(),
            },
          })
          .eq('id', sourceData.id);
      });
    }

    return NextResponse.json(
      { message: 'Text added and processing started.', id: sourceData.id, name: sourceData.name, status: 'processing' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error adding text:', error);
    return NextResponse.json({ error: 'Failed to add text.' }, { status: 500 });
  }
}

/**
 * Direkte Text-Verarbeitung mit authentifiziertem User-Context
 * Dies umgeht RLS-Probleme, da der authentifizierte User-Client verwendet wird
 */
async function processTextDirectly(
  text: string,
  sourceId: string,
  userId: string,
  botId: string | undefined,
  supabase: any
) {
  console.log(`[Text Processing] Starting direct processing for source: ${sourceId}, userId: ${userId}, botId: ${botId || 'none'}`);

  try {
    // ✅ Chunk text
    console.log(`[Text Processing] Step 1/3: Creating chunks...`);
    const chunks = chunkText(text, 800, 100);
    console.log(`[Text Processing] Created ${chunks.length} chunks`);

    if (!chunks || chunks.length === 0) {
      throw new Error('Chunking failed: No chunks created');
    }

    // ✅ Create chunk records with user_id and bot_id
    console.log(`[Text Processing] Step 2/3: Preparing chunk records...`);
    const chunkRecords = chunks.map((chunk, index) => {
      const record: any = {
        knowledge_source_id: sourceId,
        chunk_index: index,
        content: chunk,
        user_id: userId, // ✅ Authentifizierter User
        metadata: { type: 'text', index: index },
      };
      if (botId) {
        record.bot_id = botId;
      }
      return record;
    });

    // ✅ Insert chunks with authenticated client (bypasses RLS)
    console.log(`[Text Processing] Step 3/3: Inserting chunks in batches...`);
    const BATCH_SIZE = 50;
    for (let i = 0; i < chunkRecords.length; i += BATCH_SIZE) {
      const batch = chunkRecords.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      console.log(`[Text Processing] Inserting batch ${batchNum}/${Math.ceil(chunkRecords.length / BATCH_SIZE)}...`);
      
      const { error } = await supabase
        .from('document_chunks')
        .insert(batch);

      if (error) {
        console.error(`[Text Processing] Failed to insert batch ${batchNum}:`, error);
        throw new Error(`Chunk insert failed: ${error.message}`);
      }
      
      console.log(`[Text Processing] Successfully inserted batch ${batchNum}`);
    }

    // ✅ Update status to ready
    await supabase
      .from('knowledge_sources')
      .update({
        status: 'ready',
        metadata: {
          textLength: text.length,
          chunkCount: chunks.length,
          processedAt: new Date().toISOString(),
        },
      })
      .eq('id', sourceId);

    console.log(`[Text Processing] Successfully processed ${chunks.length} chunks`);

    // ✅ Generate embeddings (async, nicht blockierend)
    console.log(`[Text Processing] Starting async embedding generation...`);
    generateEmbeddingsForSource(sourceId).catch((error) => {
      console.error(`[Text Processing] Embedding generation failed:`, error);
      // Embeddings sind optional - nicht kritisch für Status "ready"
    });
  } catch (error: any) {
    console.error('[Text Processing] Error:', error);
    const errorMessage = error?.message || String(error) || 'Unbekannter Fehler';
    await supabase
      .from('knowledge_sources')
      .update({
        status: 'error',
        metadata: {
          error: errorMessage,
          errorType: error?.name || 'UnknownError',
          timestamp: new Date().toISOString(),
        },
      })
      .eq('id', sourceId);
    throw error;
  }
}

async function processText(
  text: string,
  sourceId: string,
  botId: string | null,
  userId: string | null,
  sessionId: string | null
) {
  // ✅ WICHTIG: Background-Prozesse haben keine Request-Cookies!
  // Verwende Anon-Client für Demo-Sessions (session_id) - funktioniert auch ohne Auth
  const supabase = createAnonSupabaseClient();
  
  try {
    console.log(`[Text Processing] Starting for source: ${sourceId}, userId: ${userId || 'none'}, botId: ${botId || 'none'}`);
    const chunks = chunkText(text, 800, 100);

    // ✅ Create chunk records with user_id and bot_id (für RLS-Compliance)
    const chunkRecords = chunks.map((chunk, index) => {
      const record: any = {
        knowledge_source_id: sourceId,
        chunk_index: index,
        content: chunk,
        metadata: { type: 'text', index: index },
      };
      // ✅ FIX: Füge user_id und bot_id hinzu für RLS-konforme Inserts
      if (userId) record.user_id = userId;
      if (botId) record.bot_id = botId;
      return record;
    });

    // ✅ Insert chunks in batches
    const BATCH_SIZE = 50;
    for (let i = 0; i < chunkRecords.length; i += BATCH_SIZE) {
      const batch = chunkRecords.slice(i, i + BATCH_SIZE);
      const { error: insertError } = await supabase.from('document_chunks').insert(batch);

      if (insertError) {
        console.error('Error inserting document chunks:', insertError);
        await supabase.from('knowledge_sources').update({ status: 'error', metadata: { error: insertError.message } }).eq('id', sourceId);
        return;
      }
    }

    await supabase.from('knowledge_sources').update({ 
      status: 'ready',
      metadata: {
        textLength: text.length,
        chunkCount: chunks.length,
        processedAt: new Date().toISOString(),
      },
    }).eq('id', sourceId);

    // ✅ Generate embeddings (async, nicht blockierend)
    generateEmbeddingsForSource(sourceId).catch((error) => {
      console.error(`[Text Processing] Embedding generation failed:`, error);
    });
  } catch (error) {
    console.error('Error processing text:', error);
    await supabase.from('knowledge_sources').update({ 
      status: 'error',
      metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
    }).eq('id', sourceId);
  }
}

async function generateEmbeddingsForSource(sourceId: string) {
  // ✅ Background-Prozess: Verwende Anon-Client
  const supabase = createAnonSupabaseClient();

  const { data: chunks, error } = await supabase
    .from('document_chunks')
    .select('id, content')
    .eq('knowledge_source_id', sourceId)
    .is('embedding', null);

  if (error || !chunks || chunks.length === 0) return;

  for (const chunk of chunks) {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/knowledge/embeddings`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: chunk.content }),
        }
      );

      if (!response.ok) continue;

      const { embedding } = await response.json();

      await supabase
        .from('document_chunks')
        .update({ embedding })
        .eq('id', chunk.id);
    } catch (error) {
      console.error('Embedding generation error:', error);
    }
  }
}

