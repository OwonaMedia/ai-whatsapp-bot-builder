/**
 * Erstellt ein Ticket direkt über die API-Route
 * 
 * Dieses Script verwendet die bestehende API-Route /api/support-tickets
 * um ein Ticket zu erstellen, genau wie es die Frontend-Anwendung macht.
 */

async function main() {
  console.log('🎫 Erstelle Ticket direkt über Service Client...\n');

  try {
    // Verwende Service Client für direkte DB-Insert
    const { getServiceSupabaseClient } = await import('../lib/supabase-service.js');
    const serviceSupabase = getServiceSupabaseClient();

      // Finde oder erstelle einen System-User
      let systemUserId: string | null = null;

      // Prüfe ob system@owona.de existiert
      const { data: systemUser } = await serviceSupabase
        .from('profiles')
        .select('id')
        .eq('email', 'system@owona.de')
        .limit(1)
        .maybeSingle();

      if (systemUser?.id) {
        systemUserId = systemUser.id;
        console.log('✅ System-User gefunden:', systemUserId.substring(0, 8));
      } else {
        // Prüfe ersten User
        const { data: firstUser } = await serviceSupabase
          .from('profiles')
          .select('id, email')
          .limit(1)
          .maybeSingle();

        if (firstUser?.id) {
          systemUserId = firstUser.id;
          console.log(`✅ Verwende ersten User: ${firstUser.email} (${systemUserId.substring(0, 8)})`);
        } else {
          console.error('❌ Kein User in der Datenbank gefunden!');
          console.log('   Bitte erstelle zuerst einen User über die Anwendung.');
          process.exit(1);
        }
      }

      // Erstelle Ticket direkt
      const { data: ticket, error: ticketError } = await serviceSupabase
        .from('support_tickets')
        .insert({
          user_id: systemUserId,
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
          priority: 'high',
          status: 'new',
          source_metadata: {
            source: 'cursor_ai',
            component: 'lib/pdf/parsePdf.ts',
            test: true,
            expectedPattern: 'pdf-worker-module-not-found',
            created_via: 'script',
            timestamp: new Date().toISOString(),
          },
        })
        .select()
        .single();

      if (ticketError || !ticket) {
        console.error('❌ Fehler beim Erstellen des Tickets:', ticketError);
        process.exit(1);
      }

      const ticketId = ticket.id;

      // Erste Nachricht hinzufügen
      await serviceSupabase
        .from('support_ticket_messages')
        .insert({
          ticket_id: ticketId,
          author_type: 'customer',
          author_user_id: systemUserId,
          message: `Fehler beim PDF-Upload:

**Fehlermeldung:**
\`\`\`
Cannot find module '/var/www/whatsapp-bot-builder/.next/server/chunks/pdf.worker.mjs'
\`\`\`

**Kontext:**
- PDF-Upload funktioniert nicht
- Fehler tritt beim Verarbeiten von PDF-Dateien auf
- Worker-Modul wird nicht gefunden`,
          metadata: {
            attachments: [],
            source: 'cursor_ai',
          },
        });

      // Auto-Acknowledgement hinzufügen
      await serviceSupabase
        .from('support_ticket_messages')
        .insert({
          ticket_id: ticketId,
          author_type: 'support',
          author_user_id: null,
          author_name: 'Tier-1 Automation',
          message: `Hallo! 👋

Danke für dein Ticket – ich habe alles übernommen und halte dich auf dem Laufenden.

Ich habe die Technik bereits informiert und leite das Ticket direkt an Tier 2 weiter.

Sobald wir ein Update haben, bekommst du automatisch eine Statusmeldung.

Wenn du weitere Infos hast, kannst du direkt hier antworten – nach deiner ersten Rückmeldung eskaliere ich automatisch an Tier 2.`,
          metadata: {
            kind: 'auto_acknowledgement',
            tier: 'tier1',
            category: 'bug',
            locale: 'de',
          },
        });

      // Ticket-Status auf investigating setzen
      await serviceSupabase
        .from('support_tickets')
        .update({
          status: 'investigating',
          priority: 'high',
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId);

      console.log('✅ Ticket erfolgreich erstellt!');
      console.log(`   Ticket-ID: ${ticketId}`);
      console.log(`   Status: investigating`);
      console.log(`   Priorität: high`);
      console.log('\n📋 Nächste Schritte:');
      console.log('   1. MCP Support-System sollte Pattern erkennen');
      console.log('   2. Problem-Verifikation wird durchgeführt');
      console.log('   3. Fix wird automatisch ausgeführt (wenn Problem bestätigt)');
      console.log('\n🔍 Ticket im internen Portal prüfen:');
      console.log(`   /de/intern`);
      console.log('\n⏱️  Das System verarbeitet das Ticket automatisch...');
  } catch (error) {
    console.error('❌ Unerwarteter Fehler:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Unerwarteter Fehler:', error);
  process.exit(1);
});

