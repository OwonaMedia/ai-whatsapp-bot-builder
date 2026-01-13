#!/usr/bin/env tsx
/**
 * Erstellt ein Test-Ticket für die Agent-basierte Reverse Engineering Lösung
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

async function createTestTicket() {
  const logger = createLogger();
  const context = await createSupportContext(logger);
  const supabase = context.supabase;
  
  // Hole einen User aus auth.users (falls vorhanden)
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  
  let userId: string | null = null;
  
  if (authUsers && authUsers.users && authUsers.users.length > 0) {
    userId = authUsers.users[0].id;
  } else {
    // Fallback: Verwende einen Test-UUID (wird von RLS ignoriert, da Service Role Key verwendet wird)
    userId = '00000000-0000-0000-0000-000000000000';
    console.log('⚠️  Kein User gefunden, verwende Test-UUID (Service Role Key umgeht RLS)');
  }

  const testTicket = {
    title: 'Test: WhatsApp Bot reagiert nicht - PM2 Restart erforderlich',
    description: 'Der WhatsApp Bot reagiert nicht mehr auf Nachrichten. PM2 Prozess muss neu gestartet werden. Bitte prüfen und beheben.',
    status: 'new',
    priority: 'high',
    category: 'technical',
    user_id: userId,
    source_metadata: {
      test: true,
      agentTest: true,
      timestamp: new Date().toISOString(),
    },
  };

  console.log('📝 Erstelle Test-Ticket...');
  console.log('Title:', testTicket.title);
  console.log('Description:', testTicket.description);
  console.log('Status:', testTicket.status);
  console.log('');

  const { data, error } = await supabase
    .from('support_tickets')
    .insert(testTicket)
    .select()
    .single();

  if (error) {
    console.error('❌ Fehler beim Erstellen des Tickets:', error);
    process.exit(1);
  }

  console.log('✅ Test-Ticket erfolgreich erstellt!');
  console.log('');
  console.log('📋 Ticket-Details:');
  console.log('  ID:', data.id);
  console.log('  Title:', data.title);
  console.log('  Status:', data.status);
  console.log('  Created:', data.created_at);
  console.log('');
  console.log('🔍 Nächste Schritte:');
  console.log('  1. Prüfe Logs: pm2 logs support-mcp-server');
  console.log('  2. Der Agent sollte jetzt die Reverse Engineering Dokumentation abfragen');
  console.log('  3. Fix-Instructions werden dynamisch generiert');
  console.log('');
  console.log('💡 Ticket-ID für weitere Prüfungen:', data.id);
}

createTestTicket().catch(console.error);

