/**
 * Debug-Script für Ticket-Verarbeitung
 * 
 * Prüft warum ein Ticket nicht verarbeitet wird:
 * - Pattern-Erkennung
 * - Problem-Verifikation
 * - Ticket-Status
 */

import 'dotenv/config';
import { createSupportContext } from '../src/services/supportContext.js';
import { matchAutopatchPattern } from '../src/services/actions/autopatchPatterns.js';
import { ProblemVerifier } from '../src/services/actions/problemVerifier.js';
import { createLogger } from '../src/utils/logger.js';
import path from 'path';

async function main() {
  const logger = createLogger();
  console.log('🔍 DEBUG: Ticket-Verarbeitung\n');

  try {
    const context = await createSupportContext(logger);

    // Hole alle Tickets mit "PDF" im Titel
    const { data: tickets, error } = await context.supabase
      .from('support_tickets')
      .select('*')
      .or('title.ilike.%PDF%,description.ilike.%PDF%')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('❌ Fehler beim Laden der Tickets:', error);
      process.exit(1);
    }

    if (!tickets || tickets.length === 0) {
      console.log('❌ Keine PDF-Tickets gefunden');
      process.exit(1);
    }

    console.log(`📋 Gefundene Tickets: ${tickets.length}\n`);

    for (const ticket of tickets) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`🎫 Ticket: ${ticket.id.substring(0, 8)}`);
      console.log(`   Titel: ${ticket.title}`);
      console.log(`   Status: ${ticket.status}`);
      console.log(`   Priorität: ${ticket.priority}`);
      console.log(`   Kategorie: ${ticket.category}\n`);

      // 1. Prüfe Pattern-Erkennung
      console.log('1️⃣  Pattern-Erkennung:');
      const combinedText = `${ticket.title ?? ''} ${ticket.description ?? ''}`;
      const patternMatch = matchAutopatchPattern(ticket);
      
      if (patternMatch) {
        console.log(`   ✅ Pattern erkannt: ${patternMatch.patternId}`);
        console.log(`   📝 Summary: ${patternMatch.summary}`);
        console.log(`   🔧 Actions: ${patternMatch.actions.length}`);
        console.log(`   📋 AutoFix Instructions: ${patternMatch.autoFixInstructions?.length ?? 0}\n`);

        // 2. Prüfe Problem-Verifikation
        console.log('2️⃣  Problem-Verifikation:');
        const rootDir = process.cwd().endsWith('support-mcp-server')
          ? process.cwd()
          : path.resolve(process.cwd(), 'support-mcp-server');
        
        const verifier = new ProblemVerifier(rootDir, logger);
        const verification = await verifier.verifyProblem(ticket, patternMatch.patternId);
        
        console.log(`   Problem existiert: ${verification.problemExists ? '✅ JA' : '❌ NEIN'}`);
        console.log(`   Schweregrad: ${verification.severity}`);
        console.log(`   Evidenz:`);
        verification.evidence.forEach((e) => {
          console.log(`      ${e}`);
        });
        console.log('');

        // 3. Prüfe Ticket-Status
        console.log('3️⃣  Ticket-Status:');
        const validStatuses = ['new', 'investigating'];
        if (validStatuses.includes(ticket.status)) {
          console.log(`   ✅ Status ist gültig: ${ticket.status}`);
        } else {
          console.log(`   ❌ Status ist NICHT gültig: ${ticket.status}`);
          console.log(`   💡 Erwartet: ${validStatuses.join(' oder ')}`);
        }
        console.log('');

        // 4. Zusammenfassung
        console.log('📊 ZUSAMMENFASSUNG:');
        if (patternMatch && verification.problemExists && validStatuses.includes(ticket.status)) {
          console.log('   ✅ Ticket sollte verarbeitet werden!');
          console.log('   ⚠️  Mögliche Ursachen:');
          console.log('      - MCP Server läuft nicht');
          console.log('      - Polling funktioniert nicht');
          console.log('      - Fehler in dispatch()');
        } else {
          console.log('   ❌ Ticket wird NICHT verarbeitet:');
          if (!patternMatch) {
            console.log('      - Pattern wird nicht erkannt');
          }
          if (!verification.problemExists) {
            console.log('      - Problem-Verifikation schlägt fehl');
          }
          if (!validStatuses.includes(ticket.status)) {
            console.log('      - Ticket-Status ist nicht gültig');
          }
        }
      } else {
        console.log('   ❌ Kein Pattern erkannt');
        console.log(`   📝 Ticket-Text: ${combinedText.substring(0, 200)}...\n`);
      }

      console.log('');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Fehler:', error);
    process.exit(1);
  }
}

main();

