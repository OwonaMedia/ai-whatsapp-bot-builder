import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient, createBackgroundAnonClient } from '@/lib/supabase';

/**
 * Erstellt einen Supabase-Client für anonyme Demo-Sessions oder Background-Prozesse
 */
function createAnonSupabaseClient() {
  return createBackgroundAnonClient();
}

/**
 * Regeneriere Embeddings für alle Chunks ohne Embeddings
 * POST /api/knowledge/regenerate-embeddings
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createAnonSupabaseClient();

    // Get all chunks without embeddings
    const { data: chunks, error: fetchError } = await supabase
      .from('document_chunks')
      .select('id, content, knowledge_source_id')
      .is('embedding', null)
      .limit(100); // Process max 100 at a time to avoid timeout

    if (fetchError) {
      console.error('[Regenerate Embeddings] Error fetching chunks:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch chunks', details: fetchError.message },
        { status: 500 }
      );
    }

    if (!chunks || chunks.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No chunks without embeddings found',
        processed: 0,
      });
    }

    console.log(`[Regenerate Embeddings] Found ${chunks.length} chunks without embeddings, processing...`);

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    // Process chunks in batches
    for (const chunk of chunks) {
      try {
        // Generate embedding
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/knowledge/embeddings`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: chunk.content }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          errors.push(`Chunk ${chunk.id}: API error (${response.status})`);
          failCount++;
          continue;
        }

        const result = await response.json();

        if (!result.embedding || !Array.isArray(result.embedding)) {
          errors.push(`Chunk ${chunk.id}: Invalid embedding response`);
          failCount++;
          continue;
        }

        // Validate dimensions
        if (result.embedding.length !== 384) {
          console.warn(`[Regenerate Embeddings] Warning: Chunk ${chunk.id} has ${result.embedding.length} dimensions, expected 384`);
        }

        // Update chunk with embedding
        const { error: updateError } = await supabase
          .from('document_chunks')
          .update({ embedding: result.embedding })
          .eq('id', chunk.id);

        if (updateError) {
          console.error(`[Regenerate Embeddings] Error updating chunk ${chunk.id}:`, updateError);
          errors.push(`Chunk ${chunk.id}: ${updateError.message}`);
          failCount++;
        } else {
          successCount++;
        }
      } catch (error: any) {
        console.error(`[Regenerate Embeddings] Exception for chunk ${chunk.id}:`, error);
        errors.push(`Chunk ${chunk.id}: ${error.message || 'Unknown error'}`);
        failCount++;
      }
    }

    console.log(`[Regenerate Embeddings] Completed: ${successCount} success, ${failCount} failed`);

    return NextResponse.json({
      success: true,
      processed: chunks.length,
      successCount,
      failCount,
      errors: errors.slice(0, 10), // Return first 10 errors
    });
  } catch (error: any) {
    console.error('[Regenerate Embeddings] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to regenerate embeddings' },
      { status: 500 }
    );
  }
}

