/**
 * Script zum Abrufen und Analysieren des neuesten Support-Tickets
 * 
 * Verwendet die gleiche Config wie der Support-MCP-Server
 * 
 * Usage: 
 *   cd support-mcp-server && npx tsx ../frontend/scripts/check-latest-ticket.ts
 *   Oder mit Env-Vars:
 *   SUPABASE_SERVICE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/check-latest-ticket.ts
 */

import { createSupportSupabase } from '../../support-mcp-server/src/services/supabaseClient';
import { loadConfig } from '../../support-mcp-server/src/services/config';
import { matchAutopatchPattern } from '../../support-mcp-server/src/services/actions/autopatchPatterns';

async function main() {
  console.log('🔍 Lade neuestes Support-Ticket...\n');

  try {
    // Fallback: Versuche Env-Vars aus Frontend-Projekt zu verwenden
    if (!process.env.SUPABASE_SERVICE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      process.env.SUPABASE_SERVICE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    }
    
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY fehlt!');
      console.error('   Bitte setze die Umgebungsvariable oder erstelle eine .env-Datei im support-mcp-server Verzeichnis.');
      process.exit(1);
    }

    // Verwende die gleiche Config wie der Support-MCP-Server
    const config = loadConfig();
    const supabase = createSupportSupabase(config);

    // Lade neuestes Ticket mit neuester Nachricht
    const { data: tickets, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        support_ticket_messages (
          id,
          message,
          author_type,
          created_at
        )
      `)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('❌ Fehler beim Laden der Tickets:', error);
      process.exit(1);
    }

    if (!tickets || tickets.length === 0) {
      console.log('⚠️ Keine Tickets gefunden.');
      return;
    }

    const ticket = tickets[0];
    const messages = ticket.support_ticket_messages || [];
    const latestMessage = messages.sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📋 Ticket #${ticket.id}`);
    console.log(`   Titel: ${ticket.title}`);
    console.log(`   Kategorie: ${ticket.category}`);
    console.log(`   Status: ${ticket.status}`);
    console.log(`   Priorität: ${ticket.priority}`);
    console.log(`   Erstellt: ${new Date(ticket.created_at).toLocaleString('de-DE')}`);
    console.log(`   Nachrichten: ${messages.length}`);
    console.log(`   Beschreibung: ${ticket.description?.substring(0, 200) || 'Keine'}${ticket.description && ticket.description.length > 200 ? '...' : ''}`);
    if (latestMessage) {
      console.log(`   Neueste Nachricht: ${latestMessage.message.substring(0, 200)}${latestMessage.message.length > 200 ? '...' : ''}`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Prüfe MCP Pattern-Matching
    console.log('🔍 Prüfe MCP Pattern-Matching...\n');

    const combinedText = `${ticket.title} ${ticket.description} ${latestMessage?.message || ''}`;
    
    const minimalTicket = {
      id: ticket.id,
      title: ticket.title,
      description: ticket.description,
      category: ticket.category,
      status: ticket.status,
      priority: ticket.priority,
      latest_message: latestMessage?.message || '',
    };

    const autopatchCandidate = matchAutopatchPattern(minimalTicket as any);

    if (autopatchCandidate) {
      console.log('✅ Pattern erkannt!');
      console.log(`   Pattern ID: ${autopatchCandidate.patternId}`);
      console.log(`   Zusammenfassung: ${autopatchCandidate.summary}`);
      console.log(`   Aktionen: ${autopatchCandidate.actions.length}`);
      
      autopatchCandidate.actions.forEach((action, index) => {
        console.log(`\n   📋 Aktion ${index + 1}:`);
        console.log(`      Typ: ${action.type}`);
        console.log(`      Beschreibung: ${action.description}`);
        
        if (action.type === 'autopatch_plan' && action.payload) {
          console.log(`      Ziel: ${action.payload.goal}`);
          const targetFiles = Array.isArray(action.payload.targetFiles) ? action.payload.targetFiles : [];
          const steps = Array.isArray(action.payload.steps) ? action.payload.steps : [];
          console.log(`      Dateien: ${targetFiles.join(', ') || 'Keine'}`);
          console.log(`      Schritte: ${steps.length || 0}`);
        }
      });

      console.log(`\n   💬 Kunden-Nachricht:`);
      console.log(`      ${autopatchCandidate.customerMessage}`);
    } else {
      console.log('⚠️ Kein Pattern erkannt.');
      console.log('   Das Ticket passt nicht zu den vorhandenen Autopatch-Patterns.');
      console.log('   Möglicherweise muss ein neues Pattern hinzugefügt werden.');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🔗 Ticket ansehen: https://whatsapp.owona.de/de/intern`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Unerwarteter Fehler:', error);
    process.exit(1);
  }
}

main();

