import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase';
import { createSupportTicket } from '@/lib/support/createTicket';

/**
 * POST /api/support/chat
 * 
 * Chat-Endpoint für den MCP Chatbot
 * 
 * - Nutzt Sales MCP Server (Supabase Edge Function) für Verkauf/Vertrieb/Marketing
 * - Nutzt Support MCP Server für Support-Tickets und Probleme
 * - Automatische Routing-Logik basierend auf Nachrichteninhalt
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const { message, userId, locale = 'de', conversationHistory = [] } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Nachricht ist erforderlich' },
        { status: 400 }
      );
    }

    // Prüfe ob die Nachricht ein Problem beschreibt (Support) oder Verkauf/Marketing (Sales)
    const messageLower = message.toLowerCase();
    const isProblem = 
      messageLower.includes('problem') ||
      messageLower.includes('fehler') ||
      messageLower.includes('funktioniert nicht') ||
      messageLower.includes('bug') ||
      messageLower.includes('fehlgeschlagen') ||
      messageLower.includes('schiefgelaufen');
    
    const isSalesMarketing =
      messageLower.includes('preis') ||
      messageLower.includes('kosten') ||
      messageLower.includes('kaufen') ||
      messageLower.includes('abo') ||
      messageLower.includes('subscription') ||
      messageLower.includes('was kann') ||
      messageLower.includes('features') ||
      messageLower.includes('funktion') ||
      messageLower.includes('produkt') ||
      messageLower.includes('marketing') ||
      messageLower.includes('kampagne') ||
      messageLower.includes('demo') ||
      messageLower.includes('testversion') ||
      messageLower.includes('trial');

    // Routing: Sales/Marketing → Sales MCP Server (Supabase Edge Function)
    // Support/Probleme → Support MCP Server (Ticket-System)
    if (isSalesMarketing && !isProblem) {
      // Nutze Sales MCP Server (Supabase Edge Function)
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('NEXT_PUBLIC_SUPABASE_URL nicht gesetzt');
      }

      try {
        // Debug: Log die Historie bevor sie an Edge Function gesendet wird
        console.log('[Support Chat API] Sending to Sales MCP Server:', {
          message,
          conversationHistoryLength: conversationHistory?.length || 0,
          conversationHistory: conversationHistory,
        });

        const salesChatResponse = await fetch(`${supabaseUrl}/functions/v1/sales-chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
          },
          body: JSON.stringify({
            message,
            userId: user?.id,
            locale,
            conversationHistory: conversationHistory || [],
          }),
        });

        if (salesChatResponse.ok) {
          const salesData = await salesChatResponse.json();
          return NextResponse.json({
            response: salesData.response,
            agent: salesData.agent,
            productRecommendations: salesData.productRecommendations,
          });
        } else {
          // Fallback wenn Sales MCP Server nicht verfügbar
          console.error('Sales MCP Server Error:', await salesChatResponse.text());
        }
      } catch (error) {
        console.error('Sales MCP Server Request Error:', error);
        // Fallback zu lokaler Sales-Logik
      }
    }

    // Support/Problem-Routing → Support MCP Server (Supabase Edge Function)
    if (isProblem || (!isSalesMarketing && !isProblem)) {
      // Nutze Support MCP Server (Supabase Edge Function)
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error('NEXT_PUBLIC_SUPABASE_URL nicht gesetzt');
      }

      try {
        // Debug: Log die Historie bevor sie an Edge Function gesendet wird
        console.log('[Support Chat API] Sending to Support MCP Server:', {
          message,
          conversationHistoryLength: conversationHistory?.length || 0,
          conversationHistory: conversationHistory,
        });

        const supportChatResponse = await fetch(`${supabaseUrl}/functions/v1/support-chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`,
          },
          body: JSON.stringify({
            message,
            userId: user?.id,
            locale,
            conversationHistory: conversationHistory || [],
          }),
        });

        if (supportChatResponse.ok) {
          const supportData = await supportChatResponse.json();
          return NextResponse.json({
            response: supportData.response,
            ticketId: supportData.ticketId,
            agent: supportData.agent,
          });
        } else {
          // Fallback wenn Support MCP Server nicht verfügbar
          console.error('Support MCP Server Error:', await supportChatResponse.text());
        }
      } catch (error) {
        console.error('Support MCP Server Request Error:', error);
        // Fallback zu lokaler Support-Logik
      }
    }

    // Fallback: Lokale Support-Logik (wenn Edge Function nicht verfügbar)
    let response = '';
    let ticketId: string | undefined;

    // Bestimme Kategorie basierend auf Nachricht
    let category: 'bug' | 'billing' | 'integration' | 'ux' | 'other' = 'other';
    if (messageLower.includes('zahlung') || messageLower.includes('billing') || messageLower.includes('abrechnung')) {
      category = 'billing';
    } else if (messageLower.includes('integration') || messageLower.includes('api') || messageLower.includes('webhook')) {
      category = 'integration';
    } else if (messageLower.includes('ui') || messageLower.includes('design') || messageLower.includes('oberfläche')) {
      category = 'ux';
    } else if (isProblem) {
      category = 'bug';
    }

    // Erstelle Ticket wenn es ein Problem ist
    if (isProblem) {
      // Versuche Ticket zu erstellen, auch wenn User nicht eingeloggt ist
      if (user?.id) {
        const ticketResult = await createSupportTicket({
          category,
          title: message.length > 60 ? `${message.substring(0, 57)}...` : message,
          description: message,
          sourceMetadata: {
            source: 'chatbot',
            userId: user.id,
            locale,
            conversationHistory: conversationHistory.length,
          },
          userId: user.id,
          locale,
        });

        if (ticketResult.success && ticketResult.ticketId) {
          ticketId = ticketResult.ticketId;
          response = `✅ Ich habe dein Problem erkannt und automatisch ein Ticket (#${ticketResult.ticketId.substring(0, 8)}) erstellt.\n\nUnser MCP Support System analysiert das Problem jetzt automatisch und wird einen Fix vorbereiten. Du wirst benachrichtigt, sobald das Problem behoben ist.`;
        } else {
          response = `Ich habe dein Problem erkannt: "${message}". Unser Support-Team wird sich darum kümmern.${!user?.id ? ' Für eine schnellere Bearbeitung kannst du dich anmelden: /de/auth/login' : ''}`;
        }
      } else {
        // User nicht eingeloggt, aber Problem erkannt
        response = `Ich habe dein Problem erkannt: "${message}". Unser Support-Team wird sich darum kümmern.\n\n💡 Tipp: Melde dich an, damit wir dir direkt helfen können: /de/auth/login`;
      }
    } else {
      // Normale Nachricht - versuche Sales MCP Server als Fallback
      if (isSalesMarketing) {
        // Fallback Sales-Antwort
        response = 'Hallo! 👋 Ich bin dein Sales-Assistent für whatsapp.owona.de.\n\n💡 Möchtest du:\n- Mehr über unsere Produkte erfahren?\n- Preise und Features sehen?\n- Eine Testversion starten?\n\nFrage mich einfach!';
      } else if (!user?.id) {
        // Normale Nachricht ohne Login
        response = 'Hallo! 👋 Ich bin dein Assistent. Wie kann ich dir helfen?\n\n💡 Möchtest du:\n- Mehr über unsere Produkte erfahren?\n- Ein Problem melden?\n- Eine Testversion starten?';
      } else {
        // Normale Nachricht mit Login
        response = 'Vielen Dank für deine Nachricht! Wie kann ich dir helfen?\n\n💡 Möchtest du:\n- Mehr über unsere Produkte erfahren?\n- Ein Problem melden?\n- Eine Testversion starten?';
      }
    }

    return NextResponse.json({
      response,
      ticketId,
    });
  } catch (error) {
    console.error('[Support Chat API] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    console.error('[Support Chat API] Error Details:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { 
        error: 'Chat-Anfrage konnte nicht verarbeitet werden',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

