import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { OpenAI } from "npm:openai@^4.55.0";

/**
 * Multilingual Writing Expert MCP Server - Supabase Edge Function
 * 
 * Spezialisiert auf multikulturelles Schreiben für E-Books
 * Unterstützt alle wichtigen Kulturen und Sprachen
 * Genre-Expertise und Schreibstil-Anpassung
 */

interface WritingRequest {
  topic: string;
  genre: string;
  language: string;
  targetAudience?: string;
  length?: 'short' | 'medium' | 'long';
  style?: string;
  purpose?: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

interface WritingResponse {
  content: string;
  structure?: Array<{ title: string; summary: string }>;
  metadata?: {
    language: string;
    genre: string;
    culturalMarkers: string[];
  };
  recommendations?: string[];
}

// Vollständiges kulturelles Wissen
const CULTURAL_CONTEXTS: Record<string, any> = {
  'de': {
    values: ['Präzision', 'Ordnung', 'Direktheit', 'Zuverlässigkeit'],
    style: 'formal',
    phrases: ['Sehr geehrte/r', 'Vielen Dank', 'Mit freundlichen Grüßen'],
  },
  'en': {
    values: ['Individuality', 'Innovation', 'Pragmatism', 'Achievement'],
    style: 'casual',
    phrases: ['Hello', 'Thank you', 'Best regards'],
  },
  'fr': {
    values: ['Élégance', 'Tradition', 'Art de vivre', 'Cordialité'],
    style: 'formal',
    phrases: ['Bonjour', 'Merci beaucoup', 'Cordialement'],
  },
  'es': {
    values: ['Familie', 'Leidenschaft', 'Geselligkeit', 'Tradition'],
    style: 'casual',
    phrases: ['Hola', 'Muchas gracias', 'Saludos'],
  },
  'it': {
    values: ['Stile', 'Passione', 'Tradizione', 'Bellezza'],
    style: 'casual',
    phrases: ['Ciao', 'Grazie', 'Cordiali saluti'],
  },
  'pt': {
    values: ['Calor humano', 'Alegria', 'Família', 'Tradição'],
    style: 'casual',
    phrases: ['Olá', 'Obrigado', 'Atenciosamente'],
  },
  'zh': {
    values: ['Harmonie', 'Respekt', 'Familie', 'Bildung'],
    style: 'formal',
    phrases: ['你好', '谢谢', '此致敬礼'],
  },
  'ja': {
    values: ['Höflichkeit', 'Harmonie', 'Respekt', 'Präzision'],
    style: 'formal',
    phrases: ['こんにちは', 'ありがとう', '敬具'],
  },
  'ar': {
    values: ['Gastfreundschaft', 'Tradition', 'Respekt', 'Familie'],
    style: 'formal',
    phrases: ['مرحبا', 'شكرا', 'مع التحية'],
  },
};

// Genre-Expertise
const GENRE_GUIDELINES: Record<string, any> = {
  'fiction': {
    structure: ['Introduction', 'Rising Action', 'Climax', 'Falling Action', 'Resolution'],
    elements: ['Character Development', 'Plot', 'Setting', 'Dialogue'],
    tone: 'narrative',
  },
  'non-fiction': {
    structure: ['Introduction', 'Main Body', 'Conclusion'],
    elements: ['Research', 'Evidence', 'Arguments', 'Examples'],
    tone: 'informative',
  },
  'technical': {
    structure: ['Overview', 'Instructions', 'Examples', 'Troubleshooting'],
    elements: ['Clarity', 'Precision', 'Step-by-step', 'Diagrams'],
    tone: 'professional',
  },
  'educational': {
    structure: ['Learning Objectives', 'Content', 'Exercises', 'Summary'],
    elements: ['Clear Concepts', 'Examples', 'Practice', 'Assessment'],
    tone: 'pedagogical',
  },
};

Deno.serve(async (req: Request) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY') || 'sk-fd178bb87e1240b19786ce816c77d07f';

    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: WritingRequest = await req.json();
    const { topic, genre, language, targetAudience, length, style, purpose, conversationHistory = [] } = body;

    console.log('[Multilingual Writing Expert] Received:', {
      topic,
      genre,
      language,
      conversationHistoryLength: conversationHistory?.length || 0,
    });

    if (!topic || !genre || !language) {
      return new Response(
        JSON.stringify({ error: 'Topic, genre, and language are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const culturalContext = CULTURAL_CONTEXTS[language] || CULTURAL_CONTEXTS['en'];
    const genreGuidelines = GENRE_GUIDELINES[genre] || GENRE_GUIDELINES['non-fiction'];

    let response: WritingResponse;

    if (deepseekApiKey) {
      const openai = new OpenAI({
        apiKey: deepseekApiKey,
        baseURL: 'https://api.deepseek.com',
      });

      try {
        const conversationContext = Array.isArray(conversationHistory) && conversationHistory.length > 0
          ? `\n\n**Conversation History:**\n${conversationHistory.slice(-10).map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')}\n`
          : '';

        const prompt = `Du bist ein Experte für multikulturelles Schreiben von E-Books.

**Deine Expertise:**
- Multikulturelles Schreiben in allen wichtigen Sprachen
- Genre-spezifische Expertise (Fiction, Non-Fiction, Technical, Educational)
- Kulturelle Anpassung und Lokalisierung
- Schreibstil-Optimierung

**Kultureller Kontext (${language}):**
- Werte: ${culturalContext.values.join(', ')}
- Stil: ${culturalContext.style}
- Gängige Phrasen: ${culturalContext.phrases.join(', ')}

**Genre-Richtlinien (${genre}):**
- Struktur: ${genreGuidelines.structure.join(' → ')}
- Elemente: ${genreGuidelines.elements.join(', ')}
- Ton: ${genreGuidelines.tone}

**Schreibanfrage:**
- Thema: ${topic}
- Genre: ${genre}
- Sprache: ${language}
${targetAudience ? `- Zielgruppe: ${targetAudience}` : ''}
${length ? `- Länge: ${length}` : ''}
${style ? `- Stil: ${style}` : ''}
${purpose ? `- Zweck: ${purpose}` : ''}
${conversationContext}

**Wichtige Regeln:**
- Schreibe authentisch in der Zielsprache (${language})
- Berücksichtige kulturelle Werte und Konventionen
- Folge Genre-spezifischen Strukturen
- Passe den Schreibstil an die Zielgruppe an
- Verwende kulturell angemessene Formulierungen
- Nutze die Konversationshistorie für Kontext

Erstelle hochwertigen E-Book-Content basierend auf diesen Anforderungen.`;

        console.log('[Multilingual Writing Expert] Sending to DeepSeek:', {
          promptLength: prompt.length,
          conversationHistoryLength: conversationHistory?.length || 0,
        });

        // Build messages array for chat completion
        const messages = [
          { role: 'system' as const, content: prompt.split('**Aktuelle Nutzer-Nachricht:**')[0] },
          ...conversationHistory.slice(-10).map((m) => ({
            role: m.role === 'user' ? 'user' as const : 'assistant' as const,
            content: m.content,
          })),
          { role: 'user' as const, content: prompt.split('**Aktuelle Nutzer-Nachricht:**')[1] || prompt },
        ];

        const deepseekResponse = await openai.chat.completions.create({
          model: 'deepseek-chat', // High-quality model for longer content
          messages,
          temperature: 0.8,
          max_tokens: 2000, // Increased for longer content generation
        }, {
          timeout: 60000, // 60 seconds timeout
        });

        let aiContent: string;
        if (deepseekResponse.choices && deepseekResponse.choices.length > 0 && deepseekResponse.choices[0].message?.content) {
          aiContent = deepseekResponse.choices[0].message.content.trim();
        } else {
          aiContent = generateFallbackResponse(topic, genre, language);
        }

        console.log('[Multilingual Writing Expert] Received response:', {
          responseLength: aiContent.length,
          responsePreview: aiContent.substring(0, 100),
        });

        response = {
          content: aiContent,
          metadata: {
            language,
            genre,
            culturalMarkers: culturalContext.values,
          },
          recommendations: [
            `Verwende kulturell angemessene Formulierungen für ${language}`,
            `Folge der ${genre} Genre-Struktur`,
          ],
        };
      } catch (error) {
        console.error('[Multilingual Writing Expert] DeepSeek API Error:', {
          error: error instanceof Error ? error.message : String(error),
        });
        response = {
          content: generateFallbackResponse(topic, genre, language),
          metadata: {
            language,
            genre,
            culturalMarkers: culturalContext.values,
          },
        };
      }
    } else {
      console.warn('[Multilingual Writing Expert] DEEPSEEK_API_KEY nicht gesetzt - verwende Fallback');
      response = {
        content: generateFallbackResponse(topic, genre, language),
        metadata: {
          language,
          genre,
          culturalMarkers: culturalContext.values,
        },
      };
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('[Multilingual Writing Expert] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Writing request could not be processed',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});

function generateFallbackResponse(topic: string, genre: string, language: string): string {
  return `# ${topic}

Dies ist ein Beispiel-Content für ein ${genre} E-Book in ${language}.

**Hinweis:** Für vollständigen AI-generierten Content benötigst du eine DEEPSEEK_API_KEY in den Supabase Edge Function Environment Variables.

**Nächste Schritte:**
1. Registriere dich bei DeepSeek: https://www.deepseek.com
2. Erstelle API Key
3. Setze DEEPSEEK_API_KEY in Supabase Dashboard → Edge Functions → Settings
4. Sende die Anfrage erneut für AI-generierten Content

**Thema:** ${topic}
**Genre:** ${genre}
**Sprache:** ${language}`;
}
