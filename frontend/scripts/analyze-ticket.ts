/**
 * Script zum Analysieren eines Support-Tickets mit MCP Pattern-Matching
 * 
 * Usage: npx tsx scripts/analyze-ticket.ts "Ticket Titel" "Ticket Beschreibung"
 */

import { matchAutopatchPattern } from '../../support-mcp-server/src/services/actions/autopatchPatterns';

const ticketTitle = process.argv[2] || '';
const ticketDescription = process.argv[3] || '';

if (!ticketTitle && !ticketDescription) {
  console.log('❌ Bitte gib Titel und Beschreibung an:');
  console.log('   npx tsx scripts/analyze-ticket.ts "Titel" "Beschreibung"');
  process.exit(1);
}

console.log('🔍 Analysiere Ticket...\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📋 Titel: ${ticketTitle}`);
console.log(`📝 Beschreibung: ${ticketDescription.substring(0, 200)}${ticketDescription.length > 200 ? '...' : ''}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const minimalTicket = {
  title: ticketTitle,
  description: ticketDescription,
  category: null,
  source_metadata: null,
  latest_message: ticketDescription,
};

const combinedText = `${ticketTitle} ${ticketDescription}`;

const autopatchCandidate = matchAutopatchPattern(minimalTicket as any);

if (autopatchCandidate) {
  console.log('✅ Pattern erkannt!');
  console.log(`   Pattern ID: ${autopatchCandidate.patternId}`);
  console.log(`   Zusammenfassung: ${autopatchCandidate.summary}`);
  console.log(`   Aktionen: ${autopatchCandidate.actions.length}\n`);
  
  autopatchCandidate.actions.forEach((action, index) => {
    console.log(`   📋 Aktion ${index + 1}:`);
    console.log(`      Typ: ${action.type}`);
    console.log(`      Beschreibung: ${action.description}`);
    
    if (action.type === 'autopatch_plan' && action.payload) {
      const payload = action.payload as any;
      console.log(`      Ziel: ${payload.goal || 'N/A'}`);
      console.log(`      Dateien: ${payload.targetFiles?.join(', ') || 'Keine'}`);
      console.log(`      Schritte: ${payload.steps?.length || 0}`);
      if (payload.steps && payload.steps.length > 0) {
        console.log(`      Erste Schritte:`);
        payload.steps.slice(0, 3).forEach((step: string, i: number) => {
          console.log(`         ${i + 1}. ${step.substring(0, 80)}${step.length > 80 ? '...' : ''}`);
        });
      }
    }
    console.log('');
  });

  console.log(`   💬 Kunden-Nachricht:`);
  console.log(`      ${autopatchCandidate.customerMessage}`);
  
  if (autopatchCandidate.autoFixInstructions && autopatchCandidate.autoFixInstructions.length > 0) {
    console.log(`\n   🔧 AutoFix-Instructions: ${autopatchCandidate.autoFixInstructions.length}`);
    autopatchCandidate.autoFixInstructions.forEach((instruction, i) => {
      console.log(`      ${i + 1}. ${instruction.type}`);
      if ('key' in instruction) console.log(`         Key: ${instruction.key}`);
      if ('locale' in instruction) console.log(`         Locale: ${instruction.locale}`);
    });
  }
} else {
  console.log('⚠️ Kein Pattern erkannt.');
  console.log('   Das Ticket passt nicht zu den vorhandenen Autopatch-Patterns.');
  console.log('   Möglicherweise muss ein neues Pattern hinzugefügt werden.\n');
  
  console.log('📋 Verfügbare Patterns:');
  console.log('   - bot-builder-load-error');
  console.log('   - analytics-data-missing');
  console.log('   - knowledge-upload-failed');
  console.log('   - embed-code-invalid');
  console.log('   - bot-settings-save-failed');
  console.log('   - whatsapp-link-button-issue');
  console.log('   - realtime-quota-exceeded');
  console.log('   - pdf-content-not-recognized');
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

