import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { OpenAI } from "npm:openai@^4.55.0";

/**
 * Afrika MCP Server - Supabase Edge Function
 * 
 * Spezialisiert auf n8n-Probleme in Afrika
 * Unterstützt Deutsch, Englisch, Französisch
 * Kennt länderspezifische Lösungen für Afrika
 */

interface ChatRequest {
  message: string;
  userId?: string;
  locale?: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  conversationId?: string;
}

interface ChatResponse {
  response: string;
  language?: string;
  agent?: string;
}

// Language detection for West Africa (English/French/German)
function detectLanguage(message: string): 'en' | 'fr' | 'de' {
  const text = message.toLowerCase();
  
  // Strong German indicators
  const germanKeywords = ['kamerun', 'n8n', 'startet nicht', 'betrieb', 'deutsch', 'nicht', 'funktioniert', 'fehler', 'problem'];
  const germanMatches = germanKeywords.filter(keyword => text.includes(keyword)).length;
  if (germanMatches >= 2) return 'de';
  
  // Strong French indicators
  const strongFrenchPatterns = [
    /\bbonjour\b/, /\bsalut\b/, /\bje suis\b/, /\bj'ai\b/, /\bpouvez-vous\b/,
    /\bmerci\b/, /\bs'il vous plaît\b/, /\bcomment\b/, /\bqu'est-ce que\b/,
    /\bil y a\b/, /\bc'est\b/, /\bje veux\b/, /\bje voudrais\b/, /\baide\b/,
    /\bproblème\b/, /\binstaller\b/, /\bavez-vous\b/, /\bpouvez vous\b/
  ];
  
  for (const pattern of strongFrenchPatterns) {
    if (pattern.test(text)) return 'fr';
  }
  
  // Default to English for West Africa
  return 'en';
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
    const { message, userId, locale, conversationHistory = [], conversationId = 'default' } = body;

    console.log('[Afrika Chat Edge Function] Received:', {
      message,
      conversationHistoryLength: conversationHistory?.length || 0,
      conversationId,
    });

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Auto-detect language
    const detectedLanguage = detectLanguage(message);
    const finalLanguage = locale || detectedLanguage;

    // Analyze message for country and problem type
    const lowerMessage = message.toLowerCase();
    
    // Detect country
    const countries: { [key: string]: string } = {
      'kamerun': 'Cameroon', 'cameroon': 'Cameroon', 'cameroun': 'Cameroon',
      'nigeria': 'Nigeria', 'nigerien': 'Nigeria',
      'ghana': 'Ghana', 'ghanaian': 'Ghana',
      'senegal': 'Senegal', 'sénégal': 'Senegal', 'senegalese': 'Senegal',
      'ivory coast': 'Ivory Coast', 'côte d\'ivoire': 'Ivory Coast', 'ivorian': 'Ivory Coast'
    };
    
    let detectedCountry = '';
    for (const [key, value] of Object.entries(countries)) {
      if (lowerMessage.includes(key)) {
        detectedCountry = value;
        break;
      }
    }
    
    // Detect problem type
    const problemTypes: { [key: string]: string } = {
      'startet nicht': 'startup', 'not starting': 'startup', 'ne démarre pas': 'startup',
      'betrieb': 'operation', 'operation': 'operation', 'opération': 'operation',
      'installation': 'installation', 'install': 'installation', 'installer': 'installation',
      'slow': 'performance', 'langsam': 'performance', 'lent': 'performance',
      'port': 'port', 'port blocked': 'port', 'port blockiert': 'port',
      'docker': 'docker', 'container': 'docker'
    };
    
    let detectedProblem = '';
    for (const [key, value] of Object.entries(problemTypes)) {
      if (lowerMessage.includes(key)) {
        detectedProblem = value;
        break;
      }
    }

    let response: ChatResponse;

    if (deepseekApiKey) {
      // Use DeepSeek API for intelligent responses
      const openai = new OpenAI({
        apiKey: deepseekApiKey,
        baseURL: 'https://api.deepseek.com',
      });

      try {
        // Create prompt with conversation history
        const conversationContext = Array.isArray(conversationHistory) && conversationHistory.length > 0
          ? `\n\n**Konversations-Verlauf:**\n${conversationHistory.slice(-10).map((m) => `${m.role === 'user' ? 'User' : 'Assistent'}: ${m.content}`).join('\n')}\n`
          : '';

        const systemPrompts = {
          'de': `Du bist ein freundlicher, hilfsbereiter n8n-Experte für Afrika. Du führst natürliche Gespräche wie ChatGPT.

🎯 DEINE PERSONALITÄT:
- Freundlich, geduldig und verständnisvoll
- Erfahren mit n8n-Problemen in Afrika (Nigeria, Ghana, Senegal, Kamerun, Elfenbeinküste)
- Du verstehst Gesprächskontext und baust darauf auf
- Du stellst Nachfragen, wenn etwas unklar ist
- Du bietest praktische, umsetzbare Lösungen

🌍 DEINE EXPERTISE:
- n8n Installation & Konfiguration in Afrika
- Docker, npm, Node.js Probleme
- Netzwerk-Optimierungen für schlechte Internetverbindungen
- ISP-spezifische Lösungen für afrikanische Länder
- Port-Blockierung, SSL-Probleme, Registry-Mirrors

💬 GESPRÄCHSSTIL:
- WICHTIG: Antworte IMMER in der GLEICHEN Sprache wie der Nutzer (Deutsch, Englisch, Französisch, etc.)
- Wenn der Nutzer auf Deutsch schreibt, antworte auf Deutsch. Wenn auf Englisch, antworte auf Englisch. Wenn auf Französisch, antworte auf Französisch.
- Führe natürliche Gespräche - wie ein echter Mensch
- Beziehe dich auf vorherige Nachrichten
- Stelle Nachfragen bei unklaren Problemen
- Sei empathisch bei Frustration
- Verwende Emojis sparsam aber angemessen
- WICHTIG: Antworte DIREKT auf die spezifische Frage des Nutzers. Gib KEINE generischen Antworten. Analysiere die Frage und gib eine präzise, hilfreiche Antwort.`,

          'fr': `Vous êtes un expert n8n amical et serviable pour l'Afrique. Vous menez des conversations naturelles comme ChatGPT.

🎯 VOTRE PERSONNALITÉ:
- Amical, patient et compréhensif
- Expérimenté avec les problèmes n8n en Afrique (Sénégal, Côte d'Ivoire, Cameroun, Nigeria, Ghana)
- Vous comprenez le contexte des conversations et vous y basez
- Vous posez des questions de suivi si quelque chose n'est pas clair
- Vous donnez des solutions pratiques et réalisables

🌍 VOTRE EXPERTISE:
- Installation et configuration n8n en Afrique
- Problèmes Docker, npm, Node.js
- Optimisations réseau pour les mauvaises connexions internet
- Solutions spécifiques aux FAI pour les pays africains
- Blocage de ports, problèmes SSL, miroirs de registre

💬 STYLE DE CONVERSATION:
- CRITICAL: Répondez TOUJOURS dans la même langue que l'utilisateur (français, anglais, allemand, etc.)
- Si l'utilisateur écrit en français, répondez en français. Si en anglais, répondez en anglais. Si en allemand, répondez en allemand.
- Menez des conversations naturelles - comme un vrai humain
- Référez-vous aux messages précédents
- Posez des questions de suivi pour les problèmes peu clairs
- Soyez empathique en cas de frustration
- Utilisez les emojis avec parcimonie mais de manière appropriée
- IMPORTANT: Répondez DIRECTEMENT à la question spécifique de l'utilisateur. Ne donnez PAS de réponses génériques. Analysez la question et donnez une réponse précise et utile.`,

          'en': `You are a friendly, helpful n8n expert for Africa. You conduct natural conversations like ChatGPT.

🎯 YOUR PERSONALITY:
- Friendly, patient, and understanding
- Experienced with n8n problems in Africa (Nigeria, Ghana, Senegal, Cameroon, Ivory Coast)
- You understand conversation context and build upon it
- You ask follow-up questions when something is unclear
- You provide practical, actionable solutions

🌍 YOUR EXPERTISE:
- n8n installation & configuration in Africa
- Docker, npm, Node.js problems
- Network optimizations for poor internet connections
- ISP-specific solutions for African countries
- Port blocking, SSL problems, registry mirrors

💬 CONVERSATION STYLE:
- CRITICAL: ALWAYS respond in the SAME language as the user (English, German, French, etc.)
- If the user writes in German, respond in German. If in English, respond in English. If in French, respond in French.
- Conduct natural conversations - like a real human
- Reference previous messages
- Ask follow-up questions for unclear problems
- Be empathetic with frustration
- Use emojis sparingly but appropriately
- IMPORTANT: Answer DIRECTLY to the user's specific question. Do NOT give generic responses. Analyze the question and provide a precise, helpful answer.`
        };

        const systemPrompt = systemPrompts[finalLanguage as keyof typeof systemPrompts] || systemPrompts['en'];
        
        const countryContext = detectedCountry ? `\n\n**Erkanntes Land:** ${detectedCountry}\nGib länderspezifische Lösungen für ${detectedCountry}.` : '';
        const problemContext = detectedProblem ? `\n\n**Erkanntes Problem:** ${detectedProblem}\nKonzentriere dich auf Lösungen für dieses spezifische Problem.` : '';

        const prompt = `${systemPrompt}${countryContext}${problemContext}${conversationContext}

**Aktuelle Nutzer-Nachricht:**
${message}

Antworte als n8n Afrika Experte und helfe dem Nutzer weiter. Antworte NUR mit der Antwort, keine zusätzlichen Erklärungen.`;

        console.log('[Afrika Chat Edge Function] Sending to DeepSeek:', {
          promptLength: prompt.length,
          conversationHistoryLength: conversationHistory?.length || 0,
          detectedLanguage: finalLanguage,
          detectedCountry,
          detectedProblem,
          model: 'deepseek-chat',
          maxTokens: 300,
        });

        // Build messages array for chat completion
        const messages = [
          { role: 'system' as const, content: systemPrompt },
          ...conversationHistory.slice(-10).map((m) => ({
            role: m.role === 'user' ? 'user' as const : 'assistant' as const,
            content: m.content,
          })),
          { role: 'user' as const, content: `${countryContext}${problemContext}\n\n**Aktuelle Nutzer-Nachricht:**\n${message}\n\nAntworte als n8n Afrika Experte und helfe dem Nutzer weiter. Antworte NUR mit der Antwort, keine zusätzlichen Erklärungen.` },
        ];

        // Use DeepSeek API for high-quality, fast responses
        const deepseekResponse = await openai.chat.completions.create({
          model: 'deepseek-chat', // High-quality model with fast response times
          messages,
          temperature: 0.7,
          max_tokens: 300, // Optimized for speed while maintaining quality
        }, {
          timeout: 30000, // 30 seconds timeout (faster than 60s)
        });

        // Extract response
        let aiResponse: string;
        if (deepseekResponse.choices && deepseekResponse.choices.length > 0 && deepseekResponse.choices[0].message?.content) {
          aiResponse = deepseekResponse.choices[0].message.content.trim();
        } else {
          aiResponse = generateFallbackResponse(message, finalLanguage, detectedCountry, detectedProblem);
        }

        console.log('[Afrika Chat Edge Function] Received response:', {
          responseLength: aiResponse.length,
          responsePreview: aiResponse.substring(0, 100),
        });

        response = {
          response: aiResponse,
          language: finalLanguage,
          agent: 'afrika-expert',
        };
      } catch (error) {
        console.error('[Afrika Chat Edge Function] DeepSeek API Error:', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        response = {
          response: generateFallbackResponse(message, finalLanguage, detectedCountry, detectedProblem),
          language: finalLanguage,
          agent: 'afrika-expert',
        };
      }
    } else {
      // Fallback without LLM
      console.warn('[Afrika Chat Edge Function] DEEPSEEK_API_KEY nicht gesetzt - verwende Fallback-Antworten');
      response = {
        response: generateFallbackResponse(message, finalLanguage, detectedCountry, detectedProblem),
        language: finalLanguage,
        agent: 'afrika-expert',
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
    console.error('[Afrika Chat Edge Function] Error:', error);
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

function generateFallbackResponse(message: string, language: string, country?: string, problem?: string): string {
  const messageLower = message.toLowerCase();
  
  if (language === 'fr') {
    if (country && problem) {
      return `🔧 **Problème détecté: ${problem} en ${country}**\n\nVous avez écrit: "${message}"\n\n**Solutions spécifiques pour ${country}:**\n\n${problem === 'startup' ? '🚀 **n8n ne démarre pas:**\n```bash\n# Vérifier les logs\ndocker logs n8n\n# Redémarrer\npm2 restart n8n\n# Ou avec Docker\ndocker restart n8n\n```' : ''}${problem === 'operation' ? '⚙️ **Problèmes d\'exploitation:**\n```bash\n# Vérifier le statut\npm2 status\n# Voir les logs en temps réel\npm2 logs n8n\n```' : ''}\n\n**Besoin d\'aide plus spécifique?** Décrivez l\'erreur exacte que vous voyez!`;
    }
    return `💬 **Assistant n8n Afrique**\n\nVous avez écrit: "${message}"\n\nJe comprends votre problème. Pour vous aider plus précisément:\n\n**Dites-moi:**\n• Le pays où vous êtes${country ? ` (détecté: ${country})` : ''}\n• L'erreur exacte que vous voyez\n• À quelle étape le problème se produit\n\n**Je peux vous aider avec:**\n🎯 Installation & configuration\n🐳 Docker & containers\n🌐 Problèmes réseau\n⚡ Performance & optimisation\n\n**Décrivez votre problème plus en détail et je vous donnerai une solution précise!**`;
  } else if (language === 'de') {
    if (country && problem) {
      return `🔧 **Problem erkannt: ${problem} in ${country}**\n\nDu hast geschrieben: "${message}"\n\n**Spezifische Lösungen für ${country}:**\n\n${problem === 'startup' ? '🚀 **n8n startet nicht:**\n```bash\n# Logs prüfen\ndocker logs n8n\n# Neustarten\npm2 restart n8n\n# Oder mit Docker\ndocker restart n8n\n```' : ''}${problem === 'operation' ? '⚙️ **Betriebsprobleme:**\n```bash\n# Status prüfen\npm2 status\n# Logs in Echtzeit ansehen\npm2 logs n8n\n```' : ''}\n\n**Brauchst du spezifischere Hilfe?** Beschreibe den genauen Fehler, den du siehst!`;
    }
    return `💬 **n8n Afrika Assistant**\n\nDu hast geschrieben: "${message}"\n\nIch verstehe dein Problem. Um dir präziser zu helfen:\n\n**Sag mir:**\n• Das Land, in dem du bist${country ? ` (erkannt: ${country})` : ''}\n• Den genauen Fehler, den du siehst\n• In welchem Schritt das Problem auftritt\n\n**Ich kann dir helfen mit:**\n🎯 Installation & Setup\n🐳 Docker & Container\n🌐 Netzwerkprobleme\n⚡ Performance & Optimierung\n\n**Beschreibe dein Problem genauer und ich gebe dir eine präzise Lösung!**`;
  } else {
    // English
    if (country && problem) {
      return `🔧 **Problem detected: ${problem} in ${country}**\n\nYou wrote: "${message}"\n\n**Specific solutions for ${country}:**\n\n${problem === 'startup' ? '🚀 **n8n not starting:**\n```bash\n# Check logs\ndocker logs n8n\n# Restart\npm2 restart n8n\n# Or with Docker\ndocker restart n8n\n```' : ''}${problem === 'operation' ? '⚙️ **Operation issues:**\n```bash\n# Check status\npm2 status\n# View real-time logs\npm2 logs n8n\n```' : ''}\n\n**Need more specific help?** Describe the exact error you see!`;
    }
    return `💬 **n8n Africa Assistant**\n\nYou wrote: "${message}"\n\nI understand your problem. To help you more precisely:\n\n**Tell me:**\n• The country you're in${country ? ` (detected: ${country})` : ''}\n• The exact error you see\n• At which step the problem occurs\n\n**I can help with:**\n🎯 Installation & setup\n🐳 Docker & containers\n🌐 Network issues\n⚡ Performance & optimization\n\n**Describe your problem in more detail and I'll give you a precise solution!**`;
  }
}

