import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient, createBackgroundAnonClient, createServiceRoleClient } from '@/lib/supabase';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { cookies } from 'next/headers';
import { parsePdfBuffer } from '@/lib/pdf/parsePdf';

export const dynamic = 'force-dynamic';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'knowledge');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function getBackgroundSupabaseClient() {
  try {
    return createServiceRoleClient();
  } catch (error) {
    console.warn('[Knowledge Upload] Service-Role Client nicht verfügbar, fallback auf Anon Client.', error);
    return createBackgroundAnonClient();
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sessionId = formData.get('sessionId') as string | null;
    const botId = formData.get('botId') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Keine Datei hochgeladen' },
        { status: 400 }
      );
    }

    const supabase = await createRouteHandlerClient();

    // Get user ID (required for bot-specific sources)
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId && !sessionId) {
      return NextResponse.json(
        { error: 'Authentifizierung erforderlich' },
        { status: 401 }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Nur PDF-Dateien sind erlaubt' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Datei zu groß (max. 10MB)' },
        { status: 400 }
      );
    }

    // Create knowledge source record
    const insertData: any = {
      name: file.name,
      type: 'pdf',
      file_size: file.size,
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

    // Save file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    await mkdir(UPLOAD_DIR, { recursive: true });
    const filePath = join(UPLOAD_DIR, `${knowledgeSource.id}.pdf`);
    await writeFile(filePath, buffer);

    // Update file path
    await supabase
      .from('knowledge_sources')
      .update({ file_path: filePath })
      .eq('id', knowledgeSource.id);

    // ✅ NEUE LÖSUNG: PDF-Verarbeitung über authentifizierte API-Route
    // Dies umgeht RLS-Probleme, da der authentifizierte User-Context verwendet wird
    if (userId) {
      // ✅ Verarbeite PDF über authentifizierte Route (behält User-Context)
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'https://whatsapp.owona.de';
      const processUrl = `${baseUrl}/api/knowledge/process`;

      console.log(`[Upload] Starting PDF processing via authenticated route: ${processUrl}`);

      // ✅ Starte Verarbeitung im Hintergrund (nicht await)
      // ✅ WICHTIG: Im Server-Context können wir fetch() nicht mit Cookies verwenden
      // Stattdessen: Rufe die Verarbeitungsfunktion direkt auf (mit User-Context)
      console.log(`[Upload] ✅ Using processPDFDirectly with userId: ${userId}`);
      (async () => {
        try {
          // ✅ Direkt verarbeiten mit authentifiziertem Client
          const processSupabase = await createRouteHandlerClient();
          console.log(`[Upload] ✅ Created authenticated client, calling processPDFDirectly...`);
          await processPDFDirectly(knowledgeSource.id, buffer, userId, botId || undefined, processSupabase);
          console.log(`[Upload] ✅ PDF processing completed successfully`);
        } catch (error: any) {
          console.error('[Upload] ❌ PDF processing failed:', error);
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
      console.log(`[Upload] No userId, using background processing for demo session`);
      processPDF(knowledgeSource.id, buffer, undefined, botId || undefined).catch(async (error) => {
        console.error('PDF processing error:', error);
        const errorMessage = error?.message || String(error) || 'Unbekannter Fehler';
        console.error('PDF processing failed for:', knowledgeSource.id, errorMessage);

        const errorSupabase = getBackgroundSupabaseClient();
        errorSupabase
          .from('knowledge_sources')
          .update({
            status: 'error',
            metadata: { error: errorMessage, stack: error?.stack }
          })
          .eq('id', knowledgeSource.id)
          .then((result) => {
            if (result.error) {
              console.error('Failed to update error status:', result.error);
            } else {
              console.error('Error status updated for source:', knowledgeSource.id);
            }
          });
      });
    }

    return NextResponse.json({
      id: knowledgeSource.id,
      name: knowledgeSource.name,
      status: 'processing',
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Upload fehlgeschlagen' },
      { status: 500 }
    );
  }
}

/**
 * Direkte PDF-Verarbeitung mit authentifiziertem User-Context
 * Dies umgeht RLS-Probleme, da der authentifizierte User-Client verwendet wird
 */
async function processPDFDirectly(
  sourceId: string,
  buffer: Buffer,
  userId: string,
  botId: string | undefined,
  supabase: any
) {
  console.log(`[PDF Processing] Starting direct processing for source: ${sourceId}, userId: ${userId}, botId: ${botId || 'none'}`);

  // Parse PDF
  const { text, pageCount } = await parsePdfBuffer(buffer);

  if (!text || text.trim().length === 0) {
    throw new Error('PDF enthält keinen Text oder kann nicht gelesen werden');
  }

  // Chunk text
  const chunks = chunkText(text, 800, 100);

  // Create chunk records with user_id and bot_id
  const chunkRecords = chunks.map((chunk, index) => {
    const record: any = {
      knowledge_source_id: sourceId,
      chunk_index: index,
      content: chunk,
      user_id: userId, // ✅ Authentifizierter User
      metadata: {
        page: pageCount > 0 ? Math.floor((index * 800) / (text.length / pageCount)) : 0,
      },
    };
    if (botId) {
      record.bot_id = botId;
    }
    return record;
  });

  // Insert chunks with authenticated client (bypasses RLS)
  const BATCH_SIZE = 50;
  for (let i = 0; i < chunkRecords.length; i += BATCH_SIZE) {
    const batch = chunkRecords.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    console.log(`[PDF Processing] Inserting batch ${batchNum}/${Math.ceil(chunkRecords.length / BATCH_SIZE)}...`);

    const { error } = await supabase
      .from('document_chunks')
      .insert(batch);

    if (error) {
      console.error(`[PDF Processing] Failed to insert batch ${batchNum}:`, error);
      throw new Error(`Chunk insert failed: ${error.message}`);
    }

    console.log(`[PDF Processing] Successfully inserted batch ${batchNum}`);
  }

  // Update status to ready
  await supabase
    .from('knowledge_sources')
    .update({
      status: 'ready',
      metadata: {
        pageCount,
        textLength: text.length,
        chunkCount: chunks.length,
        processedAt: new Date().toISOString(),
      },
    })
    .eq('id', sourceId);

  console.log(`[PDF Processing] Successfully processed ${chunks.length} chunks`);
}

async function processPDF(sourceId: string, buffer: Buffer, userId?: string, botId?: string) {
  console.log(`[PDF Processing] Starting for source: ${sourceId}, buffer size: ${buffer.length}, userId: ${userId || 'none'}, botId: ${botId || 'none'}`);

  // ✅ WICHTIG: Background-Prozesse haben keine Request-Cookies!
  // Verwende Service-Role-Client für Background-Prozesse (umgeht RLS für Chunk-Inserts)
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseServiceRoleKey) {
    console.error('[PDF Processing] ⚠️ WARNING: SUPABASE_SERVICE_ROLE_KEY nicht gesetzt! PDF-Verarbeitung wird wahrscheinlich mit RLS-Fehler fehlschlagen.');
    console.error('[PDF Processing] Lösung: Service-Role-Key in frontend/.env.local hinzufügen: SUPABASE_SERVICE_ROLE_KEY=your-key');
  }

  const supabase = getBackgroundSupabaseClient();

  // ✅ Timeout für gesamten Prozess (60 Sekunden)
  const PDF_PROCESSING_TIMEOUT = 60000;
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('PDF processing timeout after 60s')), PDF_PROCESSING_TIMEOUT);
  });

  try {
    // ✅ Race zwischen Processing und Timeout
    const result = await Promise.race([
      processPDFInternal(sourceId, buffer, supabase, userId, botId),
      timeoutPromise,
    ]);

    return result;
  } catch (error: any) {
    console.error('PDF processing error:', error);
    const errorMessage = error?.message || String(error) || 'Unbekannter Fehler beim Verarbeiten des PDFs';
    console.error('Error details:', {
      sourceId,
      errorMessage,
      stack: error?.stack,
      name: error?.name,
    });

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

async function processPDFInternal(sourceId: string, buffer: Buffer, supabase: any, userId?: string, botId?: string) {
  console.log(`[PDF Processing] Starting processPDFInternal for source: ${sourceId}, userId: ${userId || 'none'}, botId: ${botId || 'none'}`);
  console.log(`[PDF Processing] Buffer size: ${buffer.length} bytes`);

  console.log(`[PDF Processing] Parsing PDF...`);

  // ✅ Parse mit explizitem Timeout
  const parsePromise = parsePdfBuffer(buffer);
  const timeoutId = setTimeout(() => {
    console.error(`[PDF Processing] Parse timeout after 30s - this should not happen`);
  }, 30000);

  let data;
  try {
    data = await parsePromise;
    clearTimeout(timeoutId);
    console.log(`[PDF Processing] PDF parse completed successfully`);
  } catch (parseError: any) {
    clearTimeout(timeoutId);
    console.error(`[PDF Processing] PDF parse error:`, parseError);
    throw new Error(`PDF parsing failed: ${parseError?.message || 'Unknown error'}`);
  }

  const { text, pageCount } = data;
  console.log(`[PDF Processing] PDF parsed: ${text.length} chars, ${pageCount} pages`);

  if (!text || text.trim().length === 0) {
    throw new Error('PDF enthält keinen Text oder kann nicht gelesen werden');
  }

  // ✅ Schritt 1: Update Status - Parsing Complete
  console.log(`[PDF Processing] Step 1/4: Update status - parsing complete`);
  await supabase
    .from('knowledge_sources')
    .update({
      metadata: {
        stage: 'chunking',
        pageCount,
        textLength: text.length,
      },
    })
    .eq('id', sourceId);

  // ✅ Schritt 2: Chunk text
  console.log(`[PDF Processing] Step 2/4: Creating chunks...`);
  console.log(`[PDF Processing] Text length before chunking: ${text.length}`);

  let chunks: string[] = [];
  try {
    chunks = chunkText(text, 800, 100);
    console.log(`[PDF Processing] Created ${chunks.length} chunks`);

    if (chunks.length === 0) {
      throw new Error('chunkText() returned empty array - cannot proceed');
    }

    console.log(`[PDF Processing] First chunk preview: ${chunks[0]?.substring(0, 100)}...`);
  } catch (chunkError: any) {
    console.error(`[PDF Processing] chunkText() error:`, chunkError);
    throw new Error(`Failed to chunk text: ${chunkError?.message || 'Unknown error'}`);
  }

  // ✅ Schritt 3: Store chunks (direkt mit Service-Role-Key oder über API-Route)
  console.log(`[PDF Processing] Step 3/4: Inserting chunks...`);

  const chunkRecords = chunks.map((chunk: string, index: number) => {
    const record: any = {
      knowledge_source_id: sourceId,
      chunk_index: index,
      content: chunk,
      metadata: {
        page: pageCount > 0 ? Math.floor((index * 800) / (text.length / pageCount)) : 0,
      },
    };
    // ✅ FIX: Füge user_id und bot_id hinzu für RLS-konforme Inserts
    if (userId) record.user_id = userId;
    if (botId) record.bot_id = botId;
    return record;
  });

  // ✅ Versuche direkt mit supabase Client einzufügen (nutzt Service-Role-Key wenn verfügbar)
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseServiceRoleKey) {
    // ✅ Direkt mit Service-Role-Key einfügen (umgeht RLS)
    console.log(`[PDF Processing] Using Service-Role-Key for direct inserts`);
    const BATCH_SIZE = 50;
    for (let i = 0; i < chunkRecords.length; i += BATCH_SIZE) {
      const batch = chunkRecords.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      console.log(`[PDF Processing] Inserting batch ${batchNum}/${Math.ceil(chunkRecords.length / BATCH_SIZE)}...`);

      const { data, error } = await supabase
        .from('document_chunks')
        .insert(batch)
        .select('id');

      if (error) {
        console.error(`[PDF Processing] Failed to insert batch ${batchNum}:`, error);
        throw new Error(`Chunk insert failed: ${error.message}`);
      }

      console.log(`[PDF Processing] Successfully inserted batch ${batchNum} (${data?.length || 0} chunks)`);
    }
    console.log(`[PDF Processing] Successfully inserted ${chunkRecords.length} chunks directly`);
  } else {
    // ✅ Fallback: Nutze API-Route (nutzt authentifizierten User-Context)
    console.log(`[PDF Processing] Service-Role-Key nicht verfügbar, verwende API-Route`);
    const chunkData = chunkRecords.map((record: any) => ({
      content: record.content,
      metadata: record.metadata,
    }));

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000';
    const chunksUrl = `${baseUrl}/api/knowledge/chunks`;

    console.log(`[PDF Processing] Calling chunks API: ${chunksUrl} (userId: ${userId || 'none'})`);

    const chunksResponse = await fetch(chunksUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chunks: chunkData,
        knowledgeSourceId: sourceId,
        botId: botId || undefined,
        userId: userId || undefined,
      }),
    });

    if (!chunksResponse.ok) {
      const errorData = await chunksResponse.json().catch(() => ({ error: 'Unknown error' }));
      console.error(`[PDF Processing] Failed to insert chunks via API:`, errorData);
      throw new Error(`Chunk insert failed: ${errorData.error || 'Unknown error'}`);
    }

    const chunksResult = await chunksResponse.json();
    console.log(`[PDF Processing] Successfully inserted ${chunksResult.insertedCount || chunks.length} chunks via API`);
  }

  // ✅ Schritt 4: Update status to ready
  console.log(`[PDF Processing] Step 4/4: Updating status to ready...`);
  const { error: updateError } = await supabase
    .from('knowledge_sources')
    .update({
      status: 'ready',
      metadata: {
        pageCount,
        textLength: text.length,
        chunkCount: chunks.length,
        processedAt: new Date().toISOString(),
      },
    })
    .eq('id', sourceId);

  if (updateError) {
    console.error(`[PDF Processing] Failed to update status:`, updateError);
    throw updateError;
  }
  console.log(`[PDF Processing] Status updated to ready`);

  // ✅ Schritt 5: Generate embeddings (SYNCHRON, wichtig für RAG)
  console.log(`[PDF Processing] Starting embedding generation (synchronous)...`);
  try {
    await generateEmbeddingsForSource(sourceId);
    console.log(`[PDF Processing] Embedding generation completed`);
  } catch (error) {
    console.error(`[PDF Processing] Embedding generation failed:`, error);
    // Embeddings sind wichtig, aber nicht kritisch für Status "ready"
    // Der Chat hat einen Fallback-Mechanismus
  }

  console.log(`[PDF Processing] Completed successfully`);
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
        // ✅ Fix: Move forward by at least 1 character to prevent infinite loop
        start = end;
        if (start >= text.length) break;
      } else {
        start = nextStart;
      }
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
  console.log(`[Embeddings] Starting generation for source: ${sourceId}`);

  // ✅ Background-Prozess: Verwende Service-Role-Client für RLS-Bypass
  const supabase = getBackgroundSupabaseClient();

  // Get chunks without embeddings (limit to first 50 for performance)
  const { data: chunks, error } = await supabase
    .from('document_chunks')
    .select('id, content')
    .eq('knowledge_source_id', sourceId)
    .is('embedding', null)
    .limit(50); // ✅ Limit für Performance

  if (error) {
    console.error(`[Embeddings] Error fetching chunks:`, error);
    return;
  }

  if (!chunks || chunks.length === 0) {
    console.log(`[Embeddings] No chunks without embeddings for source: ${sourceId}`);
    return;
  }

  console.log(`[Embeddings] Found ${chunks.length} chunks without embeddings, generating...`);

  // Generate embeddings via API route (batch processing)
  let successCount = 0;
  let failCount = 0;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000';

  for (const chunk of chunks) {
    try {
      // ✅ Truncate content if too long (max 10000 chars for embeddings)
      const content = chunk.content.length > 10000
        ? chunk.content.substring(0, 10000)
        : chunk.content;

      const response = await fetch(
        `${baseUrl}/api/knowledge/embeddings`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: content }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error(`[Embeddings] API error for chunk ${chunk.id}:`, response.status, errorText.substring(0, 200));
        failCount++;
        continue;
      }

      const result = await response.json();

      if (!result.embedding || !Array.isArray(result.embedding)) {
        console.error(`[Embeddings] Invalid embedding response for chunk ${chunk.id}:`, result);
        failCount++;
        continue;
      }

      // ✅ Validate embedding dimensions (should be 384)
      if (result.embedding.length !== 384) {
        console.warn(`[Embeddings] Warning: Embedding has ${result.embedding.length} dimensions, expected 384`);
      }

      // Update chunk with embedding
      const { error: updateError } = await supabase
        .from('document_chunks')
        .update({ embedding: result.embedding })
        .eq('id', chunk.id);

      if (updateError) {
        console.error(`[Embeddings] Error updating chunk ${chunk.id}:`, updateError);
        failCount++;
      } else {
        successCount++;
        // ✅ Log progress every 10 chunks
        if (successCount % 10 === 0) {
          console.log(`[Embeddings] Progress: ${successCount}/${chunks.length} chunks processed`);
        }
      }
    } catch (error: any) {
      console.error(`[Embeddings] Exception generating embedding for chunk ${chunk.id}:`, error);
      failCount++;
    }
  }

  console.log(`[Embeddings] Completed for source ${sourceId}: ${successCount} success, ${failCount} failed`);

  // ✅ Wenn noch Chunks ohne Embeddings vorhanden sind, logge Warnung
  if (failCount > 0 || chunks.length >= 50) {
    const { data: remainingChunks } = await supabase
      .from('document_chunks')
      .select('id')
      .eq('knowledge_source_id', sourceId)
      .is('embedding', null)
      .limit(1);

    if (remainingChunks && remainingChunks.length > 0) {
      console.warn(`[Embeddings] Warning: ${remainingChunks.length}+ chunks still without embeddings. Consider running embedding generation again.`);
    }
  }
}
