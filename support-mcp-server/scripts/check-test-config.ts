#!/usr/bin/env tsx
/**
 * Prüft die Test-Konfiguration (Env-Vars, etc.)
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { loadConfig } from '../src/services/config.js';

function loadEnv() {
  const envPaths = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '.env.local'),
    resolve(process.cwd(), '..', 'frontend', '.env.local'),
    resolve(process.cwd(), '..', '.env.local'),
  ];

  const loadedVars: string[] = [];

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
              loadedVars.push(key.trim());
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
            break;
          }
        }
      }
    } catch (error) {
      // Ignoriere Fehler
    }
  }

  return loadedVars;
}

function checkConfig() {
  console.log('🔍 Prüfe Test-Konfiguration...\n');

  // Lade Env-Vars
  const loadedVars = loadEnv();
  console.log(`📋 Geladene Environment-Variablen: ${loadedVars.length}\n`);

  // Prüfe kritische Variablen
  const requiredVars = [
    'SUPABASE_SERVICE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GROQ_API_KEY',
    'N8N_WEBHOOK_URL',
    'NEXT_PUBLIC_APP_URL',
  ];

  const optionalVars = [
    'OPENAI_API_KEY',
    'TELEGRAM_BOT_TOKEN',
    'TELEGRAM_CHAT_ID',
  ];

  console.log('✅ Erforderliche Variablen:\n');
  const missingRequired: string[] = [];
  const presentRequired: string[] = [];

  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value || value === 'PLACEHOLDER_VALUE') {
      console.log(`   ❌ ${varName}: FEHLT`);
      missingRequired.push(varName);
    } else {
      const displayValue = varName.includes('KEY') || varName.includes('TOKEN')
        ? `${value.substring(0, 8)}...`
        : value.length > 50
        ? `${value.substring(0, 50)}...`
        : value;
      console.log(`   ✅ ${varName}: ${displayValue}`);
      presentRequired.push(varName);
    }
  }

  console.log('\n📋 Optionale Variablen:\n');
  const missingOptional: string[] = [];
  const presentOptional: string[] = [];

  for (const varName of optionalVars) {
    const value = process.env[varName];
    if (!value || value === 'PLACEHOLDER_VALUE') {
      console.log(`   ⚠️  ${varName}: FEHLT (optional)`);
      missingOptional.push(varName);
    } else {
      const displayValue = varName.includes('KEY') || varName.includes('TOKEN')
        ? `${value.substring(0, 8)}...`
        : value.length > 50
        ? `${value.substring(0, 50)}...`
        : value;
      console.log(`   ✅ ${varName}: ${displayValue}`);
      presentOptional.push(varName);
    }
  }

  // Prüfe Config
  console.log('\n🔧 Prüfe Config-Validierung...\n');
  try {
    const config = loadConfig();
    console.log('✅ Config erfolgreich geladen:\n');
    console.log(`   Frontend Root: ${config.frontendRoot}`);
    console.log(`   Supabase URL: ${config.SUPABASE_SERVICE_URL?.substring(0, 30)}...`);
    console.log(`   Groq API Key: ${config.GROQ_API_KEY ? '✅ Vorhanden' : '❌ Fehlt'}`);
    console.log(`   N8N Webhook: ${config.N8N_WEBHOOK_URL ? '✅ Vorhanden' : '❌ Fehlt'}`);
    console.log(`   App URL: ${config.NEXT_PUBLIC_APP_URL ? '✅ Vorhanden' : '❌ Fehlt'}`);
  } catch (error) {
    console.error('❌ Fehler beim Laden der Config:', error);
    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);
    }
  }

  // Zusammenfassung
  console.log('\n📊 Zusammenfassung:\n');
  console.log(`   ✅ Vorhanden: ${presentRequired.length}/${requiredVars.length} erforderliche Variablen`);
  console.log(`   ❌ Fehlend: ${missingRequired.length} erforderliche Variablen`);
  console.log(`   ⚠️  Optional: ${presentOptional.length}/${optionalVars.length} optionale Variablen`);

  if (missingRequired.length > 0) {
    console.log('\n⚠️  FEHLENDE ERFORDERLICHE VARIABLEN:');
    for (const varName of missingRequired) {
      console.log(`   - ${varName}`);
    }
    console.log('\n💡 Diese Variablen müssen gesetzt werden, damit E2E-Tests funktionieren!');
  }

  // Prüfe spezifische Konfigurationen für verschiedene Ticket-Typen
  console.log('\n🎯 Ticket-spezifische Konfiguration:\n');

  const ticketConfigs = {
    'PDF-Upload': {
      required: ['GROQ_API_KEY'],
      optional: ['OPENAI_API_KEY'],
      description: 'Benötigt LLM für Problem-Erkennung',
    },
    'PM2-Restart': {
      required: ['N8N_WEBHOOK_URL'],
      optional: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'],
      description: 'Benötigt N8N für Hetzner-Commands',
    },
    'Stripe Payment': {
      required: ['GROQ_API_KEY'],
      optional: [],
      description: 'Benötigt LLM für Problem-Erkennung',
    },
    'Server offline': {
      required: ['N8N_WEBHOOK_URL'],
      optional: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID'],
      description: 'Benötigt N8N für Hetzner-Commands',
    },
  };

  for (const [ticketType, config] of Object.entries(ticketConfigs)) {
    console.log(`   ${ticketType}:`);
    console.log(`      ${config.description}`);
    
    const missing = config.required.filter(v => !process.env[v] || process.env[v] === 'PLACEHOLDER_VALUE');
    if (missing.length > 0) {
      console.log(`      ❌ Fehlend: ${missing.join(', ')}`);
    } else {
      console.log(`      ✅ Alle erforderlichen Variablen vorhanden`);
    }

    const presentOpt = config.optional.filter(v => process.env[v] && process.env[v] !== 'PLACEHOLDER_VALUE');
    if (presentOpt.length > 0) {
      console.log(`      ✅ Optionale Variablen: ${presentOpt.join(', ')}`);
    }
    console.log('');
  }

  // Empfehlungen
  console.log('\n💡 Empfehlungen:\n');
  
  if (missingRequired.length > 0) {
    console.log('   ⚠️  Setze fehlende erforderliche Variablen in .env.local');
  }

  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'PLACEHOLDER_VALUE') {
    console.log('   ⚠️  GROQ_API_KEY fehlt - LLM-basierte Problem-Erkennung wird nicht funktionieren');
  }

  if (!process.env.N8N_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL === 'PLACEHOLDER_VALUE') {
    console.log('   ⚠️  N8N_WEBHOOK_URL fehlt - Hetzner-Commands werden nicht funktionieren');
  }

  if (!process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN === 'PLACEHOLDER_VALUE') {
    console.log('   ⚠️  TELEGRAM_BOT_TOKEN fehlt - Telegram-Benachrichtigungen werden nicht funktionieren');
  }

  console.log('\n✅ Konfigurationsprüfung abgeschlossen!');
}

checkConfig();

