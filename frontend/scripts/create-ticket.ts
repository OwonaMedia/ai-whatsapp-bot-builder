/**
 * Script zum Erstellen von Support-Tickets via Cursor AI
 * 
 * Verwendung:
 * ```bash
 * npx tsx scripts/create-ticket.ts
 * ```
 * 
 * Oder über die API-Route:
 * ```bash
 * curl -X POST http://localhost:3999/api/support-tickets/create \
 *   -H "Content-Type: application/json" \
 *   -d '{"category":"bug","title":"...","description":"..."}'
 * ```
 */

import { createSupportTicket } from '../lib/support/createTicket';
import 'dotenv/config';

async function main() {
  console.log('🎫 Erstelle Support-Ticket...\n');

  const result = await createSupportTicket({
    category: 'bug',
    title: 'WhatsApp-Link und Test-Seite Button vertauscht',
    description: `**Problem:**
Auf der bot-einbinden Seite sind die Buttons vertauscht:
- "WhatsApp-Link öffnen" Button öffnet die Test-Seite
- "Test-Seite öffnen" Button öffnet nur whatsapp.owona.de (ohne Bot-ID)

**Ursache:**
Die onClick-Handler in \`EmbedCodeGenerator.tsx\` verwenden möglicherweise falsche URLs oder die href-Attribute sind vertauscht.

**Lösung:**
✅ Buttons von <a> zu <button> geändert
✅ Explizite URL-Generierung in onClick-Handlern implementiert
✅ WhatsApp-Link: \`/de/widget/embed?botId=\${botId}\`
✅ Test-Seite: \`/test-widget.html?bot-id=\${botId}\`

**Status:** ✅ Behoben

**Dateien geändert:**
- \`components/widget/EmbedCodeGenerator.tsx\`

**Getestet:**
- ✅ WhatsApp-Link öffnet korrekt die Embed-Seite
- ✅ Test-Seite öffnet korrekt die Test-Widget-Seite`,
    sourceMetadata: {
      source: 'cursor_ai',
      component: 'EmbedCodeGenerator.tsx',
      severity: 'medium',
      affectedFeature: 'bot-einbinden',
      fixed: true,
      fixedAt: new Date().toISOString(),
    },
    locale: 'de',
  });

  if (result.success) {
    console.log('✅ Ticket erfolgreich erstellt!');
    console.log(`📋 Ticket-ID: ${result.ticketId}`);
    console.log(`🔗 Ticket ansehen: https://whatsapp.owona.de/de/support/messages`);
  } else {
    console.error('❌ Fehler beim Erstellen des Tickets:');
    console.error(result.error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Unerwarteter Fehler:', error);
  process.exit(1);
});

