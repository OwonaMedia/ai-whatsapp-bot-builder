/**
 * Löscht alle Tickets außer dem PDF-Worker-Ticket
 * 
 * Dieses Script behält nur das Ticket "PDF Upload fehlgeschlagen: Worker-Modul nicht gefunden"
 * und löscht alle anderen Tickets.
 */

import { getServiceSupabaseClient } from '../lib/supabase-service.js';

async function main() {
  console.log('🗑️  Lösche alle Tickets außer PDF-Worker-Ticket...\n');

  const supabase = getServiceSupabaseClient();

  // Hole alle Tickets
  const { data: tickets, error: fetchError } = await supabase
    .from('support_tickets')
    .select('id, title, status')
    .order('created_at', { ascending: false });

  if (fetchError) {
    console.error('❌ Fehler beim Laden der Tickets:', fetchError);
    process.exit(1);
  }

  if (!tickets || tickets.length === 0) {
    console.log('✅ Keine Tickets gefunden.');
    return;
  }

  console.log(`📋 Gefundene Tickets: ${tickets.length}\n`);

  // Finde das PDF-Worker-Ticket
  const pdfTicket = tickets.find(
    (t) =>
      t.title.includes('PDF') ||
      t.title.includes('Worker') ||
      t.title.includes('pdf') ||
      t.title.includes('worker')
  );

  if (!pdfTicket) {
    console.log('⚠️  PDF-Worker-Ticket nicht gefunden!');
    console.log('   Verfügbare Tickets:');
    tickets.forEach((t) => {
      console.log(`   - ${t.id.substring(0, 8)}: ${t.title}`);
    });
    process.exit(1);
  }

  console.log(`✅ PDF-Worker-Ticket gefunden: ${pdfTicket.id}`);
  console.log(`   Titel: ${pdfTicket.title}\n`);

  // Filtere alle anderen Tickets
  const ticketsToDelete = tickets.filter((t) => t.id !== pdfTicket.id);

  if (ticketsToDelete.length === 0) {
    console.log('✅ Keine anderen Tickets zum Löschen.');
    return;
  }

  console.log(`🗑️  Lösche ${ticketsToDelete.length} Tickets...\n`);

  let deletedCount = 0;
  let errorCount = 0;

  for (const ticket of ticketsToDelete) {
    console.log(`   Lösche: ${ticket.id.substring(0, 8)} - ${ticket.title.substring(0, 50)}...`);

    // Zuerst alle Nachrichten löschen
    const { error: messagesError } = await supabase
      .from('support_ticket_messages')
      .delete()
      .eq('ticket_id', ticket.id);

    if (messagesError) {
      console.error(`   ❌ Fehler beim Löschen der Nachrichten: ${messagesError.message}`);
      errorCount++;
      continue;
    }

    // Dann das Ticket löschen
    const { error: ticketError } = await supabase
      .from('support_tickets')
      .delete()
      .eq('id', ticket.id);

    if (ticketError) {
      console.error(`   ❌ Fehler beim Löschen des Tickets: ${ticketError.message}`);
      errorCount++;
      continue;
    }

    deletedCount++;
    console.log(`   ✅ Gelöscht`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Erfolgreich gelöscht: ${deletedCount} Tickets`);
  if (errorCount > 0) {
    console.log(`❌ Fehler: ${errorCount} Tickets`);
  }
  console.log(`📋 Verbleibendes Ticket: ${pdfTicket.id.substring(0, 8)} - ${pdfTicket.title}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch((error) => {
  console.error('❌ Unerwarteter Fehler:', error);
  process.exit(1);
});

