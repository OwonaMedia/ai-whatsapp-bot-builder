#!/usr/bin/env tsx
/**
 * Erstellt ein Ticket für Server-Offline-Problem (502 Bad Gateway)
 * AutoFix sollte: pm2 restart whatsapp-bot-builder und systemctl restart caddy ausführen
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

async function createServerOfflineTicket() {
  try {
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

    // Erstelle Ticket
    const ticketData = {
      user_id: userId,
      title: 'Server offline - 502 Bad Gateway',
      description: `Problem: whatsapp.owona.de und owona.de zeigen 502 Bad Gateway Fehler.

Diagnose:
- DNS funktioniert (owona.de → 91.99.232.126)
- Ping funktioniert
- Port 80/443 sind offen
- HTTP/HTTPS gibt 502 Bad Gateway zurück

Ursache: Caddy läuft, aber Next.js (PM2) läuft nicht oder ist nicht erreichbar.

Erwartete AutoFix:
1. pm2 restart whatsapp-bot-builder
2. systemctl restart caddy
3. Prüfe ob Services laufen: pm2 status && systemctl status caddy`,
      status: 'new',
      priority: 'urgent',
      category: 'server',
      assigned_agent: 'autofix-system',
    };

    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .insert(ticketData)
      .select()
      .single();

    if (error) {
      console.error('❌ Fehler beim Erstellen des Tickets:', error);
      throw error;
    }

    console.log('✅ Ticket erfolgreich erstellt!');
    console.log('📋 Ticket ID:', ticket.id);
    console.log('📋 Titel:', ticket.title);
    console.log('📋 Status:', ticket.status);
    console.log('');
    console.log('🔍 Das AutoFix-System sollte automatisch:');
    console.log('   1. Problem erkennen (502 Bad Gateway)');
    console.log('   2. pm2 restart whatsapp-bot-builder ausführen');
    console.log('   3. systemctl restart caddy ausführen');
    console.log('   4. Status prüfen');

    return ticket;
  } catch (error) {
    console.error('❌ Fehler:', error);
    process.exit(1);
  }
}

createServerOfflineTicket();

