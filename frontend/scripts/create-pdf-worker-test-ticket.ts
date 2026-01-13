/**
 * Erstellt ein Test-Ticket für das PDF Worker-Modul-Problem
 * 
 * Dieses Script testet das neue Problem-Verifikations-System:
 * 1. Pattern-Erkennung
 * 2. Problem-Verifikation
 * 3. Automatische Lösung
 */

import { createSupportTicket } from '../lib/support/createTicket.js';

async function main() {
  console.log('🎫 Erstelle Test-Ticket für PDF Worker-Modul-Problem...\n');

  const result = await createSupportTicket({
    category: 'bug',
    title: 'PDF Upload fehlgeschlagen: Worker-Modul nicht gefunden',
    description: `Fehler beim PDF-Upload:

**Fehlermeldung:**
\`\`\`
Cannot find module '/var/www/whatsapp-bot-builder/.next/server/chunks/pdf.worker.mjs'
\`\`\`

**Kontext:**
- PDF-Upload funktioniert nicht
- Fehler tritt beim Verarbeiten von PDF-Dateien auf
- Worker-Modul wird nicht gefunden

**Erwartetes Verhalten:**
PDF sollte korrekt hochgeladen und verarbeitet werden können.

**Schritte zum Reproduzieren:**
1. Gehe zu Bot-Einstellungen > Wissensquellen
2. Versuche eine PDF-Datei hochzuladen
3. Fehler erscheint in der Konsole

**System-Informationen:**
- Next.js 15.0.3
- pdf-parse verwendet
- Worker-Modul-Pfad scheint falsch zu sein`,
    sourceMetadata: {
      source: 'cursor_ai',
      component: 'lib/pdf/parsePdf.ts',
      test: true,
      expectedPattern: 'pdf-worker-module-not-found',
    },
    locale: 'de',
  });

  if (result.success && result.ticketId) {
    console.log('✅ Test-Ticket erfolgreich erstellt!');
    console.log(`   Ticket-ID: ${result.ticketId}`);
    console.log(`   Status: investigating (Tier-1 Automation)`);
    console.log('\n📋 Nächste Schritte:');
    console.log('   1. MCP Support-System sollte Pattern erkennen');
    console.log('   2. Problem-Verifikation wird durchgeführt');
    console.log('   3. Fix wird automatisch ausgeführt (wenn Problem bestätigt)');
    console.log('\n🔍 Ticket im internen Portal prüfen:');
    console.log(`   /de/intern`);
    console.log('\n⏱️  Das System verarbeitet das Ticket automatisch...');
  } else {
    console.error('❌ Fehler beim Erstellen des Tickets:', result.error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Unerwarteter Fehler:', error);
  process.exit(1);
});

