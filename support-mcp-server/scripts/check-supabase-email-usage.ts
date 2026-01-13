#!/usr/bin/env tsx
/**
 * Prüft Supabase E-Mail-Versand und User-Erstellungen
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

async function checkSupabaseEmailUsage() {
  console.log('🔍 Prüfe Supabase E-Mail-Versand und User-Erstellungen...\n');

  const config = loadConfig();
  const supabase = createSupportSupabase(config);

  // 1. Prüfe alle Auth-User
  console.log('📋 Prüfe Auth-User...\n');
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error('❌ Fehler beim Abrufen der Auth-User:', authError);
    return;
  }

  if (!authUsers?.users) {
    console.log('⚠️  Keine Auth-User gefunden');
    return;
  }

  console.log(`📊 Gesamt Auth-User: ${authUsers.users.length}\n`);

  // Prüfe test-e2e@owona.de User
  const testE2EUsers = authUsers.users.filter(u => u.email === 'test-e2e@owona.de');
  console.log(`🔍 test-e2e@owona.de User: ${testE2EUsers.length}`);
  if (testE2EUsers.length > 1) {
    console.log(`⚠️  WARNUNG: Mehrere test-e2e@owona.de User gefunden!`);
    console.log(`   Das Script wurde möglicherweise mehrmals ausgeführt.`);
    testE2EUsers.forEach((user, idx) => {
      console.log(`   ${idx + 1}. ID: ${user.id}, Erstellt: ${user.created_at}`);
    });
  }
  console.log('');

  // Prüfe alle @owona.de User
  const owonaUsers = authUsers.users.filter(u => u.email?.includes('@owona.de'));
  console.log(`📧 @owona.de User: ${owonaUsers.length}`);
  owonaUsers.forEach((user) => {
    console.log(`   - ${user.email} (ID: ${user.id}, Erstellt: ${user.created_at})`);
  });
  console.log('');

  // 2. Prüfe User-Erstellungen in den letzten 24 Stunden
  console.log('📅 User-Erstellungen in den letzten 24 Stunden:\n');
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentUsers = authUsers.users.filter(u => {
    const createdAt = new Date(u.created_at);
    return createdAt >= last24Hours;
  });
  console.log(`   Anzahl: ${recentUsers.length}`);
  recentUsers.forEach((user) => {
    console.log(`   - ${user.email} (Erstellt: ${user.created_at})`);
  });
  console.log('');

  // 3. Prüfe Support-Tickets mit test-e2e@owona.de
  console.log('🎫 Support-Tickets für test-e2e@owona.de:\n');
  const testUserId = testE2EUsers[0]?.id;
  if (testUserId) {
    const { data: tickets, error: ticketsError } = await supabase
      .from('support_tickets')
      .select('id, title, created_at')
      .eq('user_id', testUserId)
      .order('created_at', { ascending: false });

    if (ticketsError) {
      console.error('❌ Fehler beim Abrufen der Tickets:', ticketsError);
    } else {
      console.log(`   Anzahl: ${tickets?.length || 0}`);
      if (tickets && tickets.length > 0) {
        console.log(`   Erste 5 Tickets:`);
        tickets.slice(0, 5).forEach((ticket) => {
          console.log(`   - ${ticket.title} (${ticket.created_at})`);
        });
      }
    }
  }
  console.log('');

  // 4. Prüfe Supabase-Konfiguration (soweit möglich)
  console.log('⚙️  Supabase-Konfiguration:\n');
  console.log(`   Project URL: ${config.SUPABASE_SERVICE_URL?.substring(0, 30)}...`);
  console.log(`   Service Role Key: ${config.SUPABASE_SERVICE_ROLE_KEY ? '✅ Vorhanden' : '❌ Fehlt'}`);
  console.log('');

  // 5. Empfehlungen
  console.log('💡 Empfehlungen:\n');
  if (testE2EUsers.length > 1) {
    console.log('   ⚠️  Mehrere test-e2e@owona.de User gefunden:');
    console.log('      - Lösche doppelte User in Supabase Dashboard');
    console.log('      - Stelle sicher, dass das Script nur einmal ausgeführt wird');
  }
  console.log('   📧 Supabase E-Mail-Versand:');
  console.log('      - Prüfe Supabase Dashboard → Authentication → Email Templates');
  console.log('      - Prüfe welche Absender-Adresse konfiguriert ist');
  console.log('      - Prüfe ob Rate-Limiting aktiviert ist');
  console.log('      - Prüfe Auth Logs für E-Mail-Versand-Statistiken');
  console.log('');
  console.log('   🔒 E-Mail-Versand deaktivieren für Test-User:');
  console.log('      - Verwende email_confirm: true (bereits implementiert)');
  console.log('      - Oder: Deaktiviere E-Mail-Templates in Supabase Dashboard');
  console.log('      - Oder: Verwende eigene SMTP-Konfiguration mit Rate-Limiting');
}

checkSupabaseEmailUsage()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Fehler:', error);
    process.exit(1);
  });

