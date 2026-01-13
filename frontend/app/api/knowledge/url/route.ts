import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient, createBackgroundAnonClient } from '@/lib/supabase';
import * as cheerio from 'cheerio';
import { normalizeURL } from '@/lib/utils/urlNormalizer';

const MAX_CONTENT_SIZE = 100 * 1024; // 100KB

export async function POST(request: NextRequest) {
  try {
    const { url, sessionId, botId } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL ist erforderlich' },
        { status: 400 }
      );
    }

    // ✅ Normalisiere URL (akzeptiert verschiedene Formate: http://, https://, www, ohne Protokoll)
    let normalizedUrl: string;
    try {
      normalizedUrl = normalizeURL(url);
      console.log(`[URL Processing] Normalized URL: ${url} → ${normalizedUrl}`);
    } catch (error: any) {
      console.error(`[URL Processing] URL normalization failed:`, error);
      return NextResponse.json(
        { error: error.message || 'Ungültige URL. Erlaubte Formate: example.com, www.example.com, http://example.com, https://example.com' },
        { status: 400 }
      );
    }

    const supabase = await createRouteHandlerClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId && !sessionId) {
      return NextResponse.json(
        { error: 'Authentifizierung erforderlich' },
        { status: 401 }
      );
    }

    // ✅ Validierung mit normalisierter URL
    try {
      new URL(normalizedUrl);
    } catch {
      return NextResponse.json(
        { error: 'Ungültige URL nach Normalisierung' },
        { status: 400 }
      );
    }

    // Create knowledge source record (nutze normalisierte URL)
    const insertData: any = {
      name: normalizedUrl,
      type: 'url',
      source_url: normalizedUrl,
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
        if (botId && userId) {
          insertData.bot_id = botId;
        }

    const { data: knowledgeSource, error: sourceError } = await supabase
      .from('knowledge_sources')
      .insert(insertData)
      .select()
      .single();

    if (sourceError) throw sourceError;

    // ✅ NEUE LÖSUNG: URL-Verarbeitung über authentifizierte Route
    // Dies umgeht RLS-Probleme, da der authentifizierte User-Context verwendet wird
    if (userId) {
      // ✅ Verarbeite URL über authentifizierte Route (behält User-Context)
      console.log(`[URL Processing] ✅ Using processURLDirectly with userId: ${userId}`);
      (async () => {
        try {
          // ✅ Direkt verarbeiten mit authentifiziertem Client
          const processSupabase = await createRouteHandlerClient();
          console.log(`[URL Processing] ✅ Created authenticated client, calling processURLDirectly...`);
          await processURLDirectly(knowledgeSource.id, normalizedUrl, userId, botId || undefined, processSupabase);
          console.log(`[URL Processing] ✅ URL processing completed successfully`);
        } catch (error: any) {
          console.error('[URL Processing] ❌ URL processing failed:', error);
          const errorSupabase = await createRouteHandlerClient();
          await errorSupabase
            .from('knowledge_sources')
            .update({ 
              status: 'error', 
              metadata: { error: error.message || 'Unknown error' } 
            })
            .eq('id', knowledgeSource.id);
        }
      })();
    } else {
      // ✅ Fallback: Alte Methode für Demo-Sessions (ohne User)
      console.log(`[URL Processing] No userId, using background processing for demo session`);
      processURL(knowledgeSource.id, normalizedUrl).catch(async (error) => {
        console.error('[URL Processing] Background error:', error);
        // ✅ Background-Prozess: Verwende Anon-Client
        const errorSupabase = createBackgroundAnonClient();
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
          .eq('id', knowledgeSource.id);
      });
    }

    return NextResponse.json({
      id: knowledgeSource.id,
      name: knowledgeSource.name,
      status: 'processing',
    });
  } catch (error: any) {
    console.error('URL processing error:', error);
    return NextResponse.json(
      { error: error.message || 'URL-Verarbeitung fehlgeschlagen' },
      { status: 500 }
    );
  }
}

/**
 * Direkte URL-Verarbeitung mit authentifiziertem User-Context
 * Dies umgeht RLS-Probleme, da der authentifizierte User-Client verwendet wird
 */
async function processURLDirectly(
  sourceId: string,
  url: string,
  userId: string,
  botId: string | undefined,
  supabase: any
) {
  console.log(`[URL Processing] Starting direct processing for source: ${sourceId}, URL: ${url}, userId: ${userId}, botId: ${botId || 'none'}`);

  // ✅ Timeout für gesamten Prozess (60 Sekunden)
  const URL_PROCESSING_TIMEOUT = 60000;
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      console.error(`[URL Processing] TIMEOUT: Process exceeded ${URL_PROCESSING_TIMEOUT}ms`);
      reject(new Error('URL processing timeout after 60s'));
    }, URL_PROCESSING_TIMEOUT);
  });

  try {
    const result = await Promise.race([
      processURLInternal(sourceId, url, supabase, userId, botId),
      timeoutPromise,
    ]);
    return result;
  } catch (error: any) {
    console.error('[URL Processing] Error:', error);
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

async function processURL(sourceId: string, url: string) {
  console.log(`[URL Processing] Starting for source: ${sourceId}, URL: ${url}`);
  
  // ✅ WICHTIG: Background-Prozesse haben keine Request-Cookies!
  // Verwende Anon-Client für Demo-Sessions (session_id) - funktioniert auch ohne Auth
  const supabase = createBackgroundAnonClient();

  // ✅ Timeout für gesamten Prozess (60 Sekunden)
  const URL_PROCESSING_TIMEOUT = 60000;
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      console.error(`[URL Processing] TIMEOUT: Process exceeded ${URL_PROCESSING_TIMEOUT}ms`);
      reject(new Error('URL processing timeout after 60s'));
    }, URL_PROCESSING_TIMEOUT);
  });

  try {
    const result = await Promise.race([
      processURLInternal(sourceId, url, supabase),
      timeoutPromise,
    ]);
    return result;
  } catch (error: any) {
    console.error('[URL Processing] Error:', error);
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

async function processURLInternal(sourceId: string, url: string, supabase: any, userId?: string, botId?: string) {
  console.log(`[URL Processing] Step 1/5: Fetching URL...`);
  
  // Fetch URL
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; WhatsAppBotBuilder/1.0)',
    },
    signal: AbortSignal.timeout(10000), // 10 second timeout
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();
  console.log(`[URL Processing] Fetched ${html.length} bytes`);

  if (html.length > MAX_CONTENT_SIZE) {
    throw new Error('Seite zu groß (max. 100KB)');
  }

  console.log(`[URL Processing] Step 2/5: Parsing HTML...`);
  
  // Parse HTML with cheerio
  const $ = cheerio.load(html);

  // Remove scripts, styles, and other non-content elements
  $('script, style, nav, footer, header, aside, .ad, .ads, .advertisement').remove();

  // Extract text content
  const title = $('title').text().trim() || $('h1').first().text().trim();
  const description = $('meta[name="description"]').attr('content') || '';
  const bodyText = $('body').text()
    .replace(/\s+/g, ' ')
    .trim();

  console.log(`[URL Processing] Extracted text: ${bodyText.length} chars, title: ${title}`);

  if (!bodyText || bodyText.length < 100) {
    throw new Error('Seite enthält zu wenig Text');
  }

  // ✅ Update status - parsing complete
  console.log(`[URL Processing] Step 3/5: Updating status - parsing complete`);
  await supabase
    .from('knowledge_sources')
    .update({
      metadata: {
        stage: 'chunking',
        title,
        description,
        textLength: bodyText.length,
      },
    })
    .eq('id', sourceId);

  // ✅ Chunk text
  console.log(`[URL Processing] Step 4/5: Creating chunks...`);
  console.log(`[URL Processing] Text length before chunking: ${bodyText.length}`);
  
  let chunks: string[] = [];
  try {
    console.log(`[URL Processing] Calling chunkText()...`);
    chunks = chunkText(bodyText, 800, 100);
    console.log(`[URL Processing] chunkText() completed, result: ${chunks.length} chunks`);
  } catch (chunkError: any) {
    console.error(`[URL Processing] chunkText() error:`, chunkError);
    throw new Error(`Chunking failed: ${chunkError?.message || 'Unknown error'}`);
  }
  
  if (!chunks || chunks.length === 0) {
    console.error(`[URL Processing] chunkText() returned empty array!`);
    throw new Error('Chunking failed: No chunks created');
  }
  
  console.log(`[URL Processing] Created ${chunks.length} chunks`);

  // ✅ Store chunks in batches (verhindert DB-Hangs)
  console.log(`[URL Processing] Step 5/5: Inserting chunks in batches...`);
  const BATCH_SIZE = 50;
  const chunkRecords = chunks.map((chunk, index) => {
    const record: any = {
      knowledge_source_id: sourceId,
      chunk_index: index,
      content: chunk,
      metadata: {
        url,
        title,
      },
    };
    // ✅ FIX: Füge user_id und bot_id hinzu für RLS-konforme Inserts
    if (userId) record.user_id = userId;
    if (botId) record.bot_id = botId;
    return record;
  });

  console.log(`[URL Processing] Starting batch inserts, total records: ${chunkRecords.length}`);
  for (let i = 0; i < chunkRecords.length; i += BATCH_SIZE) {
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(chunkRecords.length / BATCH_SIZE);
    const batch = chunkRecords.slice(i, i + BATCH_SIZE);
    
    console.log(`[URL Processing] Inserting batch ${batchNum}/${totalBatches} (${batch.length} chunks)...`);
    
    try {
      const { data, error: batchError } = await supabase
        .from('document_chunks')
        .insert(batch)
        .select('id');

      if (batchError) {
        console.error(`[URL Processing] Failed to insert batch ${batchNum}:`, {
          error: batchError.message,
          code: batchError.code,
          details: batchError.details,
          hint: batchError.hint,
        });
        throw new Error(`Chunk insert failed at batch ${batchNum}: ${batchError.message}`);
      }
      
      console.log(`[URL Processing] Successfully inserted batch ${batchNum}/${totalBatches} (${data?.length || 0} records)`);
    } catch (batchErr: any) {
      console.error(`[URL Processing] Exception during batch ${batchNum} insert:`, batchErr);
      throw batchErr;
    }
  }
  console.log(`[URL Processing] All chunks inserted successfully`);

  // ✅ Update status to ready
  console.log(`[URL Processing] Updating status to ready...`);
  await supabase
    .from('knowledge_sources')
    .update({
      status: 'ready',
      metadata: {
        title,
        description,
        textLength: bodyText.length,
        chunkCount: chunks.length,
        processedAt: new Date().toISOString(),
      },
    })
    .eq('id', sourceId);
  
  console.log(`[URL Processing] Status updated to ready`);

  // ✅ Generate embeddings (async, nicht blockierend)
  console.log(`[URL Processing] Starting async embedding generation...`);
  generateEmbeddingsForSource(sourceId).catch((error) => {
    console.error(`[URL Processing] Embedding generation failed:`, error);
    // Embeddings sind optional - nicht kritisch für Status "ready"
  });

  console.log(`[URL Processing] Completed successfully`);
  return { success: true, chunkCount: chunks.length };
}

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

async function generateEmbeddingsForSource(sourceId: string) {
  // ✅ Background-Prozess: Verwende Anon-Client
  const supabase = createBackgroundAnonClient();

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

