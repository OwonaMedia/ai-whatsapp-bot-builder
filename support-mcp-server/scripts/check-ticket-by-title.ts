/**
 * Prüft ein Ticket anhand des Titels
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createSupportContext } from '../src/services/supportContext.js';
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

const TITLE_TO_FIND = process.argv[2] || 'bezahlen mit apple pay';

async function main() {
  const logger = createLogger();
  console.log(`🔍 PRÜFE TICKET: "${TITLE_TO_FIND}"\n`);

  try {
    const context = await createSupportContext(logger);

    // Suche Ticket
    const { data: tickets, error } = await context.supabase
      .from('support_tickets')
      .select('*')
      .ilike('title', `%${TITLE_TO_FIND}%`)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error(`❌ Fehler beim Laden: ${error.message}`);
      process.exit(1);
    }

    if (!tickets || tickets.length === 0) {
      console.log('❌ Kein Ticket gefunden');
      console.log('\n📋 Suche in allen neuesten Tickets...\n');
      
      const { data: allTickets } = await context.supabase
        .from('support_tickets')
        .select('id, title, status, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (allTickets && allTickets.length > 0) {
        console.log('Neueste Tickets:');
        allTickets.forEach((t: any) => {
          console.log(`  - ${t.title} (${t.status}) - ${t.created_at}`);
        });
      }
      
      process.exit(1);
    }

    const ticket = tickets[0];
    console.log(`✅ Ticket gefunden:`);
    console.log(`   ID: ${ticket.id}`);
    console.log(`   Titel: ${ticket.title}`);
    console.log(`   Status: ${ticket.status}`);
    console.log(`   Kategorie: ${ticket.category}`);
    console.log(`   Erstellt: ${ticket.created_at}\n`);

    // Hole Nachrichten
    const { data: messages } = await context.supabase
      .from('support_ticket_messages')
      .select('*')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true });

    if (messages && messages.length > 0) {
      console.log(`📝 Beschreibung: ${messages[0].message.substring(0, 200)}...\n`);
    }

    // Prüfe Autopatch-Events
    const { data: events } = await context.supabase
      .from('support_automation_events')
      .select('*')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (events && events.length > 0) {
      console.log(`🔧 Autopatch-Events (${events.length}):`);
      events.forEach((e: any) => {
        console.log(`   - ${e.action_type}: ${JSON.stringify(e.payload).substring(0, 100)}...`);
      });
      console.log('');
    }

    // Prüfe ob Pattern erkannt wurde
    const lastEvent = events?.[0];
    if (lastEvent?.payload?.patternId) {
      console.log(`✅ Pattern erkannt: ${lastEvent.payload.patternId}`);
      if (lastEvent.payload.match) {
        console.log(`   Summary: ${lastEvent.payload.match.summary}`);
        if (lastEvent.payload.match.actions) {
          console.log(`   Actions: ${lastEvent.payload.match.actions.length}`);
        }
      }
    } else {
      console.log('⚠️  Kein Pattern erkannt oder Ticket noch nicht verarbeitet');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ FEHLER:', error);
    process.exit(1);
  }
}

main();




