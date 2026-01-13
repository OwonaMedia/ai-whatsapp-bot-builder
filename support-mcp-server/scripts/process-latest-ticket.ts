/**
 * Verarbeitet das neueste Ticket direkt über den Router
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createSupportContext } from '../src/services/supportContext.js';
import { SupportTicketRouter } from '../src/services/ticketRouter.js';
import { createLogger } from '../src/utils/logger.js';

// Lade .env manuell
function loadEnv() {
  const envPaths = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '.env.local'),
    resolve(process.cwd(), '..', 'frontend', '.env.local'),
    resolve(process.cwd(), '..', '.env.local'),
  ];

  for (const envPath of envPaths) {
    try {
      const content = readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
            if (!process.env[key.trim()]) {
              process.env[key.trim()] = value;
            }
          }
        }
      }
      
      if (process.env.SUPABASE_SERVICE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) {
        if (!process.env.SUPABASE_SERVICE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL) {
          process.env.SUPABASE_SERVICE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
        }
        if (process.env.SUPABASE_SERVICE_URL) {
          console.log(`✅ Umgebungsvariablen geladen`);
          return;
        }
      }
    } catch (error) {
      // Ignoriere Fehler
    }
  }

  if (!process.env.SUPABASE_SERVICE_URL) {
    console.error('❌ Keine Umgebungsvariablen gefunden!');
    process.exit(1);
  }
}

loadEnv();

async function main() {
  const logger = createLogger();
  console.log('🔧 VERARBEITE NEUESTES TICKET\n');

  try {
    const context = await createSupportContext(logger);
    const router = new SupportTicketRouter(context, logger);

    // Hole das neueste Ticket (unabhängig vom Status, um auch gerade erstellte Tickets zu erfassen)
    const { data: tickets, error } = await context.supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !tickets || tickets.length === 0) {
      console.log('✅ Kein offenes Ticket gefunden');
      process.exit(0);
    }

    const ticket = tickets[0];
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🎫 Ticket: ${ticket.id.substring(0, 8)}`);
    console.log(`   Titel: ${ticket.title}`);
    console.log(`   Status: ${ticket.status}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('→ Verarbeite Ticket...');
    await router.dispatch({
      eventType: 'UPDATE',
      ticket: ticket as any,
    });

    // Warte kurz
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Prüfe Status
    const { data: updatedTicket } = await context.supabase
      .from('support_tickets')
      .select('*, support_ticket_messages(*)')
      .eq('id', ticket.id)
      .single();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 ERGEBNIS:');
    console.log(`   Status: ${updatedTicket?.status}`);
    console.log(`   Assigned Agent: ${updatedTicket?.assigned_agent}`);
    console.log(`   Nachrichten: ${updatedTicket?.support_ticket_messages?.length ?? 0}`);
    
    if (updatedTicket?.support_ticket_messages && updatedTicket.support_ticket_messages.length > 0) {
      const lastMessage = updatedTicket.support_ticket_messages
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      console.log(`   Letzte Nachricht: [${lastMessage.author_type}] ${lastMessage.message.substring(0, 80)}...`);
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ VERARBEITUNG ABGESCHLOSSEN\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ FEHLER:', error);
    process.exit(1);
  }
}

main();

