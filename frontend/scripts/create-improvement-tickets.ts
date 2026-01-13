/**
 * Script zum Erstellen von Verbesserungs-Tickets für das Support-System
 * 
 * Verwendung:
 * ```bash
 * npx tsx scripts/create-improvement-tickets.ts
 * ```
 */

import { createSupportTicket } from '../lib/support/createTicket';

const improvements = [
  {
    category: 'ux' as const,
    title: 'Realtime wieder aktivieren mit optimierter Nutzung',
    description: `**Problem:**
Realtime ist aktuell komplett deaktiviert (wegen Quota-Überschreitung). Das führt zu:
- Polling alle 8 Sekunden (unnötige API-Calls)
- Keine Echtzeit-Updates für Support-Team
- Schlechtere User Experience

**Lösung:**
- Realtime nur für aktives Ticket aktivieren (nicht für alle)
- Channel-Subscription optimieren (nur support_ticket_messages des aktuellen Tickets)
- Cleanup verbessern (Channel wird korrekt entfernt)
- Monitoring für Realtime-Nutzung implementieren

**Priorität:** High
**Betroffen:** SupportMessagesClient.tsx, supabaseFactory.ts`,
    sourceMetadata: {
      source: 'cursor_ai',
      component: 'SupportMessagesClient.tsx',
      type: 'improvement',
      priority: 'high',
    },
  },
  {
    category: 'ux' as const,
    title: 'Pagination für internes Portal implementieren',
    description: `**Problem:**
Das interne Portal zeigt nur die letzten 100 Tickets (hardcoded Limit). Bei mehr Tickets werden ältere nicht angezeigt.

**Lösung:**
- Pagination im internen Portal implementieren
- Infinite Scroll oder "Load More" Button
- Filter nach Status, Priorität, Kategorie
- Suchfunktion für Tickets

**Priorität:** Medium
**Betroffen:** app/[locale]/intern/data.ts, InternalDashboard.tsx`,
    sourceMetadata: {
      source: 'cursor_ai',
      component: 'intern/data.ts',
      type: 'improvement',
      priority: 'medium',
    },
  },
  {
    category: 'integration' as const,
    title: 'Tier-2 Hetzner-Diagnose implementieren',
    description: `**Problem:**
Tier-2 Diagnose existiert nur für Supabase (via RPC). Hetzner-Automatisierung steht noch aus.

**Lösung:**
- Hetzner-Diagnose-RPC-Funktion erstellen
- Server-Diagnosedaten sammeln (Systemressourcen, Logs, Deployment-Infos)
- Integration in Tier-2 Automation
- Auto-Fix für bekannte Hetzner-Probleme

**Priorität:** High
**Betroffen:** Supabase RPC, Tier-2 Automation`,
    sourceMetadata: {
      source: 'cursor_ai',
      component: 'tier2-automation',
      type: 'improvement',
      priority: 'high',
    },
  },
  {
    category: 'ux' as const,
    title: 'Rich-Text-Editor für Ticket-Nachrichten',
    description: `**Problem:**
Aktuell nur Plain-Text-Nachrichten. Keine Formatierung, keine Markdown-Unterstützung.

**Lösung:**
- Rich-Text-Editor (z.B. Tiptap oder Slate) integrieren
- Markdown-Unterstützung
- Code-Blocks mit Syntax-Highlighting
- @-Mentions für Team-Mitglieder
- Datei-Uploads/Attachments

**Priorität:** Medium
**Betroffen:** SupportMessagesClient.tsx, InternalDashboard.tsx`,
    sourceMetadata: {
      source: 'cursor_ai',
      component: 'SupportMessagesClient.tsx',
      type: 'improvement',
      priority: 'medium',
    },
  },
  {
    category: 'integration' as const,
    title: 'E-Mail-Benachrichtigungen für Tickets',
    description: `**Problem:**
Kunden erhalten keine E-Mail-Benachrichtigungen bei:
- Neuen Antworten
- Status-Änderungen
- SLA-Warnungen

**Lösung:**
- E-Mail-Templates erstellen
- Supabase Edge Functions für E-Mail-Versand
- Benachrichtigungen bei neuen Antworten
- SLA-Warnungen (36h Threshold)
- Opt-out Option für Kunden

**Priorität:** High
**Betroffen:** Supabase Edge Functions, E-Mail-Service`,
    sourceMetadata: {
      source: 'cursor_ai',
      component: 'email-notifications',
      type: 'improvement',
      priority: 'high',
    },
  },
  {
    category: 'ux' as const,
    title: 'SLA-Tracking mit Alerts im internen Portal',
    description: `**Problem:**
SLA wird berechnet (36h Threshold), aber es gibt keine aktiven Alerts oder Warnungen im Portal.

**Lösung:**
- Visuelle Warnungen für Tickets nahe SLA-Limit
- Auto-Escalation bei SLA-Überschreitung
- Dashboard-Widget für SLA-Status
- E-Mail-Alerts für Support-Team

**Priorität:** Medium
**Betroffen:** InternalDashboard.tsx, data.ts`,
    sourceMetadata: {
      source: 'cursor_ai',
      component: 'InternalDashboard.tsx',
      type: 'improvement',
      priority: 'medium',
    },
  },
  {
    category: 'integration' as const,
    title: 'Automatische Ticket-Zuweisung basierend auf Agent-Load',
    description: `**Problem:**
Tickets werden manuell zugewiesen. Keine automatische Lastverteilung.

**Lösung:**
- Auto-Assignment basierend auf Agent-Load
- Round-Robin für neue Tickets
- Priorität-basierte Zuweisung
- Workload-Balancing

**Priorität:** Low
**Betroffen:** Tier-1 Automation, Ticket-Router`,
    sourceMetadata: {
      source: 'cursor_ai',
      component: 'tier1-automation',
      type: 'improvement',
      priority: 'low',
    },
  },
  {
    category: 'ux' as const,
    title: 'Export-Funktion für Tickets und Metriken',
    description: `**Problem:**
Keine Möglichkeit, Tickets oder Metriken zu exportieren (CSV, JSON, PDF).

**Lösung:**
- CSV-Export für Tickets
- PDF-Reports für Metriken
- JSON-Export für API-Integration
- Scheduled Reports (täglich/wöchentlich)

**Priorität:** Low
**Betroffen:** InternalDashboard.tsx, API Routes`,
    sourceMetadata: {
      source: 'cursor_ai',
      component: 'InternalDashboard.tsx',
      type: 'improvement',
      priority: 'low',
    },
  },
];

async function main() {
  console.log('🎫 Erstelle Verbesserungs-Tickets für das Support-System...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const improvement of improvements) {
    console.log(`📝 Erstelle Ticket: ${improvement.title}...`);
    
    const result = await createSupportTicket({
      ...improvement,
      locale: 'de',
    });

    if (result.success) {
      console.log(`✅ Ticket erstellt: ${improvement.title}`);
      console.log(`   📋 ID: ${result.ticketId}\n`);
      successCount++;
    } else {
      console.error(`❌ Fehler bei: ${improvement.title}`);
      console.error(`   Error: ${result.error}\n`);
      errorCount++;
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Erfolgreich: ${successCount} Tickets`);
  if (errorCount > 0) {
    console.log(`❌ Fehler: ${errorCount} Tickets`);
  }
  console.log(`🔗 Tickets ansehen: https://whatsapp.owona.de/de/intern`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main().catch((error) => {
  console.error('❌ Unerwarteter Fehler:', error);
  process.exit(1);
});

