#!/usr/bin/env tsx
/**
 * Debug-Script: Analysiert warum ein Ticket nicht verarbeitet wird
 * 
 * Führt die gleichen Schritte wie der E2E-Test aus, aber mit detailliertem Logging
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

async function debugTicketProcessing() {
  console.log('🔍 Debug: Ticket-Verarbeitung analysieren...\n');

  const config = loadConfig();
  const supabase = createSupportSupabase(config);

  // Hole Test-Ticket
  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('title', 'Stripe Payment schlägt fehl')
    .eq('status', 'new')
    .maybeSingle();

  if (!ticket) {
    console.error('❌ Ticket nicht gefunden!');
    process.exit(1);
  }

  console.log(`✅ Ticket gefunden: ${ticket.id}`);
  console.log(`   Titel: ${ticket.title}`);
  console.log(`   Status: ${ticket.status}`);
  console.log(`   Beschreibung: ${ticket.description?.substring(0, 100)}...\n`);

  const logger = createMockLogger();
  const context = await createSupportContext(logger);
  const router = new SupportTicketRouter(context, logger);

  // Erweitertes Logging
  const originalDebugLog = (router as any).debugLog;
  let stepCount = 0;
  const steps: Array<{ time: number; step: string; duration?: number }> = [];

  (router as any).debugLog = (label: string, payload?: Record<string, unknown>) => {
    const now = Date.now();
    const lastStep = steps[steps.length - 1];
    if (lastStep) {
      lastStep.duration = now - lastStep.time;
    }
    steps.push({ time: now, step: label });
    console.log(`[${++stepCount}] ${label}`, payload ? JSON.stringify(payload, null, 2) : '');
    originalDebugLog.call(router, label, payload);
  };

  console.log('🚀 Starte Ticket-Verarbeitung...\n');
  const startTime = Date.now();

  try {
    // Setze Timeout für den gesamten Prozess
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout nach 60 Sekunden')), 60000);
    });

    await Promise.race([
      router['dispatch']({ eventType: 'UPDATE', ticket: ticket as SupportTicket }),
      timeoutPromise,
    ]);

    const duration = Date.now() - startTime;
    console.log(`\n✅ Verarbeitung abgeschlossen in ${duration}ms\n`);

    // Prüfe Ticket-Status
    const { data: updatedTicket } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', ticket.id)
      .single();

    console.log('📊 Ticket-Status nach Verarbeitung:');
    console.log(`   Status: ${updatedTicket?.status}`);
    console.log(`   Assigned Agent: ${updatedTicket?.assigned_agent || 'null'}`);
    console.log(`   Updated At: ${updatedTicket?.updated_at}\n`);

    // Prüfe Automation-Events
    const { data: events } = await supabase
      .from('support_automation_events')
      .select('*')
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: false })
      .limit(5);

    console.log(`📋 Automation-Events: ${events?.length || 0}`);
    if (events && events.length > 0) {
      events.forEach((event, index) => {
        console.log(`   ${index + 1}. ${event.action_type} (${event.created_at})`);
      });
    }

    // Zeige Schritt-Zeitanalyse
    console.log('\n⏱️  Schritt-Zeitanalyse:');
    steps.forEach((step, index) => {
      if (step.duration) {
        console.log(`   ${index}. ${step.step}: ${step.duration}ms`);
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`\n❌ Fehler nach ${duration}ms:`, error);
    
    if (error instanceof Error && error.message.includes('Timeout')) {
      console.log('\n🔍 Timeout-Analyse:');
      console.log('   Der Prozess hat länger als 60 Sekunden gedauert.');
      console.log('   Mögliche Ursachen:');
      console.log('   1. Reverse Engineering Analyzer scannt zu viele Dateien');
      console.log('   2. LLM-Aufruf dauert zu lange (GROQ_API_KEY fehlt?)');
      console.log('   3. Problem-Verifikation dauert zu lange');
      console.log('   4. Wartet auf Telegram-Approval (N8N_WEBHOOK_URL fehlt?)');
      
      console.log('\n📋 Letzte Schritte vor Timeout:');
      steps.slice(-5).forEach((step, index) => {
        console.log(`   ${steps.length - 5 + index}. ${step.step}`);
      });
    }
  }
}

debugTicketProcessing()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fehler:', error);
    process.exit(1);
  });

