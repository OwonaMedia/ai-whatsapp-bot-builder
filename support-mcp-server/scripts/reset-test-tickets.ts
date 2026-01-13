#!/usr/bin/env tsx
/**
 * Setzt alle E2E-Test-Tickets zurück auf Status 'new'
 * 
 * Dies ermöglicht es, die E2E-Tests erneut auszuführen, auch wenn
 * die Tickets bereits verarbeitet wurden.
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
    console.error('Bitte stelle sicher, dass SUPABASE_SERVICE_URL und SUPABASE_SERVICE_ROLE_KEY gesetzt sind.');
    process.exit(1);
  }
}

loadEnv();

async function resetTestTickets() {
  console.log('🔄 Setze E2E-Test-Tickets zurück auf Status "new"...\n');

  const config = loadConfig();
  const supabase = createSupportSupabase(config);

  // Hole Test-User ID (aus auth.users)
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const testUser = authUsers?.users?.find(u => u.email === 'test-e2e@owona.de');
  
  if (!testUser) {
    console.error('❌ Test-User nicht gefunden!');
    process.exit(1);
  }

  const userId = testUser.id;
  console.log(`✅ Test-User gefunden: ${userId} (${testUser.email})\n`);

  // Hole alle Test-Tickets
  const { data: tickets, error: fetchError } = await supabase
    .from('support_tickets')
    .select('id, title, status')
    .eq('user_id', userId);

  if (fetchError) {
    console.error('❌ Fehler beim Abrufen der Tickets:', fetchError);
    process.exit(1);
  }

  if (!tickets || tickets.length === 0) {
    console.log('⚠️  Keine Test-Tickets gefunden!');
    process.exit(0);
  }

  console.log(`📋 Gefundene Tickets: ${tickets.length}\n`);

  // Setze alle Tickets auf Status 'new' zurück und entferne Autopatch-Metadaten
  // Hole zuerst die aktuellen Metadaten, um sie zu aktualisieren
  const ticketIds = tickets.map((t) => t.id);
  
  // Für jedes Ticket: Entferne autopatch aus source_metadata
  for (const ticket of tickets) {
    const { data: currentTicket } = await supabase
      .from('support_tickets')
      .select('source_metadata')
      .eq('id', ticket.id)
      .single();
    
    if (currentTicket?.source_metadata) {
      const metadata = currentTicket.source_metadata as Record<string, unknown>;
      if (metadata.autopatch) {
        delete metadata.autopatch;
        await supabase
          .from('support_tickets')
          .update({ source_metadata: metadata })
          .eq('id', ticket.id);
      }
    }
  }
  
  const { data: updatedTickets, error: updateError } = await supabase
    .from('support_tickets')
    .update({ 
      status: 'new',
      updated_at: new Date().toISOString(),
      assigned_agent: null,
    })
    .eq('user_id', userId)
    .select('id, title, status');

  if (updateError) {
    console.error('❌ Fehler beim Zurücksetzen der Tickets:', updateError);
    process.exit(1);
  }

  console.log('✅ Tickets zurückgesetzt:\n');
  if (updatedTickets) {
    updatedTickets.forEach((ticket) => {
      console.log(`  - ${ticket.title}: ${ticket.status}`);
    });
  }

  console.log(`\n📊 Zusammenfassung:`);
  console.log(`  - Zurückgesetzt: ${updatedTickets?.length || 0} Tickets`);
  console.log(`  - Gesamt: ${tickets.length} Tickets`);

  // Lösche auch alle Automation-Events für diese Tickets (optional)
  const { error: deleteEventsError } = await supabase
    .from('support_automation_events')
    .delete()
    .in('ticket_id', ticketIds);

  if (deleteEventsError) {
    console.warn('⚠️  Fehler beim Löschen der Automation-Events:', deleteEventsError);
  } else {
    console.log(`\n✅ Automation-Events gelöscht für ${ticketIds.length} Tickets`);
  }

  console.log('\n🎉 Fertig! Tickets sind jetzt bereit für E2E-Tests.');
}

// Führe Script aus
resetTestTickets()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fehler:', error);
    process.exit(1);
  });
