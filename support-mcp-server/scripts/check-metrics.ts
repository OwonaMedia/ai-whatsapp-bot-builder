#!/usr/bin/env tsx
/**
 * Prüft Metriken für E2E-Test-Tickets
 * 
 * Zeigt:
 * - Problem-Erkennungs-Rate
 * - Fix-Generierungs-Rate
 * - Fix-Erfolgs-Rate
 * - False-Positive-Rate
 * - Durchschnittliche Verarbeitungszeit
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createSupportSupabase } from '../src/services/supabaseClient.js';
import { loadConfig } from '../src/services/config.js';
import { MetricsTracker } from '../src/utils/metricsTracker.js';
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

async function checkMetrics() {
  console.log('📊 Prüfe Metriken für E2E-Test-Tickets...\n');

  const config = loadConfig();
  const supabase = createSupportSupabase(config);
  const logger = createLogger();
  const metricsTracker = new MetricsTracker(supabase, logger);

  // Hole Test-User ID
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const testUser = authUsers?.users?.find(u => u.email === 'test-e2e@owona.de');
  
  if (!testUser) {
    console.error('❌ Test-User nicht gefunden!');
    process.exit(1);
  }

  // Hole alle E2E-Test-Tickets
  const { data: tickets } = await supabase
    .from('support_tickets')
    .select('id, title, status')
    .eq('user_id', testUser.id)
    .order('created_at', 'desc')
    .limit(10);

  if (!tickets || tickets.length === 0) {
    console.log('⚠️  Keine Test-Tickets gefunden!');
    console.log('💡 Führe zuerst aus: npx tsx scripts/create-e2e-test-tickets.ts');
    process.exit(0);
  }

  console.log(`📋 Gefundene Test-Tickets: ${tickets.length}\n`);

  // Prüfe Metriken für letzte 24 Stunden
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);

  const metrics = await metricsTracker.calculateSuccessRateMetrics(startDate, endDate);

  console.log('📈 Erfolgsquote-Metriken (letzte 24 Stunden):\n');
  console.log(`  Problem-Erkennungs-Rate: ${(metrics.problemDetectionRate * 100).toFixed(2)}%`);
  console.log(`  Fix-Generierungs-Rate: ${(metrics.fixGenerationRate * 100).toFixed(2)}%`);
  console.log(`  Fix-Erfolgs-Rate: ${(metrics.fixSuccessRate * 100).toFixed(2)}%`);
  console.log(`  False-Positive-Rate: ${(metrics.falsePositiveRate * 100).toFixed(2)}%`);
  console.log(`  False-Negative-Rate: ${(metrics.falseNegativeRate * 100).toFixed(2)}%`);
  console.log(`  Durchschnittliche Verarbeitungszeit: ${metrics.averageProcessingTime.toFixed(0)}ms`);
  console.log(`  Gesamt-Tickets: ${metrics.totalTickets}\n`);

  // Prüfe ob Metriken-Tabelle existiert
  const { data: tableExists } = await supabase
    .from('problem_diagnosis_metrics')
    .select('id')
    .limit(1);

  if (!tableExists) {
    console.log('⚠️  Metriken-Tabelle existiert noch nicht!');
    console.log('💡 Führe die Migration aus: npx tsx migrations/create_problem_diagnosis_metrics.sql');
    console.log('   Oder warte, bis Tickets verarbeitet wurden (Metriken werden automatisch erstellt).\n');
  } else {
    // Hole detaillierte Metriken für Test-Tickets
    const ticketIds = tickets.map(t => t.id);
    const { data: ticketMetrics } = await supabase
      .from('problem_diagnosis_metrics')
      .select('*')
      .in('ticket_id', ticketIds)
      .order('created_at', { ascending: false });

    if (ticketMetrics && ticketMetrics.length > 0) {
      console.log(`📊 Detaillierte Metriken für ${ticketMetrics.length} verarbeitete Tickets:\n`);
      
      for (const metric of ticketMetrics.slice(0, 5)) {
        const ticket = tickets.find(t => t.id === metric.ticket_id);
        console.log(`  Ticket: ${ticket?.title || metric.ticket_id}`);
        console.log(`    Problem erkannt: ${metric.problem_detected ? '✅' : '❌'}`);
        console.log(`    Problem-Typ: ${metric.problem_type || 'N/A'}`);
        console.log(`    Detection-Methode: ${metric.detection_method || 'N/A'}`);
        console.log(`    Fix generiert: ${metric.fix_generated ? '✅' : '❌'}`);
        console.log(`    Fix erfolgreich: ${metric.fix_success ? '✅' : '❌'}`);
        console.log(`    Post-Fix-Verifikation: ${metric.post_fix_verification_passed ? '✅' : '❌'}`);
        console.log(`    Verarbeitungszeit: ${metric.total_processing_time || 0}ms`);
        console.log('');
      }
    } else {
      console.log('⚠️  Noch keine Metriken für Test-Tickets vorhanden.');
      console.log('💡 Warte, bis Tickets verarbeitet wurden, oder führe E2E-Tests aus.\n');
    }
  }

  // Zeige Ticket-Status
  console.log('📋 Ticket-Status:\n');
  for (const ticket of tickets) {
    const statusIcon = ticket.status === 'new' ? '🆕' : 
                      ticket.status === 'investigating' ? '🔍' :
                      ticket.status === 'resolved' ? '✅' : '📝';
    console.log(`  ${statusIcon} ${ticket.title} (${ticket.status})`);
  }

  console.log('\n✅ Metriken-Prüfung abgeschlossen!');
}

checkMetrics()
  .then(() => {
    console.log('\n🎉 Fertig!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fehler:', error);
    process.exit(1);
  });

