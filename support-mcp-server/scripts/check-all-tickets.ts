/**
 * Prüft alle Tickets und deren Status
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
  console.log('📋 ALLE TICKETS PRÜFEN\n');

  try {
    const context = await createSupportContext(logger);

    // Hole alle Tickets (letzte 10)
    const { data: tickets, error } = await context.supabase
      .from('support_tickets')
      .select('id, title, status, priority, created_at, assigned_agent')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Fehler:', error);
      process.exit(1);
    }

    if (!tickets || tickets.length === 0) {
      console.log('✅ Keine Tickets gefunden');
      process.exit(0);
    }

    console.log(`📊 Gefundene Tickets: ${tickets.length}\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    for (const ticket of tickets) {
      console.log(`\n🎫 ${ticket.id.substring(0, 8)}`);
      console.log(`   Titel: ${ticket.title}`);
      console.log(`   Status: ${ticket.status}`);
      console.log(`   Priorität: ${ticket.priority}`);
      console.log(`   Assigned: ${ticket.assigned_agent || 'keiner'}`);
      console.log(`   Erstellt: ${new Date(ticket.created_at).toLocaleString('de-DE')}`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ FEHLER:', error);
    process.exit(1);
  }
}

main();




