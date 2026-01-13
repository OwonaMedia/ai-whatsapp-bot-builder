import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createSupportSupabase } from '../src/services/supabaseClient.js';
import { loadConfig } from '../src/services/config.js';

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
            // Überspringe PLACEHOLDER_VALUE - das ist kein echter Wert
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
          // Prüfe ob auch SERVICE_ROLE_KEY vorhanden ist
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

// Debug: Zeige die URL (ohne den Key)
if (process.env.SUPABASE_SERVICE_URL) {
  const url = process.env.SUPABASE_SERVICE_URL;
  console.log(`🔍 SUPABASE_SERVICE_URL: ${url.substring(0, 30)}...`);
  console.log(`   Länge: ${url.length}`);
  console.log(`   Hat trailing slash: ${url.endsWith('/')}`);
  console.log(`   Hat Whitespace: ${url.trim() !== url}`);
}

interface AutomationEvent {
  id: string;
  ticket_id: string;
  action_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

async function checkAutomationEvents() {
  console.log('🔍 Prüfe Automation-Events für E2E-Test-Tickets...\n');

  const config = loadConfig();
  const supabase = createSupportSupabase(config);

  // Test-Ticket-Titel
  const testTitles = [
    'PDF-Upload funktioniert nicht',
    'WhatsApp Bot reagiert nicht mehr',
    'Stripe Payment schlägt fehl',
    'API-Endpoint /api/payments/checkout fehlt',
    'Zugriff auf knowledge_sources verweigert',
    'Checkout-Komponente fehlt',
    'i18n-Übersetzung fehlt',
    'Docker Container hängt',
    'Server offline - 502 Bad Gateway',
  ];

  // Hole Test-User ID
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const testAuthUser = authUsers?.users?.find(u => u.email === 'test-e2e@owona.de');
  const testUserId = testAuthUser?.id || null;

  if (!testUserId) {
    console.error('❌ Test-User nicht gefunden!');
    return;
  }

  console.log(`👤 Test-User: ${testAuthUser?.email} (${testUserId})\n`);

  // Hole alle Test-Tickets
  const { data: tickets } = await supabase
    .from('support_tickets')
    .select('id, title, status')
    .eq('user_id', testUserId)
    .in('title', testTitles);

  if (!tickets || tickets.length === 0) {
    console.log('❌ Keine Test-Tickets gefunden!');
    return;
  }

  console.log(`📋 Gefundene Tickets: ${tickets.length}\n`);

  // Für jedes Ticket: Hole Automation-Events
  for (const ticket of tickets) {
    console.log(`\n📌 ${ticket.title}`);
    console.log(`   ID: ${ticket.id}`);
    console.log(`   Status: ${ticket.status}`);

    const { data: events, error } = await supabase
      .from('support_automation_events')
      .select('*')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.log(`   ❌ Fehler beim Abrufen der Events: ${error.message}`);
      continue;
    }

    if (!events || events.length === 0) {
      console.log(`   ⚠️  Keine Automation-Events gefunden`);
      continue;
    }

    console.log(`   ✅ ${events.length} Automation-Events gefunden:\n`);

    for (const event of events) {
      const eventDate = new Date(event.created_at).toLocaleString('de-DE');
      console.log(`      📅 ${eventDate}`);
      console.log(`      🔧 Action: ${event.action_type}`);
      
      // Zeige relevante Payload-Informationen
      const payload = event.payload as Record<string, unknown>;
      if (payload) {
        if (payload.agent) {
          console.log(`      👤 Agent: ${payload.agent}`);
        }
        if (payload.instructionType) {
          console.log(`      📝 Instruction: ${payload.instructionType}`);
        }
        if (payload.approved !== undefined) {
          console.log(`      ✅ Approved: ${payload.approved}`);
        }
        if (payload.patternId) {
          console.log(`      🎯 Pattern: ${payload.patternId}`);
        }
        if (payload.summary) {
          console.log(`      📄 Summary: ${String(payload.summary).substring(0, 100)}...`);
        }
        if (payload.error) {
          console.log(`      ❌ Error: ${String(payload.error).substring(0, 100)}...`);
        }
      }
      console.log('');
    }
  }

  // Zusammenfassung
  console.log('\n📊 Zusammenfassung:\n');
  
  let totalEvents = 0;
  const eventsByType: Record<string, number> = {};
  const eventsByTicket: Record<string, number> = {};

  for (const ticket of tickets) {
    const { data: events } = await supabase
      .from('support_automation_events')
      .select('action_type')
      .eq('ticket_id', ticket.id);

    if (events) {
      eventsByTicket[ticket.title] = events.length;
      totalEvents += events.length;

      for (const event of events) {
        eventsByType[event.action_type] = (eventsByType[event.action_type] || 0) + 1;
      }
    }
  }

  console.log(`   Gesamt-Events: ${totalEvents}`);
  console.log(`   Events pro Ticket:`);
  for (const [title, count] of Object.entries(eventsByTicket)) {
    console.log(`      - ${title}: ${count} Events`);
  }
  console.log(`\n   Events nach Typ:`);
  for (const [type, count] of Object.entries(eventsByType)) {
    console.log(`      - ${type}: ${count}`);
  }
}

(async () => {
  await checkAutomationEvents();
})();

