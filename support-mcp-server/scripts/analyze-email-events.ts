#!/usr/bin/env tsx
/**
 * Analysiert alle E-Mail-bezogenen Events in Supabase Auth
 * 
 * Prüft:
 * - User-Erstellungen (können E-Mails auslösen)
 * - Password-Reset-Anfragen
 * - Magic-Link-Anfragen
 * - E-Mail-Bestätigungen
 * - Alle Auth-Events der letzten 7 Tage
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
      
      if (!process.env.SUPABASE_SERVICE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL) {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL.trim().replace(/\/$/, '');
        process.env.SUPABASE_SERVICE_URL = url;
      }
      if (process.env.SUPABASE_SERVICE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        process.env.SUPABASE_SERVICE_URL = process.env.SUPABASE_SERVICE_URL.trim().replace(/\/$/, '');
        return;
      }
    } catch (error) {
      // Ignoriere Fehler
    }
  }

  if (!process.env.SUPABASE_SERVICE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Erforderliche Umgebungsvariablen (SUPABASE_SERVICE_URL, SUPABASE_SERVICE_ROLE_KEY) nicht gefunden!');
    process.exit(1);
  }
}

loadEnv();

interface EmailEvent {
  id: string;
  created_at: string;
  action: string;
  user_email?: string;
  user_id?: string;
  provider?: string;
  ip_address?: string;
}

async function analyzeEmailEvents() {
  console.log('🔍 Analysiere E-Mail-bezogene Events in Supabase Auth...\n');

  const config = loadConfig();
  const supabase = createSupportSupabase(config);

  // 1. Hole alle Auth-Events der letzten 7 Tage
  const { data: auditLogs, error: auditError } = await supabase
    .from('auth.audit_log_entries')
    .select('*')
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });

  if (auditError) {
    console.error('❌ Fehler beim Abrufen der Audit-Logs:', auditError);
    return;
  }

  console.log(`📋 Gesamtanzahl Auth-Events (letzte 7 Tage): ${auditLogs?.length || 0}\n`);

  // 2. Filtere E-Mail-bezogene Events
  const emailRelatedActions = [
    'user_signedup',
    'user_confirmed',
    'user_recovery_requested',
    'user_invited',
    'token_refreshed', // Kann bei Magic-Links relevant sein
  ];

  const emailEvents: EmailEvent[] = [];
  const userSignups: EmailEvent[] = [];
  const passwordResets: EmailEvent[] = [];
  const magicLinks: EmailEvent[] = [];

  auditLogs?.forEach((log: any) => {
    const payload = log.payload || {};
    const action = payload.action;

    if (emailRelatedActions.includes(action)) {
      const event: EmailEvent = {
        id: log.id,
        created_at: log.created_at,
        action,
        user_email: payload.traits?.user_email || payload.user_email,
        user_id: payload.traits?.user_id || payload.user_id || payload.actor_id,
        provider: payload.traits?.provider || payload.provider,
        ip_address: log.ip_address,
      };

      emailEvents.push(event);

      if (action === 'user_signedup') {
        userSignups.push(event);
      } else if (action === 'user_recovery_requested') {
        passwordResets.push(event);
      } else if (action === 'token_refreshed' && payload.provider === 'email') {
        magicLinks.push(event);
      }
    }
  });

  // 3. Analysiere User-Erstellungen
  console.log('📊 E-Mail-bezogene Events:\n');
  console.log(`  - User-Signups: ${userSignups.length}`);
  console.log(`  - Password-Resets: ${passwordResets.length}`);
  console.log(`  - Magic-Links: ${magicLinks.length}`);
  console.log(`  - Gesamt: ${emailEvents.length}\n`);

  // 4. Prüfe Test-User speziell
  console.log('👤 Test-User Analyse:\n');
  const testUserSignups = userSignups.filter(e => e.user_email === 'test-e2e@owona.de');
  console.log(`  - Signups von test-e2e@owona.de: ${testUserSignups.length}`);

  if (testUserSignups.length > 0) {
    testUserSignups.forEach((event, index) => {
      console.log(`\n  ${index + 1}. Signup Event:`);
      console.log(`     Zeitpunkt: ${new Date(event.created_at).toLocaleString('de-DE')}`);
      console.log(`     User ID: ${event.user_id}`);
      console.log(`     Provider: ${event.provider || 'N/A'}`);
    });
  }

  // 5. Prüfe ob User sofort bestätigt wurde
  const { data: testUser } = await supabase
    .from('auth.users')
    .select('id, email, created_at, email_confirmed_at, confirmed_at')
    .eq('email', 'test-e2e@owona.de')
    .maybeSingle();

  if (testUser) {
    console.log(`\n  ✅ Test-User gefunden:`);
    console.log(`     ID: ${testUser.id}`);
    console.log(`     Erstellt: ${new Date(testUser.created_at).toLocaleString('de-DE')}`);
    console.log(`     E-Mail bestätigt: ${testUser.email_confirmed_at ? '✅ Ja' : '❌ Nein'}`);
    console.log(`     Bestätigt am: ${testUser.email_confirmed_at ? new Date(testUser.email_confirmed_at).toLocaleString('de-DE') : 'N/A'}`);

    if (testUser.email_confirmed_at && new Date(testUser.email_confirmed_at).getTime() - new Date(testUser.created_at).getTime() < 1000) {
      console.log(`     ✅ User wurde sofort bestätigt - KEINE E-Mail sollte gesendet worden sein`);
    } else if (!testUser.email_confirmed_at) {
      console.log(`     ⚠️  User ist NICHT bestätigt - möglicherweise wurde eine E-Mail gesendet`);
    }
  }

  // 6. Zeige alle User-Erstellungen der letzten 7 Tage
  console.log('\n📋 Alle User-Signups (letzte 7 Tage):\n');
  if (userSignups.length === 0) {
    console.log('  ✅ Keine User-Signups in den letzten 7 Tagen');
  } else {
    userSignups.forEach((event, index) => {
      console.log(`  ${index + 1}. ${event.user_email || 'N/A'}`);
      console.log(`     Zeitpunkt: ${new Date(event.created_at).toLocaleString('de-DE')}`);
      console.log(`     Provider: ${event.provider || 'N/A'}`);
      console.log(`     User ID: ${event.user_id || 'N/A'}`);
      console.log('');
    });
  }

  // 7. Zeige Password-Reset-Anfragen
  console.log('\n🔐 Password-Reset-Anfragen (letzte 7 Tage):\n');
  if (passwordResets.length === 0) {
    console.log('  ✅ Keine Password-Reset-Anfragen in den letzten 7 Tagen');
  } else {
    passwordResets.forEach((event, index) => {
      console.log(`  ${index + 1}. ${event.user_email || 'N/A'}`);
      console.log(`     Zeitpunkt: ${new Date(event.created_at).toLocaleString('de-DE')}`);
      console.log(`     ⚠️  Diese Anfrage könnte eine E-Mail ausgelöst haben`);
      console.log('');
    });
  }

  // 8. Zusammenfassung
  console.log('\n📊 Zusammenfassung:\n');
  console.log(`  ✅ Test-User Signups: ${testUserSignups.length}`);
  console.log(`  ${testUserSignups.length === 0 ? '✅' : '⚠️ '} Test-User sollte KEINE E-Mails auslösen`);
  console.log(`  ${passwordResets.length === 0 ? '✅' : '⚠️ '} Password-Resets: ${passwordResets.length}`);
  console.log(`  ${magicLinks.length === 0 ? '✅' : '⚠️ '} Magic-Links: ${magicLinks.length}`);

  // 9. Empfehlungen
  console.log('\n💡 Empfehlungen:\n');
  if (testUserSignups.length > 0) {
    console.log('  ⚠️  Test-User wurde erstellt - prüfe ob email_confirm: true verwendet wurde');
  }
  if (passwordResets.length > 0) {
    console.log('  ⚠️  Password-Reset-Anfragen gefunden - diese lösen E-Mails aus');
  }
  if (magicLinks.length > 0) {
    console.log('  ⚠️  Magic-Link-Anfragen gefunden - diese lösen E-Mails aus');
  }
  if (testUserSignups.length === 0 && passwordResets.length === 0 && magicLinks.length === 0) {
    console.log('  ✅ Keine E-Mail-auslösenden Events für Test-User gefunden');
  }

  console.log('\n✅ E-Mail-Event-Analyse abgeschlossen!');
}

(async () => {
  await analyzeEmailEvents();
})();
