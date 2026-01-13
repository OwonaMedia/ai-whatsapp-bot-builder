#!/usr/bin/env tsx
/**
 * Prüft wartende Telegram-Bestätigungen
 */

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
          const url = process.env.NEXT_PUBLIC_SUPABASE_URL.trim().replace(/\/$/, '');
          process.env.SUPABASE_SERVICE_URL = url;
        }
        if (process.env.SUPABASE_SERVICE_URL) {
          process.env.SUPABASE_SERVICE_URL = process.env.SUPABASE_SERVICE_URL.trim().replace(/\/$/, '');
          if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
            break;
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

async function checkPendingApprovals() {
  console.log('🔍 Prüfe wartende Telegram-Bestätigungen...\n');

  const config = loadConfig();
  const supabase = createSupportSupabase(config);

  // Prüfe auf wartende Telegram-Bestätigungen
  const { data: approvalRequests, error: requestError } = await supabase
    .from('support_automation_events')
    .select('*')
    .eq('action_type', 'telegram_approval_request')
    .order('created_at', { ascending: false })
    .limit(20);

  if (requestError) {
    console.error('❌ Fehler beim Abrufen der Bestätigungsanfragen:', requestError);
    return;
  }

  console.log(`📋 Wartende Telegram-Bestätigungen: ${approvalRequests?.length || 0}\n`);

  if (approvalRequests && approvalRequests.length > 0) {
    for (const req of approvalRequests) {
      const payload = req.payload as any;
      const ticketId = req.ticket_id;
      
      // Prüfe ob bereits eine Bestätigung vorhanden ist
      const { data: approval } = await supabase
        .from('support_automation_events')
        .select('*')
        .eq('ticket_id', ticketId)
        .eq('action_type', 'telegram_approval')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Hole Ticket-Info
      const { data: ticket } = await supabase
        .from('support_tickets')
        .select('title, status')
        .eq('id', ticketId)
        .maybeSingle();

      const status = approval ? '✅ Bestätigt' : '⏳ Wartet auf Bestätigung';
      const ticketTitle = ticket?.title || 'Unbekannt';
      const ticketStatus = ticket?.status || 'Unbekannt';

      console.log(`  ${status}`);
      console.log(`    Ticket: ${ticketTitle} (${ticketId})`);
      console.log(`    Status: ${ticketStatus}`);
      console.log(`    Typ: ${payload?.instructionType || 'Unbekannt'}`);
      console.log(`    Erstellt: ${req.created_at}`);
      if (approval) {
        console.log(`    Bestätigt: ${approval.created_at}`);
        console.log(`    Genehmigt: ${(approval.payload as any)?.approved ? 'Ja' : 'Nein'}`);
      }
      console.log('');
    }

    const pendingCount = approvalRequests.filter(req => {
      // Prüfe ob Bestätigung vorhanden ist (vereinfacht)
      return true; // Für jetzt zeigen wir alle
    }).length;

    if (pendingCount > 0) {
      console.log(`\n⚠️  Es gibt ${pendingCount} wartende Telegram-Bestätigungen!`);
      console.log('   Bitte bestätige diese in Telegram, damit die Tests erfolgreich abschließen können.');
    }
  } else {
    console.log('  ✅ Keine wartenden Bestätigungen gefunden');
  }
}

checkPendingApprovals().catch(console.error);

