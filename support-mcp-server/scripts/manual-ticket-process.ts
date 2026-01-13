/**
 * Manuelles Ticket-Processing
 * 
 * Dieses Script verarbeitet ein Ticket manuell, falls der Server
 * es nicht automatisch verarbeitet.
 */

import 'dotenv/config';
import { createSupportContext } from '../src/services/supportContext.js';
import { SupportTicketRouter } from '../src/services/ticketRouter.js';
import { createLogger } from '../src/utils/logger.js';

async function main() {
  const logger = createLogger();
  console.log('🔧 Manuelles Ticket-Processing...\n');

  try {
    const context = await createSupportContext(logger);
    const router = new SupportTicketRouter(context, logger);

    // Starte Router (ohne Realtime, nur Polling)
    await router.start();

    // Hole alle offenen Tickets (inkl. "investigating")
    const { data: tickets, error } = await context.supabase
      .from('support_tickets')
      .select('*')
      .in('status', ['new', 'investigating'])
      .or('title.ilike.%PDF%,description.ilike.%PDF%')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Fehler beim Laden der Tickets:', error);
      process.exit(1);
    }

    if (!tickets || tickets.length === 0) {
      console.log('✅ Keine offenen Tickets gefunden');
      process.exit(0);
    }

    console.log(`📋 Gefundene Tickets: ${tickets.length}\n`);

    for (const ticket of tickets) {
      console.log(`🎫 Verarbeite Ticket: ${ticket.id.substring(0, 8)}`);
      console.log(`   Titel: ${ticket.title}`);
      console.log(`   Status: ${ticket.status}`);
      console.log(`   Priorität: ${ticket.priority}\n`);

      try {
        // Dispatch Ticket mit detailliertem Logging
        console.log('   → Rufe dispatch() auf...');
        await router.dispatch({
          eventType: 'UPDATE',
          ticket: ticket as any,
        });
        console.log(`   ✅ Ticket verarbeitet\n`);
      } catch (error) {
        console.error(`   ❌ Fehler bei Verarbeitung:`, error);
        console.log('');
      }
    }

    // Warte kurz, damit alles verarbeitet wird
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log('✅ Alle Tickets verarbeitet');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fehler:', error);
    process.exit(1);
  }
}

main();

