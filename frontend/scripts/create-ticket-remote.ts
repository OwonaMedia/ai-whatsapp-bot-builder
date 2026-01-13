/**
 * Erstellt ein Ticket direkt auf dem Remote-Server
 * 
 * Dieses Script verwendet die Service Role Key, um direkt
 * in die Supabase-Datenbank zu schreiben.
 */

import { getServiceSupabaseClient } from '../lib/supabase-service.js';

async function main() {
  console.log('🎫 Erstelle Ticket auf Remote-Server (whatsapp.owona.de)...\n');

  const supabase = getServiceSupabaseClient();

  // Finde einen User (für user_id Foreign Key)
  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select('id, email')
    .limit(1)
    .maybeSingle();

  if (usersError) {
    console.error('❌ Fehler beim Laden der User:', usersError);
    process.exit(1);
  }

  if (!users) {
    console.error('❌ Kein User in der Datenbank gefunden!');
    console.log('\n💡 Lösung:');
    console.log('   1. Öffne https://whatsapp.owona.de/de/intern');
    console.log('   2. Registriere dich oder logge dich ein');
    console.log('   3. Dann kannst du dieses Script erneut ausführen');
    process.exit(1);
  }

  const userId = users.id;
  console.log(`✅ Verwende User: ${users.email} (${userId.substring(0, 8)})\n`);

  // Erstelle Ticket
  const { data: ticket, error: ticketError } = await supabase
    .from('support_tickets')
    .insert({
      user_id: userId,
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
        created_via: 'script_remote',
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
  console.log('✅ Ticket erfolgreich erstellt!');
  console.log(`   Ticket-ID: ${ticketId}`);
  console.log(`   Status: new\n`);

  // Erste Nachricht hinzufügen
  const { error: messageError } = await supabase
    .from('support_ticket_messages')
    .insert({
      ticket_id: ticketId,
      author_type: 'customer',
      author_user_id: userId,
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

  if (messageError) {
    console.warn('⚠️  Fehler beim Hinzufügen der Nachricht:', messageError);
  } else {
    console.log('✅ Erste Nachricht hinzugefügt');
  }

  // Auto-Acknowledgement hinzufügen
  const { error: ackError } = await supabase
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

  if (ackError) {
    console.warn('⚠️  Fehler beim Hinzufügen des Acknowledgements:', ackError);
  } else {
    console.log('✅ Auto-Acknowledgement hinzugefügt');
  }

  // Ticket-Status auf investigating setzen
  const { error: updateError } = await supabase
    .from('support_tickets')
    .update({
      status: 'investigating',
      priority: 'high',
      updated_at: new Date().toISOString(),
    })
    .eq('id', ticketId);

  if (updateError) {
    console.warn('⚠️  Fehler beim Aktualisieren des Status:', updateError);
  } else {
    console.log('✅ Status auf "investigating" gesetzt\n');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ TICKET ERFOLGREICH ERSTELLT!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📋 Ticket-Details:');
  console.log(`   ID: ${ticketId}`);
  console.log(`   Titel: PDF Upload fehlgeschlagen: Worker-Modul nicht gefunden`);
  console.log(`   Status: investigating`);
  console.log(`   Priorität: high\n`);
  console.log('🔍 Ticket im internen Portal prüfen:');
  console.log(`   https://whatsapp.owona.de/de/intern`);
  console.log('\n⏱️  Nächste Schritte:');
  console.log('   1. MCP Support-System sollte Pattern automatisch erkennen');
  console.log('   2. Problem-Verifikation wird durchgeführt');
  console.log('   3. Fix wird automatisch ausgeführt (wenn Problem bestätigt)');
  console.log('\n💡 Hinweis:');
  console.log('   Das Ticket sollte jetzt unter /de/intern sichtbar sein.');
  console.log('   Das MCP-System verarbeitet es automatisch, sobald es läuft.');
}

main().catch((error) => {
  console.error('❌ Unerwarteter Fehler:', error);
  process.exit(1);
});

