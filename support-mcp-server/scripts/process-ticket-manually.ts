#!/usr/bin/env tsx
/**
 * Verarbeitet ein spezifisches Ticket manuell und zeigt den kompletten Flow
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createSupportSupabase } from '../src/services/supabaseClient.js';
import { loadConfig } from '../src/services/config.js';
import { SupportTicketRouter } from '../src/services/ticketRouter.js';
import { createSupportContext } from '../src/services/supportContext.js';
import { createMockLogger } from '../src/services/actions/__tests__/setup.js';

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
            if (value === 'PLACEHOLDER_VALUE' || value.includes('PLACEHOLDER')) {
              continue;
            }
            if (!process.env[key.trim()]) {
              process.env[key.trim()] = value;
            }
          }
        }
      }
      
      if (process.env.SUPABASE_SERVICE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) {
        if (!process.env.SUPABASE_SERVICE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL) {
          process.env.SUPABASE_SERVICE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL.trim().replace(/\/$/, '');
        }
        if (process.env.SUPABASE_SERVICE_URL) {
          process.env.SUPABASE_SERVICE_URL = process.env.SUPABASE_SERVICE_URL.trim().replace(/\/$/, '');
          if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
            return;
          }
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

async function processTicketManually(ticketTitle?: string) {
  console.log('🔧 Manuelle Ticket-Verarbeitung\n');

  const config = loadConfig();
  const supabase = createSupportSupabase(config);

  // Hole Test-User ID
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const testAuthUser = authUsers?.users?.find(u => u.email === 'test-e2e@owona.de');
  const testUserId = testAuthUser?.id || null;

  if (!testUserId) {
    console.error('❌ Test-User nicht gefunden!');
    return;
  }

  // Hole Ticket
  let ticket;
  if (ticketTitle) {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', testUserId)
      .eq('title', ticketTitle)
      .maybeSingle();

    if (error) {
      console.error(`❌ Fehler beim Abrufen des Tickets: ${error.message}`);
      return;
    }

    if (!data) {
      console.error(`❌ Ticket "${ticketTitle}" nicht gefunden!`);
      return;
    }

    ticket = data;
  } else {
    // Hole erstes verfügbares Test-Ticket
    const { data: tickets } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', testUserId)
      .eq('status', 'new')
      .limit(1);

    if (!tickets || tickets.length === 0) {
      console.error('❌ Keine Test-Tickets mit Status "new" gefunden!');
      return;
    }

    ticket = tickets[0];
  }

  console.log(`📋 Ticket gefunden:`);
  console.log(`   ID: ${ticket.id}`);
  console.log(`   Titel: ${ticket.title}`);
  console.log(`   Status: ${ticket.status}`);
  console.log(`   Beschreibung: ${ticket.description?.substring(0, 100)}...`);
  console.log('');

  // Setze Ticket auf 'new' zurück
  if (ticket.status !== 'new') {
    console.log('🔄 Setze Ticket auf Status "new" zurück...');
    const { error } = await supabase
      .from('support_tickets')
      .update({ status: 'new' })
      .eq('id', ticket.id);

    if (error) {
      console.error(`❌ Fehler beim Zurücksetzen: ${error.message}`);
      return;
    }
    ticket.status = 'new';
    console.log('✅ Ticket zurückgesetzt\n');
  }

  // Erstelle Router
  console.log('🚀 Initialisiere TicketRouter...');
  const kbLoadStartTime = Date.now();
  const logger = createMockLogger();
  const context = await createSupportContext(logger);
  const kbLoadDuration = Date.now() - kbLoadStartTime;
  console.log(`✅ Knowledge Base geladen (${kbLoadDuration}ms)`);
  
  const routerInitStartTime = Date.now();
  const router = new SupportTicketRouter(context, logger);
  const routerInitDuration = Date.now() - routerInitStartTime;
  console.log(`✅ TicketRouter initialisiert (${routerInitDuration}ms)\n`);

  // Zeige initiale Events
  const { data: initialEvents } = await supabase
    .from('support_automation_events')
    .select('*')
    .eq('ticket_id', ticket.id)
    .order('created_at', { ascending: false });

  console.log(`📊 Initiale Automation-Events: ${initialEvents?.length || 0}\n`);

  // Verarbeite Ticket
  console.log('⚙️  Starte Ticket-Verarbeitung...');
  const dispatchStartTime = Date.now();

  try {
    console.log('   📍 Schritt 1: Dispatch wird aufgerufen...');
    await Promise.race([
      router['dispatch']({ eventType: 'UPDATE', ticket: ticket as any }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Dispatch timeout')), 120000)),
    ]);
    const dispatchDuration = Date.now() - dispatchStartTime;
    console.log(`✅ Dispatch abgeschlossen (${dispatchDuration}ms)\n`);
  } catch (error) {
    const dispatchDuration = Date.now() - dispatchStartTime;
    if (error instanceof Error && error.message === 'Dispatch timeout') {
      console.error(`⚠️  Dispatch-Timeout nach ${dispatchDuration}ms`);
      console.log('   ⚠️  Ticket-Verarbeitung dauert zu lange - prüfe trotzdem Ergebnis\n');
    } else {
      console.error(`❌ Fehler beim Dispatch (${dispatchDuration}ms):`, error);
      return;
    }
  }

  // Warte auf Verarbeitung
  console.log('⏳ Warte 30 Sekunden auf Verarbeitung...');
  const waitStartTime = Date.now();
  await new Promise((resolve) => setTimeout(resolve, 30000));
  const waitDuration = Date.now() - waitStartTime;
  console.log(`✅ Wartezeit abgeschlossen (${waitDuration}ms)\n`);

  // Prüfe Ergebnis
  console.log('\n📊 Prüfe Ergebnis...\n');

  const { data: updatedTicket } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('id', ticket.id)
    .single();

  if (updatedTicket) {
    console.log(`📋 Aktualisiertes Ticket:`);
    console.log(`   Status: ${updatedTicket.status} (vorher: ${ticket.status})`);
    console.log(`   Assigned Agent: ${updatedTicket.assigned_agent || 'keiner'}`);
    console.log('');
  }

  // Zeige neue Events
  const { data: newEvents } = await supabase
    .from('support_automation_events')
    .select('*')
    .eq('ticket_id', ticket.id)
    .order('created_at', { ascending: false });

  const newEventCount = (newEvents?.length || 0) - (initialEvents?.length || 0);
  console.log(`📊 Neue Automation-Events: ${newEventCount}`);

  if (newEvents && newEvents.length > 0) {
    console.log('\n📋 Alle Events:');
    for (const event of newEvents.slice(0, 10)) {
      const eventDate = new Date(event.created_at).toLocaleString('de-DE');
      console.log(`\n   📅 ${eventDate}`);
      console.log(`   🔧 Action: ${event.action_type}`);
      
      const payload = event.payload as Record<string, unknown>;
      if (payload) {
        if (payload.agent) console.log(`   👤 Agent: ${payload.agent}`);
        if (payload.patternId) console.log(`   🎯 Pattern: ${payload.patternId}`);
        if (payload.instructionType) console.log(`   📝 Instruction: ${payload.instructionType}`);
        if (payload.approved !== undefined) console.log(`   ✅ Approved: ${payload.approved}`);
        if (payload.summary) console.log(`   📄 Summary: ${String(payload.summary).substring(0, 80)}...`);
      }
    }
  }

  // Zeige Ticket-Messages
  const { data: messages } = await supabase
    .from('support_ticket_messages')
    .select('*')
    .eq('ticket_id', ticket.id)
    .order('created_at', { ascending: false })
    .limit(5);

  if (messages && messages.length > 0) {
    console.log(`\n💬 Ticket-Messages: ${messages.length}`);
    for (const message of messages) {
      const messageDate = new Date(message.created_at).toLocaleString('de-DE');
      console.log(`\n   📅 ${messageDate}`);
      console.log(`   👤 ${message.author_name || message.author_type}`);
      console.log(`   💬 ${message.message?.substring(0, 100)}...`);
    }
  }

  console.log('\n✅ Manuelle Verarbeitung abgeschlossen!');
}

// Hole Ticket-Titel aus Command-Line-Argumenten
const ticketTitle = process.argv[2];

(async () => {
  await processTicketManually(ticketTitle);
})();

