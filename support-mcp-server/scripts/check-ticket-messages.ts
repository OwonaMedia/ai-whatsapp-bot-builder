/**
 * Prüft Nachrichten eines Tickets
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

async function main() {
  const logger = createLogger();
  console.log('📨 TICKET-NACHRICHTEN PRÜFEN\n');

  try {
    const context = await createSupportContext(logger);

    // Hole neuestes PDF-Ticket
    const { data: tickets, error } = await context.supabase
      .from('support_tickets')
      .select('id, title')
      .ilike('title', '%pdf%')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !tickets || tickets.length === 0) {
      console.log('✅ Kein PDF-Ticket gefunden');
      process.exit(0);
    }

    const ticket = tickets[0];
    console.log(`🎫 Ticket: ${ticket.id.substring(0, 8)} - ${ticket.title}\n`);

    // Hole Nachrichten
    const { data: messages, error: msgError } = await context.supabase
      .from('support_ticket_messages')
      .select('*')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (msgError) {
      console.error('❌ Fehler:', msgError);
      process.exit(1);
    }

    if (!messages || messages.length === 0) {
      console.log('✅ Keine Nachrichten gefunden');
      process.exit(0);
    }

    console.log(`📨 Nachrichten: ${messages.length}\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    for (const msg of messages) {
      console.log(`\n[${msg.author_type}] ${msg.author_name || msg.author_type}`);
      console.log(`   Zeit: ${new Date(msg.created_at).toLocaleString('de-DE')}`);
      console.log(`   Nachricht: ${msg.message.substring(0, 200)}${msg.message.length > 200 ? '...' : ''}`);
      if (msg.metadata && Object.keys(msg.metadata).length > 0) {
        console.log(`   Metadata: ${JSON.stringify(msg.metadata).substring(0, 100)}...`);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ FEHLER:', error);
    process.exit(1);
  }
}

main();




