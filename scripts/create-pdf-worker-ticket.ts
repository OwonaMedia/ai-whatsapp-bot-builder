import { createSupportTicket } from '../frontend/lib/support/createTicket';
import 'dotenv/config';

async function main() {
  console.log('🎫 Erstelle Ticket für PDF-Worker-Problem...\n');

  const result = await createSupportTicket({
    category: 'bug',
    title: 'PDF Upload fehlgeschlagen: Worker-Modul nicht gefunden',
    description: `Nach Änderungen im CHANGELOG_SESSION.md tritt folgender Fehler auf:

PDF parsing failed: Setting up fake worker failed: "Cannot find module '/var/www/whatsapp-bot-builder/.next/server/chunks/pdf.worker.mjs' imported from /var/www/whatsapp-bot-builder/.next/server/chunks/6692.js".

Das Problem tritt beim PDF-Upload auf der Hauptseite auf. Der PDF-Worker wird nicht korrekt geladen oder ist nicht im Build enthalten.

Betroffene Dateien:
- lib/pdf/parsePdf.ts
- app/api/knowledge/upload/route.ts

Fehler tritt auf dem Server auf: /var/www/whatsapp-bot-builder

Mögliche Ursachen:
1. PDF.js Worker wird nicht korrekt konfiguriert
2. Worker-Datei wird nicht in den Build aufgenommen
3. GlobalWorkerOptions.workerSrc ist falsch konfiguriert
4. Next.js Build-Prozess kopiert Worker-Datei nicht`,
    sourceMetadata: {
      source: 'cursor_ai',
      component: 'lib/pdf/parsePdf.ts',
      priority: 'high',
      affectedFiles: ['lib/pdf/parsePdf.ts', 'app/api/knowledge/upload/route.ts'],
      errorType: 'module_not_found',
      serverPath: '/var/www/whatsapp-bot-builder',
    },
    locale: 'de',
  });

  if (result.success) {
    console.log(`✅ Ticket erfolgreich erstellt: ${result.ticketId}`);
    console.log(`🔗 Ticket ansehen: https://whatsapp.owona.de/de/intern`);
  } else {
    console.error(`❌ Fehler beim Erstellen des Tickets: ${result.error}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Unerwarteter Fehler:', error);
  process.exit(1);
});

