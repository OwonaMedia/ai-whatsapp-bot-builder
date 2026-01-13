#!/usr/bin/env tsx
/**
 * Räumt alte Test-User auf
 * 
 * Bestätigt oder löscht alte nicht bestätigte Test-User,
 * um E-Mail-Versand zu verhindern.
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

async function cleanupOldTestUsers() {
  console.log('🧹 Räume alte Test-User auf...\n');

  const config = loadConfig();
  const supabase = createSupportSupabase(config);

  // 1. Hole alle nicht bestätigten Test-User
  const { data: unconfirmedUsers, error: fetchError } = await supabase
    .from('auth.users')
    .select('id, email, created_at, email_confirmed_at')
    .like('email', '%@owona.de')
    .is('email_confirmed_at', null)
    .order('created_at', { ascending: true });

  if (fetchError) {
    console.error('❌ Fehler beim Abrufen der User:', fetchError);
    return;
  }

  if (!unconfirmedUsers || unconfirmedUsers.length === 0) {
    console.log('✅ Keine nicht bestätigten Test-User gefunden!');
    return;
  }

  console.log(`📋 Gefundene nicht bestätigte User: ${unconfirmedUsers.length}\n`);

  // 2. Bestätige alle User (um E-Mail-Versand zu verhindern)
  const confirmedUsers: string[] = [];
  const failedUsers: string[] = [];

  for (const user of unconfirmedUsers) {
    const daysSinceCreation = Math.floor(
      (Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    console.log(`  📧 ${user.email}`);
    console.log(`     Erstellt: ${new Date(user.created_at).toLocaleString('de-DE')} (vor ${daysSinceCreation} Tagen)`);
    console.log(`     Status: ❌ Nicht bestätigt`);

    // Bestätige User über Admin API
    const { error: confirmError } = await supabase.auth.admin.updateUserById(user.id, {
      email_confirm: true,
    });

    if (confirmError) {
      console.log(`     ❌ Fehler beim Bestätigen: ${confirmError.message}`);
      failedUsers.push(user.email);
    } else {
      console.log(`     ✅ User bestätigt - KEINE weitere E-Mail wird gesendet`);
      confirmedUsers.push(user.email);
    }
    console.log('');
  }

  // 3. Zusammenfassung
  console.log('\n📊 Zusammenfassung:\n');
  console.log(`  ✅ Bestätigt: ${confirmedUsers.length} User`);
  console.log(`  ❌ Fehler: ${failedUsers.length} User`);

  if (confirmedUsers.length > 0) {
    console.log('\n✅ Bestätigte User:');
    confirmedUsers.forEach(email => console.log(`  - ${email}`));
  }

  if (failedUsers.length > 0) {
    console.log('\n❌ Fehlerhafte User:');
    failedUsers.forEach(email => console.log(`  - ${email}`));
  }

  // 4. Verifiziere Ergebnis
  console.log('\n🔍 Verifiziere Ergebnis...\n');
  const { data: allUsers } = await supabase
    .from('auth.users')
    .select('id, email, email_confirmed_at')
    .like('email', '%@owona.de')
    .order('created_at', { ascending: false });

  if (allUsers) {
    const stillUnconfirmed = allUsers.filter(u => !u.email_confirmed_at);
    if (stillUnconfirmed.length === 0) {
      console.log('✅ Alle Test-User sind jetzt bestätigt!');
    } else {
      console.log(`⚠️  ${stillUnconfirmed.length} User sind immer noch nicht bestätigt:`);
      stillUnconfirmed.forEach(u => console.log(`  - ${u.email}`));
    }
  }

  console.log('\n✅ Cleanup abgeschlossen!');
}

(async () => {
  await cleanupOldTestUsers();
})();

