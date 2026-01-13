#!/usr/bin/env tsx
/**
 * Prüft die Knowledge Base und zeigt, welche Dokumente vorhanden sind
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createSupportSupabase } from '../src/services/supabaseClient.js';
import { loadConfig } from '../src/services/config.js';
import { KnowledgeBase } from '../src/services/knowledgeBase.js';
import { createMockLogger } from '../src/services/actions/__tests__/setup.js';

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

async function checkKnowledgeBase() {
  console.log('🔍 Prüfe Knowledge Base...\n');

  const config = loadConfig();
  const supabase = createSupportSupabase(config);
  const logger = createMockLogger();
  const knowledgeBase = new KnowledgeBase(config, logger, supabase);

  console.log('📚 Lade Knowledge Base...');
  const loadStartTime = Date.now();
  await knowledgeBase.load();
  const loadDuration = Date.now() - loadStartTime;
  console.log(`✅ Knowledge Base geladen (${loadDuration}ms)\n`);

  // Prüfe Dokumente
  const documents = (knowledgeBase as any).documents || [];
  console.log(`📋 Dokumente gefunden: ${documents.length}\n`);

  if (documents.length === 0) {
    console.log('⚠️  KEINE DOKUMENTE GEFUNDEN! Das könnte das Problem sein.\n');
    console.log('💡 Mögliche Ursachen:');
    console.log('   - Knowledge Base Verzeichnis ist leer');
    console.log('   - Supabase Tabelle ist leer');
    console.log('   - Konfiguration zeigt auf falsches Verzeichnis\n');
    return;
  }

  // Zeige erste 10 Dokumente
  console.log('📄 Erste 10 Dokumente:');
  for (let i = 0; i < Math.min(10, documents.length); i++) {
    const doc = documents[i];
    console.log(`\n   ${i + 1}. ${doc.title}`);
    console.log(`      ID: ${doc.id}`);
    console.log(`      Pfad: ${doc.path}`);
    console.log(`      Länge: ${doc.content.length} Zeichen`);
  }

  // Teste Query
  console.log('\n\n🔍 Teste Queries:\n');
  const testQueries = [
    'PDF upload',
    'payment checkout',
    'PM2 restart',
    'environment variable',
    'API endpoint',
  ];

  for (const query of testQueries) {
    const results = knowledgeBase.query(query, 3);
    console.log(`   "${query}": ${results.length} Ergebnisse`);
    if (results.length > 0) {
      results.forEach((doc, idx) => {
        console.log(`      ${idx + 1}. ${doc.title}`);
      });
    }
  }

  // Prüfe Supabase
  console.log('\n\n🗄️  Prüfe Supabase Reverse Engineering Dokumente:\n');
  const possibleTables = [
    'support_reverse_engineering',
    'support_knowledge',
    'reverse_engineering_docs',
    'knowledge_documents',
  ];

  for (const tableName of possibleTables) {
    const { data, error } = await supabase
      .from(tableName)
      .select('id, title, created_at')
      .limit(5);

    if (!error && data && data.length > 0) {
      console.log(`   ✅ Tabelle "${tableName}": ${data.length} Dokumente gefunden`);
      data.forEach((doc: any) => {
        console.log(`      - ${doc.title || doc.id} (${doc.created_at})`);
      });
    } else if (error) {
      console.log(`   ❌ Tabelle "${tableName}": ${error.message}`);
    } else {
      console.log(`   ⚠️  Tabelle "${tableName}": Keine Dokumente`);
    }
  }
}

checkKnowledgeBase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Fehler:', error);
    process.exit(1);
  });

