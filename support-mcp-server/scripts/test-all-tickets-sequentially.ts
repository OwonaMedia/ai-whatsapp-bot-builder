#!/usr/bin/env tsx
/**
 * Verarbeitet alle Test-Tickets nacheinander und zeigt eine Zusammenfassung
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createSupportSupabase } from '../src/services/supabaseClient.js';
import { loadConfig } from '../src/services/config.js';
import { SupportTicketRouter } from '../src/services/ticketRouter.js';
import { createSupportContext } from '../src/services/supportContext.js';
import { createMockLogger } from '../src/services/actions/__tests__/setup.js';
import type { SupportTicket } from '../src/services/ticketRouter.js';

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

interface TicketResult {
  ticketId: string;
  title: string;
  success: boolean;
  duration: number;
  initialStatus: string;
  finalStatus: string;
  eventCount: number;
  error?: string;
}

async function testAllTicketsSequentially() {
  console.log('🚀 Verarbeite alle Test-Tickets nacheinander\n');

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

  // Hole alle Test-Tickets
  const { data: tickets } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('user_id', testUserId)
    .in('status', ['new', 'investigating'])
    .order('created_at', { ascending: true });

  if (!tickets || tickets.length === 0) {
    console.error('❌ Keine Test-Tickets gefunden!');
    return;
  }

  console.log(`📋 Gefundene Test-Tickets: ${tickets.length}\n`);

  // Initialisiere Router einmal
  const logger = createMockLogger();
  const context = await createSupportContext(logger);
  const router = new SupportTicketRouter(context, logger);

  const results: TicketResult[] = [];

  // Verarbeite jedes Ticket
  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i];
    console.log(`\n[${i + 1}/${tickets.length}] Verarbeite: ${ticket.title}`);
    console.log(`   ID: ${ticket.id}`);
    console.log(`   Status: ${ticket.status}`);

    const startTime = Date.now();
    const initialStatus = ticket.status;

    // Hole initiale Events
    const { data: initialEvents } = await supabase
      .from('support_automation_events')
      .select('id')
      .eq('ticket_id', ticket.id);

    const initialEventCount = initialEvents?.length || 0;

    // Setze Ticket auf 'new' zurück
    if (ticket.status !== 'new') {
      await supabase
        .from('support_tickets')
        .update({ status: 'new' })
        .eq('id', ticket.id);
      ticket.status = 'new';
    }

    let success = false;
    let error: string | undefined;

    try {
      // Dispatch mit Timeout
      await Promise.race([
        router['dispatch']({ eventType: 'UPDATE', ticket: ticket as SupportTicket }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Dispatch timeout')), 120000)),
      ]);

      // Warte auf Verarbeitung
      await new Promise((resolve) => setTimeout(resolve, 30000));

      success = true;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      if (error === 'Dispatch timeout') {
        console.log(`   ⚠️  Timeout nach 120 Sekunden`);
      } else {
        console.log(`   ❌ Fehler: ${error}`);
      }
    }

    const duration = Date.now() - startTime;

    // Prüfe Ergebnis
    const { data: updatedTicket } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', ticket.id)
      .single();

    const { data: finalEvents } = await supabase
      .from('support_automation_events')
      .select('id')
      .eq('ticket_id', ticket.id);

    const finalEventCount = finalEvents?.length || 0;
    const newEventCount = finalEventCount - initialEventCount;

    const finalStatus = updatedTicket?.status || 'unbekannt';

    results.push({
      ticketId: ticket.id,
      title: ticket.title,
      success,
      duration,
      initialStatus,
      finalStatus,
      eventCount: newEventCount,
      error,
    });

    console.log(`   ✅ Abgeschlossen (${duration}ms)`);
    console.log(`   Status: ${finalStatus} (vorher: ${initialStatus})`);
    console.log(`   Neue Events: ${newEventCount}`);

    // Warte zwischen Tickets
    if (i < tickets.length - 1) {
      console.log(`   ⏳ Warte 10 Sekunden vor nächstem Ticket...`);
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  }

  // Zeige Zusammenfassung
  console.log('\n\n📊 Zusammenfassung:\n');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const processed = results.filter(r => r.finalStatus !== 'new' || r.eventCount > 0);
  
  console.log(`   Gesamt: ${results.length} Tickets`);
  console.log(`   ✅ Erfolgreich verarbeitet: ${successful.length}`);
  console.log(`   ❌ Fehlgeschlagen: ${failed.length}`);
  console.log(`   📋 Verarbeitet (Status geändert oder Events erstellt): ${processed.length}`);
  
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  console.log(`   ⏱️  Durchschnittliche Dauer: ${avgDuration.toFixed(0)}ms (${(avgDuration / 1000).toFixed(2)}s)`);
  
  console.log('\n📋 Detaillierte Ergebnisse:\n');
  for (const result of results) {
    const status = result.success ? '✅' : '❌';
    const processed = result.finalStatus !== 'new' || result.eventCount > 0 ? '📋' : '⏸️';
    console.log(`   ${status} ${processed} ${result.title}`);
    console.log(`      Dauer: ${result.duration}ms, Status: ${result.initialStatus} → ${result.finalStatus}, Events: ${result.eventCount}`);
    if (result.error) {
      console.log(`      Fehler: ${result.error}`);
    }
  }
  
  const successRate = (processed.length / results.length * 100).toFixed(1);
  console.log(`\n🎯 Erfolgsrate: ${successRate}% (${processed.length}/${results.length} Tickets verarbeitet)`);
}

testAllTicketsSequentially()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Fehler:', error);
    process.exit(1);
  });

