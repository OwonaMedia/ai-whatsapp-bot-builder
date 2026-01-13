import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { parsePdfBuffer } from '@/lib/pdf/parsePdf';

export const dynamic = 'force-dynamic';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'knowledge');

/**
 * API Route zum Verarbeiten von PDFs mit authentifiziertem User-Context
 * Dies umgeht RLS-Probleme, da der authentifizierte User-Client verwendet wird
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient();

    // Get authenticated user
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentifizierung erforderlich' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { sourceId, botId } = body;

    if (!sourceId) {
      return NextResponse.json(
        { error: 'sourceId fehlt' },
        { status: 400 }
      );
    }

    // Get knowledge source
    const { data: source, error: sourceError } = await supabase
      .from('knowledge_sources')
      .select('*')
      .eq('id', sourceId)
      .single();

    if (sourceError || !source) {
      return NextResponse.json(
        { error: 'Wissensquelle nicht gefunden' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (source.user_id !== userId) {
      return NextResponse.json(
        { error: 'Nicht autorisiert' },
        { status: 403 }
      );
    }

    // Read PDF file
    const filePath = join(UPLOAD_DIR, `${sourceId}.pdf`);
    let buffer: Buffer;
    try {
      buffer = await readFile(filePath);
    } catch (error) {
      return NextResponse.json(
        { error: 'PDF-Datei nicht gefunden' },
        { status: 404 }
      );
    }

    // Process PDF synchronously with authenticated user context
    await processPDFWithAuth(sourceId, buffer, userId, botId, supabase);

    return NextResponse.json({
      success: true,
      message: 'PDF erfolgreich verarbeitet',
    });
  } catch (error: any) {
    console.error('Error processing PDF:', error);
    return NextResponse.json(
      { error: error.message || 'Fehler beim Verarbeiten des PDFs' },
      { status: 500 }
    );
  }
}

async function processPDFWithAuth(
  sourceId: string,
  buffer: Buffer,
  userId: string,
  botId: string | undefined,
  supabase: any
) {
  console.log(`[PDF Processing] Starting for source: ${sourceId}, userId: ${userId}, botId: ${botId || 'none'}`);

  // Parse PDF
  const { text, pageCount } = await parsePdfBuffer(buffer);

  if (!text || text.trim().length === 0) {
    throw new Error('PDF enthält keinen Text oder kann nicht gelesen werden');
  }

  // Chunk text
  const chunks = chunkText(text, 800, 100);

  // Create chunk records
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
    const { error } = await supabase
      .from('document_chunks')
      .insert(batch);

    if (error) {
      console.error(`[PDF Processing] Failed to insert batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error);
      throw new Error(`Chunk insert failed: ${error.message}`);
    }
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

function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end);
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    start = end - overlap;
    if (start <= 0) break;
  }

  return chunks.length > 0 ? chunks : [text];
}





