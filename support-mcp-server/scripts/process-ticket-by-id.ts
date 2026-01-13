/**
 * Verarbeitet ein Ticket anhand der ID
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createSupportContext } from '../src/services/supportContext.js';
import { createLogger } from '../src/utils/logger.js';
// TicketRouter wird über SupportContext verwendet
// Wir verwenden stattdessen die dispatch-Methode direkt

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

const TICKET_ID = process.argv[2];

if (!TICKET_ID) {
  console.error('❌ Bitte Ticket-ID angeben');
  console.error('   Usage: npx tsx scripts/process-ticket-by-id.ts <ticket-id>');
  process.exit(1);
}

async function main() {
  const logger = createLogger();
  console.log(`🔧 VERARBEITE TICKET: ${TICKET_ID}\n`);

  try {
    const context = await createSupportContext(logger);

    // Hole Ticket
    const { data: ticket, error } = await context.supabase
      .from('support_tickets')
      .select('*')
      .eq('id', TICKET_ID)
      .single();

    if (error || !ticket) {
      console.error(`❌ Ticket nicht gefunden: ${error?.message || 'Unbekannter Fehler'}`);
      process.exit(1);
    }

    console.log(`📋 Ticket:`);
    console.log(`   Titel: ${ticket.title}`);
    console.log(`   Status: ${ticket.status}`);
    console.log(`   Kategorie: ${ticket.category}\n`);

    // Verarbeite Ticket über dispatch (wie der Server es macht)
    // Simuliere ein UPDATE-Event
    const { SupportTicketRouter } = await import('../dist/services/ticketRouter.js');
    const router = new SupportTicketRouter(context, logger);
    
    // Hole Ticket-Nachrichten für vollständigen Kontext
    const { data: messages } = await context.supabase
      .from('support_ticket_messages')
      .select('*')
      .eq('ticket_id', TICKET_ID)
      .order('created_at', { ascending: true });
    
    const description = messages && messages.length > 0 
      ? messages[0].message 
      : ticket.description;
    
    // Erstelle MinimalTicket für dispatch
    const minimalTicket = {
      id: ticket.id,
      title: ticket.title,
      description: description,
      category: ticket.category,
      status: ticket.status,
    };
    
    // Dispatch Event (wie der Server es macht)
    const result = await router.dispatch({
      type: 'UPDATE',
      ticket: minimalTicket,
    });

    if (result.success) {
      console.log('✅ Ticket erfolgreich verarbeitet\n');
      if (result.match) {
        console.log(`📌 Pattern erkannt:`);
        console.log(`   Pattern-ID: ${result.match.patternId}`);
        console.log(`   Summary: ${result.match.summary}`);
        if (result.match.actions && result.match.actions.length > 0) {
          console.log(`\n🔧 Actions (${result.match.actions.length}):`);
          result.match.actions.forEach((action, i) => {
            console.log(`   ${i + 1}. ${action.type}: ${action.description}`);
            if (action.type === 'autopatch_plan' && action.payload) {
              console.log(`      Target Files: ${action.payload.targetFiles?.join(', ') || 'N/A'}`);
            }
          });
        }
        if (result.match.customerMessage) {
          console.log(`\n💬 Customer Message: ${result.match.customerMessage}`);
        }
      } else {
        console.log('⚠️  Kein Match gefunden');
      }
    } else {
      console.error(`❌ Fehler bei der Verarbeitung: ${result.error}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ FEHLER:', error);
    process.exit(1);
  }
}

main();

