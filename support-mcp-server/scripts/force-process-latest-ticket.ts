/**
 * Verarbeitet das neueste Ticket, unabhängig vom Status
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createSupportContext } from '../src/services/supportContext.js';
import { createLogger } from '../src/utils/logger.js';
import { TicketRouter } from '../src/services/ticketRouter.js';

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

async function main() {
  const logger = createLogger();
  console.log('🔧 VERARBEITE NEUESTES TICKET (FORCE)\n');

  try {
    const context = await createSupportContext(logger);

    // Hole neuestes Ticket (unabhängig vom Status)
    const { data: tickets, error } = await context.supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error(`❌ Fehler beim Laden der Tickets: ${error.message}`);
      process.exit(1);
    }

    if (!tickets || tickets.length === 0) {
      console.log('❌ Kein Ticket gefunden');
      process.exit(1);
    }

    const ticket = tickets[0];
    console.log(`📋 Ticket gefunden:`);
    console.log(`   ID: ${ticket.id}`);
    console.log(`   Titel: ${ticket.title}`);
    console.log(`   Status: ${ticket.status}`);
    console.log(`   Kategorie: ${ticket.category}\n`);

    // Hole Ticket-Nachrichten
    const { data: messages } = await context.supabase
      .from('support_ticket_messages')
      .select('*')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true });

    const description = messages && messages.length > 0 
      ? messages[0].message 
      : ticket.description;

    console.log(`📝 Beschreibung: ${description.substring(0, 100)}...\n`);

    // Verarbeite Ticket
    const router = new TicketRouter(context, logger);
    const result = await router.processTicket(ticket.id);

    if (result.success) {
      console.log('✅ Ticket erfolgreich verarbeitet');
      if (result.match) {
        console.log(`   Pattern: ${result.match.patternId}`);
        console.log(`   Summary: ${result.match.summary}`);
        if (result.match.actions && result.match.actions.length > 0) {
          console.log(`   Actions: ${result.match.actions.length}`);
          result.match.actions.forEach((action, i) => {
            console.log(`      ${i + 1}. ${action.type}: ${action.description}`);
          });
        }
      } else {
        console.log('   ⚠️  Kein Match gefunden');
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




