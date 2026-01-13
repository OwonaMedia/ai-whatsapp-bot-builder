import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { OpenAI } from "npm:openai@^4.55.0";

/**
 * Support MCP Server - Supabase Edge Function
 * 
 * Spezialisiert auf Support, Kundenservice und Problem-Lösung
 * Nutzt die gleiche LLM-Logik wie der Support MCP Server
 */

interface ChatRequest {
  message: string;
  userId?: string;
  locale?: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  ticketId?: string;
}

interface ChatResponse {
  response: string;
  ticketId?: string;
  agent?: string;
}

Deno.serve(async (req: Request) => {
  try {
    // CORS Headers
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

    // Parse request
    const body: ChatRequest = await req.json();
    const { message, userId, locale = 'de', conversationHistory = [], ticketId } = body;

    console.log('[Support Chat Edge Function] Received:', {
      message,
      conversationHistoryLength: conversationHistory?.length || 0,
      ticketId,
    });

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Nachricht ist erforderlich' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const messageLower = message.toLowerCase();
    const isProblem = 
      messageLower.includes('problem') ||
      messageLower.includes('fehler') ||
      messageLower.includes('funktioniert nicht') ||
      messageLower.includes('bug') ||
      messageLower.includes('fehlgeschlagen') ||
      messageLower.includes('schiefgelaufen');

    let response: ChatResponse;
    let createdTicketId: string | undefined = ticketId;

    // Erstelle Ticket wenn Problem erkannt und noch kein Ticket existiert
    if (isProblem && !ticketId && userId) {
      try {
        // Bestimme Kategorie
        let category = 'other';
        if (messageLower.includes('zahlung') || messageLower.includes('billing') || messageLower.includes('abrechnung')) {
          category = 'billing';
        } else if (messageLower.includes('integration') || messageLower.includes('api') || messageLower.includes('webhook')) {
          category = 'integration';
        } else if (messageLower.includes('ui') || messageLower.includes('design') || messageLower.includes('oberfläche')) {
          category = 'ux';
        } else {
          category = 'bug';
        }

        const { data: ticket, error: ticketError } = await supabase
          .from('support_tickets')
          .insert({
            user_id: userId,
            category,
            title: message.length > 60 ? `${message.substring(0, 57)}...` : message,
            description: message,
            priority: category === 'bug' || category === 'integration' ? 'high' : 'normal',
            status: 'new',
            source_metadata: {
              source: 'chatbot',
              userId,
              locale,
              conversationHistory: conversationHistory.length,
            },
          })
          .select()
          .single();

        if (!ticketError && ticket) {
          createdTicketId = ticket.id;
        }
      } catch (error) {
        console.error('Ticket creation error:', error);
      }
    }

    // Debug: Prüfe ob DEEPSEEK_API_KEY gesetzt ist
    console.log('[Support Chat Edge Function] DeepSeek API Key check:', {
      hasDeepseekApiKey: !!deepseekApiKey,
    });

    if (deepseekApiKey) {
      // Nutze DeepSeek API für intelligente Antworten
      const openai = new OpenAI({
        apiKey: deepseekApiKey,
        baseURL: 'https://api.deepseek.com',
      });

      try {
        // Erstelle Prompt mit Konversationshistorie (wie im Support MCP Server)
        const conversationContext = Array.isArray(conversationHistory) && conversationHistory.length > 0
          ? `\n\n**Konversations-Verlauf:**\n${conversationHistory.slice(-10).map((m) => `${m.role === 'user' ? 'Kunde' : 'Support'}: ${m.content}`).join('\n')}\n`
          : '';

        const prompt = `Du bist ein professioneller Support-Assistent für whatsapp.owona.de. Antworte immer auf Deutsch, freundlich und hilfsbereit.

**Deine Rolle:** Support Agent
Du beantwortest Kundenfragen zu Abos, Rechnungen, Zahlungen und einfachen Troubleshooting-Schritten.

**Deine Ziele:**
1. Kunden freundlich begrüßen und kontextualisierte Hilfe anbieten
2. Zuerst Silent Checks durchführen, bevor Rückfragen gestellt werden
3. Nur eine gezielte Rückfrage stellen, bevorzugt mit Quick-Reply-Optionen
4. Technische Details nur intern dokumentieren (Progressive Disclosure)

**Wichtige Regeln:**
- Antworte immer auf Deutsch (außer Kunde spricht Englisch)
- Sei freundlich, professionell und hilfsbereit
- Bei Problemen: Erkläre dass ein Ticket erstellt wurde und das Problem analysiert wird
- Bei Fragen: Gib klare, verständliche Antworten
- **WICHTIG:** Nutze die Konversationshistorie um Kontext zu verstehen und passend zu antworten
- Wenn der Kunde "ja" sagt, beziehe dich IMMER auf die vorherige Frage/Aussage
${conversationContext}**Aktuelle Kunden-Nachricht:**
${message}
${createdTicketId ? `\n**Hinweis:** Ein Support-Ticket (#${createdTicketId.substring(0, 8)}) wurde für diese Anfrage erstellt.` : ''}

Antworte als Support Agent und helfe dem Kunden weiter. Antworte NUR mit der Antwort, keine zusätzlichen Erklärungen.`;

        console.log('[Support Chat Edge Function] Sending to DeepSeek:', {
          promptLength: prompt.length,
          conversationHistoryLength: conversationHistory?.length || 0,
        });

        // Build messages array for chat completion
        const messages = [
          { role: 'system' as const, content: prompt.split('**Aktuelle Kunden-Nachricht:**')[0] },
          ...conversationHistory.slice(-10).map((m) => ({
            role: m.role === 'user' ? 'user' as const : 'assistant' as const,
            content: m.content,
          })),
          { role: 'user' as const, content: prompt.split('**Aktuelle Kunden-Nachricht:**')[1] || prompt },
        ];

        // Use DeepSeek API for high-quality responses
        const deepseekResponse = await openai.chat.completions.create({
          model: 'deepseek-chat', // High-quality model with fast response times
          messages,
          temperature: 0.2,
          max_tokens: 500, // Increased for better responses
        }, {
          timeout: 60000, // 60 seconds timeout
        });

        // Extract response
        let aiResponse: string;
        if (deepseekResponse.choices && deepseekResponse.choices.length > 0 && deepseekResponse.choices[0].message?.content) {
          aiResponse = deepseekResponse.choices[0].message.content.trim();
        } else {
          aiResponse = 'Entschuldigung, ich konnte deine Anfrage nicht verarbeiten.';
        }

        console.log('[Support Chat Edge Function] Received response:', {
          responseLength: aiResponse.length,
          responsePreview: aiResponse.substring(0, 100),
        });

        response = {
          response: aiResponse,
          ticketId: createdTicketId,
          agent: 'support-agent',
        };
      } catch (error) {
        console.error('[Support Chat Edge Function] DeepSeek API Error:', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        response = {
          response: generateFallbackResponse(message, conversationHistory, createdTicketId),
          ticketId: createdTicketId,
          agent: 'support-agent',
        };
      }
    } else {
      // Fallback ohne LLM - DEEPSEEK_API_KEY nicht gesetzt
      console.warn('[Support Chat Edge Function] DEEPSEEK_API_KEY nicht gesetzt - verwende Fallback-Antworten');
      response = {
        response: generateFallbackResponse(message, conversationHistory, createdTicketId),
        ticketId: createdTicketId,
        agent: 'support-agent',
      };
    }

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('Support Chat Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Chat-Anfrage konnte nicht verarbeitet werden',
        details: error instanceof Error ? error.message : 'Unbekannter Fehler',
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

function generateFallbackResponse(
  message: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  ticketId?: string
): string {
  const messageLower = message.toLowerCase().trim();
  
  // Prüfe Konversationshistorie für Kontext
  const lastAssistantMessage = conversationHistory.filter(m => m.role === 'assistant').slice(-1)[0]?.content || '';

  // Wenn User "ja" sagt, beziehe dich auf die letzte Frage
  if ((messageLower === 'ja' || messageLower === 'yes' || messageLower === 'ok' || messageLower === 'gerne') && lastAssistantMessage) {
    if (lastAssistantMessage.includes('Ticket') || lastAssistantMessage.includes('ticket')) {
      return `Perfekt! Das Ticket wurde erstellt und wird von unserem Support-Team bearbeitet. Du wirst benachrichtigt, sobald es Updates gibt.`;
    }
  }

  if (messageLower.includes('problem') || messageLower.includes('fehler') || messageLower.includes('funktioniert nicht')) {
    if (ticketId) {
      return `✅ Ich habe dein Problem erkannt und automatisch ein Ticket (#${ticketId.substring(0, 8)}) erstellt.\n\nUnser MCP Support System analysiert das Problem jetzt automatisch und wird einen Fix vorbereiten. Du wirst benachrichtigt, sobald das Problem behoben ist.`;
    }
    return `Ich habe dein Problem erkannt. Unser Support-Team wird sich darum kümmern.\n\n💡 Tipp: Melde dich an, damit wir dir direkt helfen können: /de/auth/login`;
  }

  return `Hallo! 👋 Ich bin dein Support-Assistent für whatsapp.owona.de.\n\nWie kann ich dir helfen?\n\n💡 Möchtest du:\n- Ein Problem melden?\n- Fragen zu deinem Abo stellen?\n- Hilfe bei der Nutzung bekommen?`;
}

