/**
 * Erzwingt die Verarbeitung eines Tickets
 * 
 * Dieses Script verarbeitet ein Ticket direkt, ohne auf Polling zu warten.
 * Es zeigt auch detaillierte Debug-Informationen.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createSupportContext } from '../src/services/supportContext.js';
import { SupportTicketRouter } from '../src/services/ticketRouter.js';
import { matchAutopatchPattern } from '../src/services/actions/autopatchPatterns.js';
import { ProblemVerifier } from '../src/services/actions/problemVerifier.js';
import { createLogger } from '../src/utils/logger.js';
import path from 'path';

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
      
      // Prüfe ob Supabase-Variablen vorhanden sind (auch mit NEXT_PUBLIC_ Präfix)
      if (process.env.SUPABASE_SERVICE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) {
        // Mappe NEXT_PUBLIC_Variablen auf erwartete Variablen
        if (!process.env.SUPABASE_SERVICE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL) {
          process.env.SUPABASE_SERVICE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
        }
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY) {
          // Versuche verschiedene Variablennamen
          process.env.SUPABASE_SERVICE_ROLE_KEY = 
            process.env.SUPABASE_SERVICE_ROLE_KEY ||
            process.env.SUPABASE_SERVICE_KEY ||
            process.env.SUPABASE_SERVICE_ROLE_KEY;
        }
        
        if (process.env.SUPABASE_SERVICE_URL) {
          console.log(`✅ Umgebungsvariablen geladen von: ${envPath}`);
          return;
        }
      }
    } catch (error) {
      // Ignoriere Fehler, versuche nächsten Pfad
    }
  }

  if (!process.env.SUPABASE_SERVICE_URL) {
    console.error('❌ Keine Umgebungsvariablen gefunden!');
    console.error('   Bitte stelle sicher, dass .env existiert mit:');
    console.error('   - SUPABASE_SERVICE_URL (oder NEXT_PUBLIC_SUPABASE_URL)');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY');
    console.error('\n   Versuchte Pfade:');
    envPaths.forEach(p => console.error(`     - ${p}`));
    process.exit(1);
  }
}

loadEnv();

async function main() {
  const logger = createLogger();
  console.log('🔧 ERZWINGE TICKET-VERARBEITUNG\n');

  try {
    const context = await createSupportContext(logger);

    // Hole das neueste PDF-Ticket
    const { data: tickets, error } = await context.supabase
      .from('support_tickets')
      .select('*')
      .or('title.ilike.%PDF%,description.ilike.%PDF%')
      .in('status', ['new', 'investigating'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('❌ Fehler beim Laden der Tickets:', error);
      process.exit(1);
    }

    if (!tickets || tickets.length === 0) {
      console.log('❌ Keine PDF-Tickets mit Status "new" oder "investigating" gefunden');
      process.exit(1);
    }

    const ticket = tickets[0];
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🎫 Ticket: ${ticket.id.substring(0, 8)}`);
    console.log(`   Titel: ${ticket.title}`);
    console.log(`   Status: ${ticket.status}`);
    console.log(`   Priorität: ${ticket.priority}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 1. Prüfe Pattern-Erkennung
    console.log('1️⃣  PATTERN-ERKENNUNG:');
    const patternMatch = matchAutopatchPattern(ticket);
    
    if (!patternMatch) {
      console.log('   ❌ KEIN PATTERN ERKANNT!');
      console.log(`   📝 Ticket-Text: ${(ticket.title ?? '') + ' ' + (ticket.description ?? '')}`);
      console.log('\n   💡 Mögliche Ursachen:');
      console.log('      - Pattern-Regex passt nicht');
      console.log('      - Ticket-Text enthält nicht die erwarteten Keywords');
      process.exit(1);
    }

    console.log(`   ✅ Pattern erkannt: ${patternMatch.patternId}`);
    console.log(`   📝 Summary: ${patternMatch.summary}`);
    console.log(`   🔧 Actions: ${patternMatch.actions.length}`);
    console.log(`   📋 AutoFix Instructions: ${patternMatch.autoFixInstructions?.length ?? 0}\n`);

    // 2. Prüfe Problem-Verifikation
    console.log('2️⃣  PROBLEM-VERIFIKATION:');
    const rootDir = process.cwd().endsWith('support-mcp-server')
      ? path.resolve(process.cwd(), '..', 'frontend')
      : path.resolve(process.cwd(), 'frontend');
    
    console.log(`   📁 Root-Dir: ${rootDir}`);
    
    const verifier = new ProblemVerifier(rootDir, logger);
    const verification = await verifier.verifyProblem(ticket, patternMatch.patternId);
    
    console.log(`   Problem existiert: ${verification.problemExists ? '✅ JA' : '❌ NEIN'}`);
    console.log(`   Schweregrad: ${verification.severity}`);
    console.log(`   Evidenz:`);
    verification.evidence.forEach((e) => {
      console.log(`      ${e}`);
    });
    console.log('');

    if (!verification.problemExists) {
      console.log('   ⚠️  Problem-Verifikation schlägt fehl!');
      console.log('   💡 Das System wird den Fix NICHT ausführen.');
      console.log('   💡 Prüfe die Evidenz oben - möglicherweise sind die Dateien nicht gefunden.\n');
    }

    // 3. Erstelle Router und verarbeite
    console.log('3️⃣  TICKET-VERARBEITUNG:');
    const router = new SupportTicketRouter(context, logger);
    
    // Starte Router (ohne Realtime, nur für dispatch)
    console.log('   → Erstelle Router...');
    
    console.log('   → Rufe dispatch() auf...');
    try {
      await router.dispatch({
        eventType: 'UPDATE',
        ticket: ticket as any,
      });
      console.log('   ✅ dispatch() erfolgreich aufgerufen\n');
    } catch (error) {
      console.error('   ❌ Fehler bei dispatch():', error);
      throw error;
    }

    // Warte kurz
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Prüfe Ticket-Status nach Verarbeitung
    console.log('4️⃣  STATUS-PRÜFUNG:');
    const { data: updatedTicket } = await context.supabase
      .from('support_tickets')
      .select('*')
      .eq('id', ticket.id)
      .single();

    if (updatedTicket) {
      console.log(`   Status: ${updatedTicket.status}`);
      console.log(`   Assigned Agent: ${updatedTicket.assigned_agent || 'keiner'}`);
      
      // Prüfe Nachrichten
      const { data: messages } = await context.supabase
        .from('support_ticket_messages')
        .select('*')
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: false })
        .limit(5);

      console.log(`   Nachrichten: ${messages?.length || 0}`);
      if (messages && messages.length > 0) {
        console.log('   Letzte Nachrichten:');
        messages.forEach((msg, i) => {
          console.log(`      ${i + 1}. [${msg.author_type}] ${msg.author_name || 'System'}: ${msg.message.substring(0, 60)}...`);
        });
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ VERARBEITUNG ABGESCHLOSSEN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ FEHLER:', error);
    if (error instanceof Error) {
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

main();

