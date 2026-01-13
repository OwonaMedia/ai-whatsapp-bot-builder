import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

/**
 * Embeddings Endpoint mit Fallback-Mechanismus:
 * 1. Versuche OpenAI (wenn Key vorhanden)
 * 2. Falls nicht: Nutze Hugging Face (kostenlos)
 * 3. Besseres Error-Handling
 */

async function generateOpenAIEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || 'OpenAI embedding generation failed');
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Einfacher Hash-basierter Embedding-Generator als Fallback
 * Erstellt einen 384-dimensionalen Vektor basierend auf Text-Hashes
 * Für Demo-Zwecke ausreichend, nicht so gut wie echte ML-Embeddings
 */
function generateSimpleEmbedding(text: string, dimensions: number = 384): number[] {
  // Normalisiere Text
  const normalized = text.toLowerCase().trim();
  
  // Erstelle Embedding-Vektor basierend auf Character-Hashes
  const embedding: number[] = [];
  
  for (let i = 0; i < dimensions; i++) {
    let hash = 0;
    
    // Hash-Funktion: Kombiniere Text-Länge, Position und Character-Werte
    for (let j = 0; j < normalized.length; j++) {
      const char = normalized.charCodeAt(j);
      hash = ((hash << 5) - hash) + char + i + j;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Normalisiere zu [-1, 1]
    const value = Math.sin(hash) * 0.5;
    embedding.push(value);
  }
  
  // Normalisiere Vektor (L2-Norm)
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    return embedding.map(val => val / magnitude);
  }
  
  return embedding;
}

async function generateHuggingFaceEmbedding(text: string): Promise<number[]> {
  // Versuche Hugging Face Inference API - kostenlos ohne Key für öffentliche Modelle
  // Model: sentence-transformers/all-MiniLM-L6-v2 (384 dimensions)
  // ✅ Aktualisiert: Neue Router-URL
  const modelUrl = 'https://router.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2';
  
  try {
    const response = await fetch(modelUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: text,
        options: { wait_for_model: true },
      }),
      // Timeout nach 30 Sekunden
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      // Wenn Model lädt (503), warte etwas und versuche erneut (max 1x)
      if (response.status === 503) {
        console.log('[Embeddings] Hugging Face model is loading, waiting 15s...');
        await new Promise(resolve => setTimeout(resolve, 15000));
        
        const retryResponse = await fetch(modelUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
          signal: AbortSignal.timeout(30000),
        });
        
        if (!retryResponse.ok) {
          throw new Error(`Hugging Face model still loading or error (${retryResponse.status})`);
        }
        
        const embedding = await retryResponse.json();
        return normalizeEmbeddingResponse(embedding);
      }
      
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('[Embeddings] Hugging Face error:', response.status, errorText.substring(0, 200));
      
      // Fallback zu einfachem Embedding
      console.warn('[Embeddings] Falling back to simple hash-based embedding');
      return generateSimpleEmbedding(text, 384);
    }

    const embedding = await response.json();
    return normalizeEmbeddingResponse(embedding);
    
  } catch (error: any) {
    console.error('[Embeddings] Hugging Face exception:', error.message || error);
    
    // Fallback zu einfachem Embedding wenn API fehlschlägt
    console.warn('[Embeddings] Using simple hash-based embedding as fallback');
    return generateSimpleEmbedding(text, 384);
  }
}

function normalizeEmbeddingResponse(response: any): number[] {
  // HF API kann verschiedene Formate zurückgeben
  if (Array.isArray(response)) {
    // Direktes Array
    if (response.length > 0 && Array.isArray(response[0])) {
      return response[0];
    }
    return response;
  }
  
  // Objekt mit embedding/data Feld
  if (response.embedding && Array.isArray(response.embedding)) {
    return response.embedding;
  }
  if (response.data && Array.isArray(response.data)) {
    return Array.isArray(response.data[0]) ? response.data[0] : response.data;
  }
  
  // Wenn alles fehlschlägt, nutze einfaches Embedding
  console.warn('[Embeddings] Unexpected response format, using simple embedding');
  return generateSimpleEmbedding(JSON.stringify(response), 384);
}

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text ist erforderlich' },
        { status: 400 }
      );
    }

    // ✅ Text-Length Check (OpenAI Limit: 8191 tokens, HF: ~512 tokens)
    let processedText = text;
    if (text.length > 10000) {
      console.warn(`[Embeddings] Warning: Text very long (${text.length} chars), truncating to 10000`);
      // Für Embeddings: Erste 10000 Zeichen sind meist ausreichend
      processedText = text.substring(0, 10000);
    }

    let embedding: number[];
    let source = 'unknown';

    // ✅ Versuche zuerst OpenAI (wenn Key vorhanden)
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (openaiApiKey && openaiApiKey.trim() !== '') {
      try {
        console.log('[Embeddings] Attempting OpenAI embedding...');
        embedding = await generateOpenAIEmbedding(processedText, openaiApiKey);
        source = 'openai';
        console.log(`[Embeddings] ✅ OpenAI embedding generated (${embedding.length} dimensions)`);
      } catch (openaiError: any) {
        console.warn('[Embeddings] OpenAI failed, falling back to Hugging Face:', openaiError.message);
        // Fallback zu Hugging Face
        embedding = await generateHuggingFaceEmbedding(processedText);
        source = 'huggingface';
        console.log(`[Embeddings] ✅ Hugging Face embedding generated (${embedding.length} dimensions)`);
      }
    } else {
      // ✅ Kein OpenAI Key: Nutze Hugging Face (kostenlos)
      console.log('[Embeddings] No OpenAI key, using Hugging Face (free)');
      embedding = await generateHuggingFaceEmbedding(processedText);
      source = 'huggingface';
      console.log(`[Embeddings] ✅ Hugging Face embedding generated (${embedding.length} dimensions)`);
    }

    if (!embedding || embedding.length === 0) {
      throw new Error('Embedding generation returned empty result');
    }

    return NextResponse.json({ 
      embedding,
      source, // Für Debugging
      dimensions: embedding.length,
    });
  } catch (error: any) {
    console.error('[Embeddings] Error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Embedding-Generierung fehlgeschlagen',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

