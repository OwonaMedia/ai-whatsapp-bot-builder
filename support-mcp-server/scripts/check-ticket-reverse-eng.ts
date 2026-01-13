/**
 * Prüft ob ein Ticket vom Reverse Engineering Analyzer erkannt wird
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createSupportContext } from '../src/services/supportContext.js';
import { ReverseEngineeringAnalyzer } from '../src/services/actions/reverseEngineeringAnalyzer.js';
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
          console.log(`✅ Umgebungsvariablen geladen von: ${envPath}`);
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
  console.log('🔍 PRÜFE TICKET MIT REVERSE ENGINEERING ANALYZER\n');

  try {
    const context = await createSupportContext(logger);

    // Hole das neueste Ticket
    const { data: tickets, error } = await context.supabase
      .from('support_tickets')
      .select('*')
      .in('status', ['new', 'investigating'])
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !tickets || tickets.length === 0) {
      console.error('❌ Kein Ticket gefunden');
      process.exit(1);
    }

    const ticket = tickets[0];
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🎫 Ticket: ${ticket.id.substring(0, 8)}`);
    console.log(`   Titel: ${ticket.title}`);
    console.log(`   Beschreibung: ${ticket.description?.substring(0, 100)}...`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Erstelle Reverse Engineering Analyzer
    const analyzer = new ReverseEngineeringAnalyzer(
      context.knowledgeBase,
      logger.child({ component: 'ReverseEngineeringAnalyzer' }),
      context.llmClient,
    );

    console.log('1️⃣  REVERSE ENGINEERING ANALYZER:');
    console.log('   → Analysiere Reverse Engineering...');
    
    const match = await analyzer.matchTicketToConfiguration(ticket);
    
    if (match) {
      console.log(`   ✅ MATCH GEFUNDEN!`);
      console.log(`   📝 Pattern-ID: ${match.patternId}`);
      console.log(`   📋 Summary: ${match.summary}`);
      console.log(`   🔧 Actions: ${match.actions.length}`);
      console.log(`   💬 Customer Message: ${match.customerMessage?.substring(0, 100)}...\n`);
      
      if (match.actions.length > 0) {
        const action = match.actions[0];
        if (action.type === 'autopatch_plan' && action.payload) {
          console.log('   📄 Autopatch-Plan Details:');
          console.log(`      - Fix Name: ${(action.payload as any).fixName}`);
          console.log(`      - Goal: ${(action.payload as any).goal}`);
          console.log(`      - Target Files: ${JSON.stringify((action.payload as any).targetFiles)}`);
          console.log(`      - Steps: ${(action.payload as any).steps?.length || 0}`);
        }
      }
    } else {
      console.log(`   ❌ KEIN MATCH GEFUNDEN`);
      console.log(`   💡 Das Ticket wurde nicht vom Reverse Engineering Analyzer erkannt.\n`);
      
      // Zeige Ticket-Text für Debugging
      const combinedText = `${ticket.title ?? ''} ${ticket.description ?? ''}`.toLowerCase();
      console.log(`   📝 Ticket-Text: ${combinedText}`);
      console.log(`   💡 Mögliche Gründe:`);
      console.log(`      - Keine passende Konfiguration in Reverse Engineering gefunden`);
      console.log(`      - Keywords passen nicht zu bekannten Konfigurationen`);
      console.log(`      - Semantisches Matching hat nichts gefunden`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ PRÜFUNG ABGESCHLOSSEN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ FEHLER:', error);
    process.exit(1);
  }
}

main();

