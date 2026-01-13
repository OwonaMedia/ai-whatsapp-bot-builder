/**
 * Script zur Analyse aller Bot-Features und Erstellung von Support-Tickets
 * für gefundene Probleme über das MCP Support-System
 */

import { createSupportTicket } from '../lib/support/createTicket';

interface FeatureAnalysis {
  feature: string;
  issues: Array<{
    title: string;
    description: string;
    severity: 'high' | 'medium' | 'low';
    category: 'bug' | 'ux' | 'integration' | 'other';
    affectedFiles?: string[];
  }>;
}

const analysis: FeatureAnalysis[] = [
  {
    feature: 'Bot bearbeiten (BotBuilder)',
    issues: [
      {
        title: 'BotBuilder: Fehlende API-Route für Bot-Updates',
        description: `**Problem:**
BotBuilder speichert direkt über Supabase Client, ohne dedizierte API-Route. Das führt zu:
- Keine zentrale Validierung
- Keine Rate-Limiting
- Schwierigeres Error-Handling
- Keine Audit-Logs

**Betroffene Dateien:**
- \`components/bot-builder/BotBuilder.tsx\` (Zeile 458-619)
- Keine \`/api/bots/[id]\` Route vorhanden

**Lösung:**
- API-Route \`PUT /api/bots/[id]\` erstellen
- Validierung mit Zod-Schemas
- Rate-Limiting implementieren
- Audit-Logs für Änderungen`,
        severity: 'medium',
        category: 'integration',
        affectedFiles: ['components/bot-builder/BotBuilder.tsx'],
      },
      {
        title: 'BotBuilder: Auto-Save könnte zu Race Conditions führen',
        description: `**Problem:**
Auto-Save alle 30 Sekunden (Zeile 355-364) könnte zu Race Conditions führen, wenn User manuell speichert.

**Betroffene Dateien:**
- \`components/bot-builder/BotBuilder.tsx\` (Zeile 355-364)

**Lösung:**
- Debouncing für Auto-Save
- Prüfung ob manueller Save läuft
- Queue-System für Save-Operationen`,
        severity: 'low',
        category: 'bug',
        affectedFiles: ['components/bot-builder/BotBuilder.tsx'],
      },
    ],
  },
  {
    feature: 'Bot-Performance Übersicht (Analytics)',
    issues: [
      {
        title: 'Analytics: CSV-Export verwendet undefined Variablen',
        description: `**Status:** ✅ BEHOBEN
CSV-Export in \`AnalyticsDashboard.tsx\` verwendete \`totalConversations\` und \`activeConversations\` vor ihrer Definition.

**Fix:**
- Variablen wurden vor \`handleExportCSV\` verschoben
- Alle Stats werden jetzt korrekt berechnet

**Betroffene Dateien:**
- \`components/analytics/AnalyticsDashboard.tsx\` (Zeile 30-35, 37-82)

**Getestet:** ✅`,
        severity: 'high',
        category: 'bug',
        affectedFiles: ['components/analytics/AnalyticsDashboard.tsx'],
      },
      {
        title: 'Analytics: Keine Error-Handling für fehlende Daten',
        description: `**Problem:**
Analytics-Seite zeigt keine Fehlermeldung, wenn Supabase-Queries fehlschlagen oder keine Daten vorhanden sind.

**Betroffene Dateien:**
- \`app/[locale]/bots/[id]/analytics/page.tsx\`
- \`components/analytics/AnalyticsDashboard.tsx\`

**Lösung:**
- Error-Boundary für Analytics-Komponente
- Loading States verbessern
- Empty States für fehlende Daten`,
        severity: 'medium',
        category: 'ux',
        affectedFiles: [
          'app/[locale]/bots/[id]/analytics/page.tsx',
          'components/analytics/AnalyticsDashboard.tsx',
        ],
      },
    ],
  },
  {
    feature: 'Wissensquellen (Knowledge Management)',
    issues: [
      {
        title: 'Knowledge: Polling alle 5 Sekunden könnte Performance-Probleme verursachen',
        description: `**Problem:**
Status-Polling alle 5 Sekunden (Zeile 49) könnte bei vielen Quellen zu Performance-Problemen führen.

**Betroffene Dateien:**
- \`components/knowledge/KnowledgeManagement.tsx\` (Zeile 47-51)

**Lösung:**
- Polling nur für "processing" Quellen
- Exponential Backoff
- WebSocket/Realtime für Status-Updates`,
        severity: 'low',
        category: 'other',
        affectedFiles: ['components/knowledge/KnowledgeManagement.tsx'],
      },
      {
        title: 'Knowledge: Fehlende Validierung für URL-Import',
        description: `**Problem:**
URL-Import prüft nicht, ob URL erreichbar ist oder gültiges Format hat.

**Betroffene Dateien:**
- \`components/knowledge/KnowledgeManagement.tsx\`
- \`app/api/knowledge/url/route.ts\`

**Lösung:**
- URL-Format-Validierung
- Erreichbarkeits-Prüfung
- Content-Type-Validierung`,
        severity: 'medium',
        category: 'bug',
        affectedFiles: [
          'components/knowledge/KnowledgeManagement.tsx',
          'app/api/knowledge/url/route.ts',
        ],
      },
    ],
  },
  {
    feature: 'Bot einbinden (Embed Code Generator)',
    issues: [
      {
        title: 'Embed: WhatsApp-Link und Test-Seite Buttons bereits behoben',
        description: `**Status:** ✅ Bereits behoben
Die Buttons wurden bereits korrigiert (siehe vorherige Fixes).

**Betroffene Dateien:**
- \`components/widget/EmbedCodeGenerator.tsx\` (Zeile 725-749)

**Hinweis:** MCP-System sollte Pattern \`whatsapp-link-button-issue\` bereits erkennen.`,
        severity: 'low',
        category: 'other',
        affectedFiles: ['components/widget/EmbedCodeGenerator.tsx'],
      },
      {
        title: 'Embed: Widget-Script könnte CORS-Probleme haben',
        description: `**Problem:**
\`widget.js\` wird von verschiedenen Domains geladen, könnte CORS-Probleme haben.

**Betroffene Dateien:**
- \`public/widget.js\`
- \`app/[locale]/widget/embed/page.tsx\`

**Lösung:**
- CORS-Headers in API-Routen prüfen
- CSP-Headers anpassen
- Cross-Origin-Isolation prüfen`,
        severity: 'medium',
        category: 'integration',
        affectedFiles: ['public/widget.js', 'app/[locale]/widget/embed/page.tsx'],
      },
    ],
  },
  {
    feature: 'Einstellungen (Settings)',
    issues: [
      {
        title: 'Settings: WhatsApp Setup Wizard existiert',
        description: `**Status:** ✅ Komponente existiert
\`WhatsAppSetupWizard.tsx\` wurde gefunden und ist implementiert.

**Betroffene Dateien:**
- \`components/bots/BotDetail.tsx\` (Zeile 16, 318-327)
- \`components/bots/WhatsAppSetupWizard.tsx\` (existiert)

**Hinweis:** Funktionalität sollte getestet werden.`,
        severity: 'low',
        category: 'other',
        affectedFiles: [
          'components/bots/BotDetail.tsx',
          'components/bots/WhatsAppSetupWizard.tsx',
        ],
      },
      {
        title: 'Settings: Bot-Status Toggle hat keine Optimistic Updates',
        description: `**Problem:**
Status-Toggle (Zeile 112-138) aktualisiert UI erst nach erfolgreichem API-Call. Keine Optimistic Updates.

**Betroffene Dateien:**
- \`components/bots/BotDetail.tsx\` (Zeile 112-138)

**Lösung:**
- Optimistic Updates implementieren
- Rollback bei Fehler
- Loading State während Update`,
        severity: 'low',
        category: 'ux',
        affectedFiles: ['components/bots/BotDetail.tsx'],
      },
    ],
  },
];

async function main() {
  console.log('🔍 Analysiere Bot-Features und erstelle Support-Tickets...\n');

  let totalIssues = 0;
  let ticketsCreated = 0;
  let ticketsFailed = 0;

  for (const featureAnalysis of analysis) {
    console.log(`\n📋 Feature: ${featureAnalysis.feature}`);
    console.log(`   Gefundene Probleme: ${featureAnalysis.issues.length}`);

    for (const issue of featureAnalysis.issues) {
      totalIssues++;
      console.log(`\n   🐛 Problem: ${issue.title}`);
      console.log(`      Severity: ${issue.severity}, Category: ${issue.category}`);

      const result = await createSupportTicket({
        category: issue.category,
        title: issue.title,
        description: issue.description,
        sourceMetadata: {
          source: 'cursor_ai',
          component: issue.affectedFiles?.[0] || 'unknown',
          type: 'feature_analysis',
          severity: issue.severity,
          feature: featureAnalysis.feature,
          affectedFiles: issue.affectedFiles || [],
        },
        locale: 'de',
      });

      if (result.success) {
        ticketsCreated++;
        console.log(`      ✅ Ticket erstellt: ${result.ticketId}`);
      } else {
        ticketsFailed++;
        console.error(`      ❌ Fehler: ${result.error}`);
      }
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📊 Zusammenfassung:`);
  console.log(`   Gesamt Probleme: ${totalIssues}`);
  console.log(`   ✅ Tickets erstellt: ${ticketsCreated}`);
  if (ticketsFailed > 0) {
    console.log(`   ❌ Fehler: ${ticketsFailed}`);
  }
  console.log(`🔗 Tickets ansehen: https://whatsapp.owona.de/de/intern`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main().catch((error) => {
  console.error('❌ Unerwarteter Fehler:', error);
  process.exit(1);
});

