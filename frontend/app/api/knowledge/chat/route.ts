import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase';
import { config } from '@/lib/config';

// Helper function to generate embeddings for chunks
async function generateEmbeddingsForChunks(chunks: Array<{ id: string; content: string }>) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  for (const chunk of chunks) {
    try {
      const response = await fetch(`${baseUrl}/api/knowledge/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: chunk.content }),
      });

      if (response.ok) {
        const { embedding } = await response.json();
        if (embedding && Array.isArray(embedding)) {
          // Update chunk with embedding (async, nicht blockierend)
          const supabase = await createRouteHandlerClient();
          await supabase
            .from('document_chunks')
            .update({ embedding })
            .eq('id', chunk.id);
        }
      }
    } catch (error) {
      console.error(`[Chat] Error generating embedding for chunk ${chunk.id}:`, error);
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId, sourceIds } = await request.json();

    if (!message || !sessionId) {
      return NextResponse.json(
        { error: 'Nachricht und Session ID sind erforderlich' },
        { status: 400 }
      );
    }

    const supabase = await createRouteHandlerClient();

    // Get or create chat session
    let { data: chatSession } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('session_id', sessionId)
      .single();

    if (!chatSession) {
      const { data: newSession, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({
          session_id: sessionId,
          knowledge_source_ids: sourceIds || [],
        })
        .select()
        .single();

      if (sessionError) throw sessionError;
      chatSession = newSession;
    }

    // Save user message
    if (chatSession) {
      await supabase.from('chat_messages').insert({
        chat_session_id: chatSession.id,
        role: 'user',
        content: message,
      });
    }

    // Generate query embedding
    const embeddingResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/knowledge/embeddings`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message }),
      }
    );

    if (!embeddingResponse.ok) {
      throw new Error('Embedding-Generierung fehlgeschlagen');
    }

    const { embedding: queryEmbedding } = await embeddingResponse.json();

    // Search for relevant chunks
    // Note: Supabase expects the embedding as an array
    console.log('[Chat] Searching chunks with:', {
      queryEmbeddingLength: queryEmbedding?.length,
      matchThreshold: 0.3, // Lowered from 0.7 for hash-based embeddings
      matchCount: 5,
      sourceIds: sourceIds || [],
      sessionId,
    });

    // ✅ Get source IDs for this session if not provided
    let searchSourceIds = sourceIds || [];
    if (searchSourceIds.length === 0 && sessionId) {
      const { data: sessionSources } = await supabase
        .from('knowledge_sources')
        .select('id')
        .eq('session_id', sessionId)
        .eq('status', 'ready');
      
      if (sessionSources && sessionSources.length > 0) {
        searchSourceIds = sessionSources.map((s: any) => s.id);
        console.log('[Chat] Found sources for session:', searchSourceIds.length, searchSourceIds);
      }
    }

    // ✅ VERY low threshold for hash-based embeddings (they have very low similarity scores)
    // Hash-based embeddings don't have semantic meaning, so similarity is calculated differently
    // We use a much lower threshold or even negative threshold to get any results
    const rpcParams: any = {
      query_embedding: queryEmbedding,
      match_threshold: -1.0, // Negative threshold = accept all results, sort by similarity
      match_count: 10, // Get top 10 results
    };

    // ✅ Only add source_ids if we have them, otherwise use null (search all sources)
    if (searchSourceIds.length > 0) {
      rpcParams.source_ids = searchSourceIds;
    } else {
      rpcParams.source_ids = null; // null = search all sources for this session
    }

    console.log('[Chat] RPC params:', {
      queryEmbeddingLength: queryEmbedding?.length,
      matchThreshold: rpcParams.match_threshold,
      matchCount: rpcParams.match_count,
      sourceIds: rpcParams.source_ids,
    });

    // ✅ Prüfe zuerst ob Chunks für diese Sources existieren
    const { data: existingChunks, error: chunksCheckError } = await supabase
      .from('document_chunks')
      .select('id, knowledge_source_id, content, embedding')
      .in('knowledge_source_id', searchSourceIds.length > 0 ? searchSourceIds : [])
      .limit(5);
    
    console.log('[Chat] Existing chunks check:', {
      chunksFound: existingChunks?.length || 0,
      hasEmbeddings: existingChunks?.filter((c: any) => c.embedding).length || 0,
      error: chunksCheckError,
    });

    // ✅ Wenn keine Chunks existieren, gib hilfreiche Fehlermeldung
    if (!existingChunks || existingChunks.length === 0) {
      console.error('[Chat] No chunks found for sources:', searchSourceIds);
      const response = 'Entschuldigung, die Wissensquelle wurde noch nicht vollständig verarbeitet. Bitte warten Sie, bis der Status "Fertig" angezeigt wird, und versuchen Sie es dann erneut.';
      
      if (chatSession) {
        await supabase.from('chat_messages').insert({
          chat_session_id: chatSession.id,
          role: 'assistant',
          content: response,
        });
      }
      
      return NextResponse.json({ response, sources: [] });
    }

    // ✅ Wenn keine Embeddings vorhanden sind, generiere sie jetzt
    const chunksWithoutEmbeddings = existingChunks.filter((c: any) => !c.embedding);
    if (chunksWithoutEmbeddings.length > 0) {
      console.log('[Chat] Found chunks without embeddings, generating...', chunksWithoutEmbeddings.length);
      // Generiere Embeddings für Chunks ohne Embeddings (async, nicht blockierend)
      generateEmbeddingsForChunks(chunksWithoutEmbeddings.slice(0, 10)).catch((error) => {
        console.error('[Chat] Error generating embeddings:', error);
      });
    }

    const { data: chunks, error: searchError } = await supabase.rpc(
      'match_document_chunks',
      rpcParams
    );

    if (searchError) {
      console.error('[Chat] Search error:', searchError);
      // ✅ Fallback: Suche ohne RPC (einfache Text-Suche)
      console.log('[Chat] Falling back to simple text search...');
      const { data: fallbackChunks } = await supabase
        .from('document_chunks')
        .select('id, content, knowledge_source_id')
        .in('knowledge_source_id', searchSourceIds)
        .limit(5);
      
      if (fallbackChunks && fallbackChunks.length > 0) {
        console.log('[Chat] Using fallback chunks:', fallbackChunks.length);
        const context = fallbackChunks.map((c: any) => c.content).join('\n\n');
        
        // Call GROQ API with context
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.ai.groqApiKey || process.env.GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: config.ai.groqModel || 'llama-3.3-70b-versatile',
            messages: [
              {
                role: 'system',
                content: `Du bist ein hilfreicher Assistent. Antworte AUSSCHLIESSLICH auf Basis des folgenden Kontexts aus der bereitgestellten Wissensquelle. Wenn die Antwort nicht im Kontext enthalten ist, sage: "Diese Information ist in der bereitgestellten Quelle nicht enthalten."

Kontext:
${context}`,
              },
              {
                role: 'user',
                content: message,
              },
            ],
            temperature: 0.7,
            max_tokens: 1000,
          }),
        });

        if (!groqResponse.ok) {
          const error = await groqResponse.json();
          throw new Error(error.error?.message || 'GROQ API Fehler');
        }

        const groqData = await groqResponse.json();
        const response = groqData.choices[0].message.content;

        if (chatSession) {
          await supabase.from('chat_messages').insert({
            chat_session_id: chatSession.id,
            role: 'assistant',
            content: response,
            sources: fallbackChunks.map((c: any) => c.id),
          });
        }

        return NextResponse.json({
          response,
          sources: fallbackChunks.map((c: any) => ({
            id: c.id,
            content: c.content.substring(0, 200) + '...',
            similarity: 0.5, // Dummy similarity für Fallback
          })),
        });
      }
    }

    console.log('[Chat] Search results:', {
      chunksFound: chunks?.length || 0,
      chunks: chunks?.map((c: any) => ({
        id: c.id,
        similarity: c.similarity,
        contentLength: c.content?.length || 0,
      })),
    });

    // Build context from chunks
    const context = chunks && chunks.length > 0
      ? chunks.map((chunk: any) => chunk.content).join('\n\n')
      : '';

    if (!context) {
      // ✅ More detailed error message
      const hasSources = searchSourceIds.length > 0;
      const response = hasSources
        ? 'Entschuldigung, ich konnte keine relevanten Informationen zu Ihrer Frage in den bereitgestellten Quellen finden. Bitte versuchen Sie eine andere Formulierung oder fügen Sie weitere Wissensquellen hinzu.'
        : 'Entschuldigung, ich konnte keine relevanten Informationen in den bereitgestellten Quellen finden. Bitte stellen Sie sicher, dass Sie eine Wissensquelle hinzugefügt haben und dass diese vollständig verarbeitet wurde (Status: Fertig).';

      console.log('[Chat] No context found:', {
        hasSources,
        sourceCount: searchSourceIds.length,
        sessionId,
        chunksFound: chunks?.length || 0,
      });

      if (chatSession) {
        await supabase.from('chat_messages').insert({
          chat_session_id: chatSession.id,
          role: 'assistant',
          content: response,
        });
      }

      return NextResponse.json({ response, sources: [] });
    }

    // Call GROQ API with context
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.ai.groqApiKey || process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: config.ai.groqModel || 'llama-3.3-70b-versatile', // Updated: llama-3.1-70b-versatile was decommissioned
        messages: [
          {
            role: 'system',
            content: `Du bist ein hilfreicher Assistent. Antworte AUSSCHLIESSLICH auf Basis des folgenden Kontexts aus der bereitgestellten Wissensquelle. Wenn die Antwort nicht im Kontext enthalten ist, sage: "Diese Information ist in der bereitgestellten Quelle nicht enthalten. Bitte stellen Sie sicher, dass die Wissensquelle die benötigten Informationen enthält."

Kontext:
${context}`,
          },
          {
            role: 'user',
            content: message,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!groqResponse.ok) {
      const error = await groqResponse.json();
      throw new Error(error.error?.message || 'GROQ API Fehler');
    }

    const groqData = await groqResponse.json();
    const response = groqData.choices[0].message.content;

    // Save assistant message
    if (chatSession) {
      await supabase.from('chat_messages').insert({
        chat_session_id: chatSession.id,
        role: 'assistant',
        content: response,
        sources: chunks?.map((chunk: any) => chunk.id) || [],
      });
    }

    return NextResponse.json({
      response,
      sources: chunks?.map((chunk: any) => ({
        id: chunk.id,
        content: chunk.content.substring(0, 200) + '...',
        similarity: chunk.similarity,
      })) || [],
    });
  } catch (error: any) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: error.message || 'Chat-Fehler' },
      { status: 500 }
    );
  }
}

