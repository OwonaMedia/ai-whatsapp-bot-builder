#!/usr/bin/env tsx
/**
 * Prüft Status der E2E-Test-Tickets
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
          // Entferne trailing slash für URL-Validierung
          const url = process.env.NEXT_PUBLIC_SUPABASE_URL.trim().replace(/\/$/, '');
          process.env.SUPABASE_SERVICE_URL = url;
        }
        // Stelle sicher, dass die URL korrekt formatiert ist (ohne trailing slash)
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

async function checkTestTickets() {
  console.log('🔍 Prüfe E2E-Test-Tickets...\n');

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
  ];

  console.log('📋 Suche nach Test-Tickets...\n');

  for (const title of testTitles) {
    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .select('id, title, status, user_id, created_at')
      .eq('title', title)
      .maybeSingle();

    if (error) {
      console.error(`❌ Fehler bei "${title}":`, error);
      continue;
    }

    if (ticket) {
      console.log(`✅ ${title}`);
      console.log(`   ID: ${ticket.id}`);
      console.log(`   Status: ${ticket.status}`);
      console.log(`   User ID: ${ticket.user_id}`);
      console.log(`   Erstellt: ${ticket.created_at}`);
      console.log('');
    } else {
      console.log(`❌ "${title}" - nicht gefunden`);
    }
  }

  // Prüfe alle Test-User
  console.log('\n👥 Prüfe Test-User...\n');
  const { data: users } = await supabase.auth.admin.listUsers();
  const testUsers = users?.users?.filter(u => u.email?.includes('test-e2e') || u.email?.includes('test'));
  
  if (testUsers && testUsers.length > 0) {
    console.log(`📋 Gefundene Test-User: ${testUsers.length}\n`);
    for (const user of testUsers) {
      console.log(`  - ${user.email}: ${user.id}`);
    }
  } else {
    console.log('⚠️  Keine Test-User gefunden');
  }
}

checkTestTickets()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fehler:', error);
    process.exit(1);
  });

