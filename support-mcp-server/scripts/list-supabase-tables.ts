/**
 * Listet alle Supabase-Tabellen auf
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createSupportContext } from '../src/services/supportContext.js';
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

async function main() {
  const logger = createLogger();
  console.log('📋 LISTE SUPABASE-TABELLEN\n');

  try {
    const context = await createSupportContext(logger);

    // Versuche verschiedene Methoden, um Tabellen zu finden
    console.log('1️⃣  Versuche über information_schema...\n');
    
    const { data: tables, error } = await context.supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');

    if (error) {
      console.log(`   ⚠️  information_schema nicht verfügbar: ${error.message}\n`);
    } else if (tables && tables.length > 0) {
      console.log(`   ✅ ${tables.length} Tabellen gefunden:\n`);
      tables.forEach((t: any) => {
        console.log(`      - ${t.table_name}`);
      });
    } else {
      console.log('   ⚠️  Keine Tabellen gefunden\n');
    }

    // Prüfe spezifische Tabellen, die für Reverse Engineering relevant sein könnten
    console.log('\n2️⃣  Prüfe spezifische Tabellen...\n');
    
    const possibleTables = [
      'support_knowledge',
      'reverse_engineering_docs',
      'knowledge_documents',
      'support_reverse_engineering',
      'support_knowledge_base',
      'knowledge_base',
      'reverse_engineering',
    ];

    for (const tableName of possibleTables) {
      const { data, error: tableError } = await context.supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (!tableError && data !== null) {
        console.log(`   ✅ Tabelle existiert: ${tableName}`);
        console.log(`      Anzahl Einträge: ${data.length}`);
        if (data.length > 0) {
          console.log(`      Spalten: ${Object.keys(data[0]).join(', ')}`);
        }
      } else {
        console.log(`   ❌ Tabelle nicht gefunden: ${tableName} (${tableError?.message || 'nicht vorhanden'})`);
      }
    }

    // Prüfe support_tickets für Metadaten
    console.log('\n3️⃣  Prüfe support_tickets für Metadaten...\n');
    const { data: tickets } = await context.supabase
      .from('support_tickets')
      .select('source_metadata')
      .limit(5);

    if (tickets && tickets.length > 0) {
      console.log(`   ✅ support_tickets gefunden`);
      console.log(`      Beispiel-Metadaten: ${JSON.stringify(tickets[0]?.source_metadata, null, 2)}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ FEHLER:', error);
    process.exit(1);
  }
}

main();




