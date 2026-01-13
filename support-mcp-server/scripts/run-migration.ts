#!/usr/bin/env tsx
/**
 * Führt die problem_diagnosis_metrics Migration aus
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createSupportSupabase } from '../src/services/supabaseClient.js';
import { loadConfig } from '../src/services/config.js';

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

async function runMigration() {
  console.log('🚀 Führe Migration aus...\n');

  const config = loadConfig();
  const supabase = createSupportSupabase(config);

  // Lese SQL-Datei
  const sqlPath = resolve(process.cwd(), 'migrations', 'create_problem_diagnosis_metrics.sql');
  const sql = readFileSync(sqlPath, 'utf-8');

  // Führe SQL-Statements aus (Supabase unterstützt keine direkte SQL-Ausführung über Client)
  // Wir müssen die Statements einzeln ausführen
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`📝 Führe ${statements.length} SQL-Statements aus...\n`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (statement.includes('CREATE TABLE') || statement.includes('CREATE INDEX') || statement.includes('ALTER TABLE') || statement.includes('CREATE POLICY')) {
      try {
        // Verwende Supabase RPC für SQL-Ausführung (falls verfügbar)
        // Oder verwende direkte SQL-Ausführung über Postgres
        console.log(`  ${i + 1}. Führe Statement aus...`);
        // Supabase Client unterstützt keine direkte SQL-Ausführung
        // Migration muss manuell in Supabase Dashboard ausgeführt werden
        console.log(`     ⚠️  Statement muss manuell in Supabase ausgeführt werden`);
      } catch (error) {
        console.error(`     ❌ Fehler bei Statement ${i + 1}:`, error);
      }
    }
  }

  console.log('\n⚠️  Supabase Client unterstützt keine direkte SQL-Ausführung.');
  console.log('💡 Bitte führe die Migration manuell in Supabase Dashboard aus:');
  console.log('   1. Öffne Supabase Dashboard');
  console.log('   2. Gehe zu SQL Editor');
  console.log('   3. Kopiere den Inhalt von migrations/create_problem_diagnosis_metrics.sql');
  console.log('   4. Führe das SQL aus\n');

  // Prüfe ob Tabelle bereits existiert
  const { data: tableCheck, error: checkError } = await supabase
    .from('problem_diagnosis_metrics')
    .select('id')
    .limit(1);

  if (!checkError && tableCheck !== null) {
    console.log('✅ Tabelle problem_diagnosis_metrics existiert bereits!');
  } else {
    console.log('❌ Tabelle problem_diagnosis_metrics existiert noch nicht.');
    console.log('   Bitte führe die Migration manuell aus.\n');
  }
}

runMigration()
  .then(() => {
    console.log('🎉 Fertig!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fehler:', error);
    process.exit(1);
  });

