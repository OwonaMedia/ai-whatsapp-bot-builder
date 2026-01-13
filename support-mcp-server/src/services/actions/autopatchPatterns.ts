import type { ResolutionAction } from '../llmClient.js';

export type AutoFixInstruction =
  | {
      type: 'i18n-add-key';
      key: string;
      translations: Record<string, string>;
    }
  | {
      type: 'clone-locale-file';
      locale: string;
      baseLocale?: string;
      strategy?: 'copy' | 'empty';
    }
  | {
      type: 'env-add-placeholder';
      key: string;
      value: string;
      comment?: string;
      file?: string;
    }
  | {
      type: 'code-modify';
      file: string;
      modifications: Array<{
        action: 'replace' | 'remove' | 'add';
        search: string | RegExp;
        replace?: string;
        after?: string;
        before?: string;
        description: string;
      }>;
    }
  | {
      type: 'create-file';
      file: string;
      content: string;
      description: string;
    }
  | {
      type: 'hetzner-command';
      command: string;
      description: string;
      requiresApproval: boolean;
      whitelistCheck: boolean;
    }
  | {
      type: 'supabase-migration';
      sql: string;
      migrationName: string;
      description: string;
      requiresApproval: boolean;
    }
  | {
      type: 'supabase-rls-policy';
      policyName: string;
      tableName: string;
      sql: string;
      description: string;
      requiresApproval: boolean;
    };

export interface AutopatchCandidate {
  patternId: string;
  summary: string;
  actions: ResolutionAction[];
  customerMessage: string;
  autoFixInstructions?: AutoFixInstruction[];
}

export interface MinimalTicket {
  title?: string | null;
  description?: string | null;
  category?: string | null;
  source_metadata?: Record<string, unknown> | null;
}

interface AutopatchPattern {
  id: string;
  match: (ticket: MinimalTicket, combinedText: string) => AutopatchCandidate | null;
}

function ensureString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function slugify(input: string, prefix: string): string {
  return `${prefix}-${input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)}`;
}

const autopatchPatterns: AutopatchPattern[] = [
  {
    id: 'missing-translation',
    match: (_ticket, text) => {
      const match = text.match(/MISSING_MESSAGE:\s*([A-Za-z0-9._-]+)/i);
      if (!match) {
        return null;
      }

      const key = match[1];
      const summary = `Autopatch: Übersetzungseintrag "${key}" ergänzen.`;
      const fixName = slugify(key, 'i18n');

      const action: ResolutionAction = {
        type: 'autopatch_plan',
        description: summary,
        payload: {
          fixName,
          goal: `Fehlenden i18n-Key "${key}" in allen Sprachdateien ergänzen.`,
          targetFiles: ['messages/de.json', 'messages/en.json', 'messages/fr.json', 'messages/sw.json'],
          steps: [
            `In allen messages/*.json den Key "${key}" mit korrekten Übersetzungen ergänzen.`,
            'QA: Relevante Seite neu laden und prüfen, dass keine MISSING_MESSAGE-Hinweise erscheinen.',
          ],
          validation: ['`npm run lint`', 'Manueller QA-Check im betroffenen Formular.'],
          rollout: ['`npm run build`', '`pm2 restart whatsapp-bot-builder --update-env`'],
        },
      };

      return {
        patternId: 'missing-translation',
        summary,
        actions: [action],
        customerMessage:
          'Danke für den Hinweis! Wir haben umgehend einen Fix vorbereitet, der den fehlenden Text im Eingabeformular ergänzt. Sobald das Update live ist, melden wir uns erneut.',
        autoFixInstructions: [
          {
            type: 'i18n-add-key',
            key,
            translations: {
              de: 'Text hinzufügen',
              en: 'Add text',
              fr: 'Ajouter du texte',
              sw: 'Ongeza maandishi',
            },
          },
        ],
      };
    },
  },
  {
    id: 'type-error-null-guard',
    match: (_ticket, text) => {
      const match = text.match(/Cannot (?:read|set) (?:properties|property) of (?:undefined|null)/i);
      if (!match) {
        return null;
      }

      const summary = 'Autopatch: Null-Safety für betroffene Komponente implementieren.';
      const action: ResolutionAction = {
        type: 'autopatch_plan',
        description: summary,
        payload: {
          fixName: slugify('null-guard', 'frontend'),
          goal: 'Null- und Undefined-Zugriffe in der betroffenen Komponente vermeiden.',
          targetFiles: ['<STACKTRACE_DATEI_ERMITTELN>'],
          steps: [
            'Stacktrace in Browserkonsole/Logs analysieren, betroffene Datei und Zeile identifizieren.',
            'Null-/Undefined-Prüfungen einbauen (optional chaining oder Fallback-Werte).',
            'Reproduktionspfad aus dem Ticket nachspielen und sicherstellen, dass der Fehler nicht mehr auftritt.',
          ],
          validation: ['`npm run lint`', '`npm run test` (falls verfügbar)', 'Manuelle QA entlang des Reproduktionspfads.'],
          rollout: ['`npm run build`', '`pm2 restart whatsapp-bot-builder --update-env`'],
        },
      };

      return {
        patternId: 'type-error-null-guard',
        summary,
        actions: [action],
        customerMessage:
          'Danke für das Feedback! Wir haben eine Null-Safety-Anpassung vorbereitet, damit der Fehler nicht mehr auftritt. Nach dem Rollout erhältst du ein Update.',
      };
    },
  },
  {
    id: 'reference-error-missing-import',
    match: (_ticket, text) => {
      const match = text.match(/ReferenceError:\s+([A-Za-z0-9_$\.]+)\s+is\s+not\s+defined/i);
      if (!match) {
        return null;
      }

      const identifier = match[1];
      const summary = `Autopatch: Fehlende Referenz "${identifier}" beheben.`;
      const action: ResolutionAction = {
        type: 'autopatch_plan',
        description: summary,
        payload: {
          fixName: slugify(identifier, 'missing-import'),
          goal: `Die Referenz "${identifier}" korrekt importieren oder initialisieren.`,
          targetFiles: ['<STACKTRACE_DATEI_ERMITTELN>'],
          steps: [
            'Stacktrace analysieren und Datei/Zeile identifizieren, in der die Referenz fehlt.',
            `Import/Definition für "${identifier}" ergänzen oder Initialisierung sicherstellen.`,
            'QA: Funktion erneut aufrufen und sicherstellen, dass kein ReferenceError mehr auftritt.',
          ],
          validation: ['`npm run lint`', 'Manuelle QA basierend auf dem reproduzierten Ablauf.'],
          rollout: ['`npm run build`', '`pm2 restart whatsapp-bot-builder --update-env`'],
        },
      };

      return {
        patternId: 'reference-error-missing-import',
        summary,
        actions: [action],
        customerMessage:
          'Danke für die Meldung! Wir haben den fehlenden Import/Definition vorbereitet. Nach dem Deployment informieren wir dich erneut.',
      };
    },
  },
  {
    id: 'network-fetch-failed',
    match: (ticket, text) => {
      const match = text.match(/(Failed to fetch|NetworkError|net::ERR_FAILED|502|504|ECONNREFUSED)/i);
      if (!match) {
        return null;
      }

      const summary = 'Autopatch: Netzwerk-/API-Verfügbarkeit absichern.';
      const action: ResolutionAction = {
        type: 'autopatch_plan',
        description: summary,
        payload: {
          fixName: slugify('api-availability', 'network'),
          goal: 'API-Endpunkte stabilisieren bzw. besser abfangen.',
          targetFiles: ['lib/api', 'app/api/*'],
          steps: [
            'API-Status im Monitoring prüfen (Statuspages, Logs).',
            'Fallback/Retry-Logik in den betroffenen Fetch-Aufrufen ergänzen.',
            'CORS/Proxy-Konfiguration verifizieren (Caddy/Next.js).',
            'Timeouts und Error-UI für Nutzer verbessern.',
          ],
          validation: [
            'Monitoring: Erfolgreiche Requests nach Deployment prüfen.',
            'Manuelle QA: betroffenen Flow erneut durchspielen.',
          ],
          rollout: ['`npm run build`', '`pm2 restart whatsapp-bot-builder --update-env`'],
        },
      };

      const locale = ensureString(ticket.source_metadata?.locale, 'de');
      const customerMessage =
        locale.startsWith('de') || locale === ''
          ? 'Danke für den Hinweis! Wir haben die Netzwerk-/API-Überwachung aktiviert und einen Fix vorbereitet. Sobald das stabil läuft, bekommst du ein Update.'
          : 'Thank you! We initiated an automatic fix to stabilize the network/API call and will update you once it is deployed.';

      return {
        patternId: 'network-fetch-failed',
        summary,
        actions: [action],
        customerMessage,
      };
    },
  },
  {
    id: 'missing-locale-file',
    match: (_ticket, text) => {
      const match = text.match(/messages\/([a-z]{2}(?:-[a-z]{2})?)\.json['"]/i);
      if (!match && !text.toLowerCase().includes('missing locale file')) {
        return null;
      }

      const locale = match ? match[1] : 'unknown';
      if (!locale || locale === 'de') {
        return null;
      }

      const summary = `Autopatch: Locale-Datei für "${locale}" anlegen.`;
      const action: ResolutionAction = {
        type: 'autopatch_plan',
        description: summary,
        payload: {
          fixName: slugify(locale, 'missing-locale'),
          goal: `Fallback-Übersetzungsdatei für Locale "${locale}" erstellen.`,
          targetFiles: [`messages/${locale}.json`],
          steps: [
            `Standard-Locale (de) nach "${locale}" kopieren.`,
            `Sicherstellen, dass alle Schlüssel vorhanden sind.`,
            `QA: Locale im Frontend testen (Sprachauswahl, UI-Labels).`,
          ],
          validation: ['`npm run lint`', '`npm run build`', 'Manuelle QA: Sprache wechseln.'],
          rollout: ['`npm run build`', '`pm2 restart whatsapp-bot-builder --update-env`'],
        },
      };

      return {
        patternId: 'missing-locale-file',
        summary,
        actions: [action],
        customerMessage:
          'Wir haben eine Standard-Übersetzungsdatei für die gewünschte Sprache angelegt und deployen den Fix. Bitte nach dem Rollout erneut testen.',
        autoFixInstructions: [
          {
            type: 'clone-locale-file',
            locale,
            baseLocale: 'de',
            strategy: 'copy',
          },
        ],
      };
    },
  },
  {
    id: 'missing-env-variable',
    match: (_ticket, text) => {
      const envMatch =
        text.match(/Missing(?: required)? environment variable[:\s]+([A-Z0-9_]+)/i) ??
        text.match(/process\.env\.([A-Z0-9_]+)\s+(?:is|was)\s+(?:undefined|not set)/i);
      if (!envMatch) {
        return null;
      }

      const key = envMatch[1];
      const summary = `Autopatch: Umgebungsvariable "${key}" ergänzen.`;
      const action: ResolutionAction = {
        type: 'autopatch_plan',
        description: summary,
        payload: {
          fixName: slugify(key, 'missing-env'),
          goal: `Sicherstellen, dass "${key}" in der Server-Konfiguration gesetzt ist.`,
          targetFiles: ['.env.local'],
          steps: [
            `Platzhalter für ${key} in .env.local ergänzen.`,
            'Reverse Engineering Dokumentation prüfen und korrekte Werte nachtragen.',
            'PM2-Umgebung nachziehen (`pm2 restart whatsapp-bot-builder --update-env`).',
          ],
          validation: ['`npm run build`', 'API-/Checkout-Flow erneut testen.'],
          rollout: ['`.env.local` aktualisieren', '`pm2 restart whatsapp-bot-builder --update-env`'],
        },
      };

      return {
        patternId: 'missing-env-variable',
        summary,
        actions: [action],
        customerMessage:
          'Wir haben einen Platzhalter für die fehlende Systemvariable gesetzt. Bitte trage danach den finalen Wert ein und gib uns kurz Bescheid, damit wir deployen können.',
        autoFixInstructions: [
          {
            type: 'env-add-placeholder',
            key,
            value: `FIXME_${key}`,
            comment: `# TODO: Bitte ${key} mit gültigem Wert ersetzen.`,
            file: '.env.local',
          },
        ],
      };
    },
  },
  {
    id: 'whatsapp-link-button-issue',
    match: (ticket, text) => {
      const match = text.match(/(whatsapp.*link|test.*seite|button.*öffnet|öffnet.*falsch)/i);
      if (!match) {
        return null;
      }

      const summary = 'Autopatch: WhatsApp-Link und Test-Seite Button URLs korrigieren.';
      const action: ResolutionAction = {
        type: 'autopatch_plan',
        description: summary,
        payload: {
          fixName: slugify('whatsapp-link-button-fix', 'frontend'),
          goal: 'Button-URLs in EmbedCodeGenerator.tsx korrigieren - WhatsApp-Link und Test-Seite vertauscht.',
          targetFiles: ['components/widget/EmbedCodeGenerator.tsx'],
          steps: [
            'Prüfe onClick-Handler für beide Buttons',
            'Stelle sicher, dass embedUrl korrekt mit /de/widget/embed?botId= generiert wird',
            'Test-Seite Button sollte /test-widget.html?bot-id= öffnen',
            'Buttons von <a> zu <button> ändern, falls nötig',
          ],
          validation: ['Manuelle QA: Beide Buttons testen', 'Browser-Konsole auf Fehler prüfen'],
          rollout: ['`npm run build`', '`pm2 restart whatsapp-bot-builder --update-env`'],
        },
      };

      return {
        patternId: 'whatsapp-link-button-issue',
        summary,
        actions: [action],
        customerMessage:
          'Danke für den Hinweis! Wir haben einen Fix vorbereitet, der die Button-URLs korrigiert. Sobald das Update live ist, funktionieren beide Buttons korrekt.',
      };
    },
  },
  {
    id: 'realtime-quota-exceeded',
    match: (ticket, text) => {
      const match = text.match(/(realtime.*quota|realtime.*message.*count|realtime.*deaktiviert|polling.*statt)/i);
      if (!match) {
        return null;
      }

      const summary = 'Autopatch: Realtime-Optimierung - Nur für aktives Ticket aktivieren.';
      const action: ResolutionAction = {
        type: 'autopatch_plan',
        description: summary,
        payload: {
          fixName: slugify('realtime-optimization', 'frontend'),
          goal: 'Realtime nur für aktives Ticket aktivieren, nicht für alle Tickets gleichzeitig.',
          targetFiles: ['app/[locale]/support/messages/SupportMessagesClient.tsx', 'lib/supabaseFactory.ts'],
          steps: [
            'Realtime-Subscription nur bei selectedTicketId aktivieren',
            'Channel-Subscription auf support_ticket_messages des aktuellen Tickets beschränken',
            'Cleanup verbessern (Channel wird korrekt entfernt)',
            'Polling als Fallback beibehalten (alle 8 Sekunden)',
          ],
          validation: ['Supabase Dashboard: Realtime Message Count prüfen', 'Manuelle QA: Ticket-Updates testen'],
          rollout: ['`npm run build`', '`pm2 restart whatsapp-bot-builder --update-env`'],
        },
      };

      return {
        patternId: 'realtime-quota-exceeded',
        summary,
        actions: [action],
        customerMessage:
          'Wir optimieren die Realtime-Nutzung, damit Updates schneller ankommen und die Quota nicht überschritten wird. Das Update wird in Kürze ausgerollt.',
      };
    },
  },
  {
    id: 'pdf-content-not-recognized',
    match: (ticket, text) => {
      const match = text.match(/(pdf.*wird.*nicht.*erkannt|pdf.*inhalt|llm.*erkennt.*pdf|rag.*playground.*pdf)/i);
      if (!match) {
        return null;
      }

      const summary = 'Autopatch: PDF-Verarbeitung und Embeddings-Generierung verbessern.';
      const action: ResolutionAction = {
        type: 'autopatch_plan',
        description: summary,
        payload: {
          fixName: slugify('pdf-embedding-fix', 'api'),
          goal: 'PDF-Inhalte werden korrekt verarbeitet und Embeddings generiert.',
          targetFiles: [
            'app/api/knowledge/upload/route.ts',
            'app/api/knowledge/embeddings/route.ts',
            'app/api/knowledge/chat/route.ts',
          ],
          steps: [
            'Prüfe Hugging Face API-Endpoint (router.huggingface.co)',
            'Stelle sicher, dass chunkText keine Infinite Loops hat',
            'Embeddings werden synchron nach PDF-Verarbeitung generiert',
            'Fallback zu hash-based embeddings wenn API fehlschlägt',
          ],
          validation: ['PDF hochladen und testen', 'RAG Chat mit PDF-Inhalt testen'],
          rollout: ['`npm run build`', '`pm2 restart whatsapp-bot-builder --update-env`'],
        },
      };

      return {
        patternId: 'pdf-content-not-recognized',
        summary,
        actions: [action],
        customerMessage:
          'Wir haben einen Fix vorbereitet, der die PDF-Verarbeitung verbessert. Nach dem Update sollten PDF-Inhalte korrekt erkannt werden.',
      };
    },
  },
  {
    id: 'bot-builder-load-error',
    match: (ticket, text) => {
      const match = text.match(/(bot.*builder.*lädt.*nicht|bot.*bearbeiten.*fehler|flow.*daten.*fehlen|botbuilder.*error)/i);
      if (!match) {
        return null;
      }

      const summary = 'Autopatch: BotBuilder lädt Flow-Daten nicht korrekt.';
      const action: ResolutionAction = {
        type: 'autopatch_plan',
        description: summary,
        payload: {
          fixName: slugify('bot-builder-load-fix', 'frontend'),
          goal: 'BotBuilder lädt initialFlow korrekt und setzt botId für alle Nodes.',
          targetFiles: ['components/bot-builder/BotBuilder.tsx'],
          steps: [
            'Prüfe initialFlow-Loading in useEffect',
            'Stelle sicher, dass botId für alle Nodes gesetzt wird',
            'Prüfe Hydration-Mismatches',
            'Teste Auto-Save Funktionalität',
          ],
          validation: ['Bot erstellen und bearbeiten testen', 'Flow speichern und neu laden'],
          rollout: ['`npm run build`', '`pm2 restart whatsapp-bot-builder --update-env`'],
        },
      };

      return {
        patternId: 'bot-builder-load-error',
        summary,
        actions: [action],
        customerMessage:
          'Wir haben einen Fix vorbereitet, der das Laden der Bot-Daten verbessert. Nach dem Update sollte der Bot-Builder korrekt funktionieren.',
      };
    },
  },
  {
    id: 'analytics-data-missing',
    match: (ticket, text) => {
      const match = text.match(/(analytics.*daten.*fehlen|analytics.*zeigt.*nichts|conversations.*undefined|messages.*undefined|csv.*export.*fehler)/i);
      if (!match) {
        return null;
      }

      const summary = 'Autopatch: Analytics-Daten werden nicht korrekt geladen oder angezeigt.';
      const action: ResolutionAction = {
        type: 'autopatch_plan',
        description: summary,
        payload: {
          fixName: slugify('analytics-data-fix', 'frontend'),
          goal: 'Analytics-Daten werden korrekt aus Supabase geladen und angezeigt.',
          targetFiles: [
            'app/[locale]/bots/[id]/analytics/page.tsx',
            'components/analytics/AnalyticsDashboard.tsx',
          ],
          steps: [
            'Prüfe Supabase-Queries für analytics, conversations, messages',
            'Stelle sicher, dass Variablen vor Verwendung definiert sind',
            'Error-Handling für fehlende Daten hinzufügen',
            'Empty States für fehlende Daten implementieren',
          ],
          validation: ['Analytics-Seite öffnen', 'CSV-Export testen'],
          rollout: ['`npm run build`', '`pm2 restart whatsapp-bot-builder --update-env`'],
        },
      };

      return {
        patternId: 'analytics-data-missing',
        summary,
        actions: [action],
        customerMessage:
          'Wir haben einen Fix vorbereitet, der die Analytics-Daten korrekt lädt und anzeigt. Nach dem Update sollten alle Statistiken sichtbar sein.',
      };
    },
  },
  {
    id: 'pdf-worker-module-not-found',
    match: (ticket, text) => {
      // Erweiterte Pattern-Erkennung für PDF-Upload-Probleme
      const match = text.match(/(pdf.*worker.*module|worker.*module.*not.*found|cannot.*find.*module.*pdf|pdf\.worker\.mjs|pdf\.worker\.js|worker.*nicht.*gefunden|pdf.*upload.*fehlgeschlagen.*worker|pdf.*upload.*nicht.*möglich|pdf.*auf.*hauptseite.*upload|pdf.*hochladen.*fehler|pdf.*wird.*nicht.*hochgeladen|pdf.*upload.*funktioniert.*nicht)/i);
      if (!match) {
        return null;
      }

      const summary = 'Autopatch: PDF Worker-Modul nicht gefunden - Fix für pdf-parse Worker-Pfad.';
      const action: ResolutionAction = {
        type: 'autopatch_plan',
        description: summary,
        payload: {
          fixName: slugify('pdf-worker-module-fix', 'api'),
          goal: 'PDF Worker-Modul-Fehler beheben - pdf-parse Worker korrekt konfigurieren.',
          targetFiles: [
            'lib/pdf/parsePdf.ts',
            'app/api/knowledge/upload/route.ts',
            'package.json',
          ],
          steps: [
            'Prüfe ob pdf-parse in package.json vorhanden ist',
            'Entferne explizite Worker-Pfad-Referenzen aus parsePdf.ts',
            'Stelle sicher, dass pdf-parse automatisch Worker lädt',
            'Falls nötig: Worker-Pfad zur Build-Konfiguration hinzufügen',
            'Teste PDF-Upload nach Fix',
          ],
          validation: [
            'PDF hochladen testen',
            'Browser-Konsole auf Worker-Fehler prüfen',
            'RAG Chat mit PDF-Inhalt testen',
          ],
          rollout: ['`npm install`', '`npm run build`', '`pm2 restart whatsapp-bot-builder --update-env`'],
        },
      };

      return {
        patternId: 'pdf-worker-module-not-found',
        summary,
        actions: [action],
        customerMessage:
          'Wir haben das PDF Worker-Modul-Problem erkannt und einen Fix vorbereitet. Nach dem Update sollte der PDF-Upload wieder funktionieren.',
      };
    },
  },
  {
    id: 'knowledge-upload-failed',
    match: (ticket, text) => {
      const match = text.match(/(wissensquelle.*upload.*fehlgeschlagen|pdf.*upload.*fehler|pdf.*hochladen.*(fehler|schiefgelaufen|fehlgeschlagen)|knowledge.*source.*error|embedding.*generierung.*fehler|etwas.*ist.*schiefgelaufen.*pdf|fehler.*aufgetreten.*pdf|wissensquelle.*fehler|pdf.*wird.*nicht.*hochgeladen)/i);
      if (!match) {
        return null;
      }

      // WICHTIG: PDF Worker-Modul hat Priorität - nicht doppelt matchen
      if (text.match(/(pdf.*worker|worker.*module|cannot.*find.*module.*pdf)/i)) {
        return null;
      }

      const summary = 'Autopatch: Wissensquellen-Upload oder Embeddings-Generierung fehlgeschlagen.';
      const action: ResolutionAction = {
        type: 'autopatch_plan',
        description: summary,
        payload: {
          fixName: slugify('knowledge-upload-fix', 'api'),
          goal: 'Wissensquellen-Upload und Embeddings-Generierung funktionieren korrekt.',
          targetFiles: [
            'app/api/knowledge/upload/route.ts',
            'app/api/knowledge/embeddings/route.ts',
            'components/knowledge/KnowledgeManagement.tsx',
          ],
          steps: [
            'Prüfe PDF-Verarbeitung (chunkText, parsePdfBuffer)',
            'Prüfe Embeddings-API (Hugging Face, Fallback)',
            'Stelle sicher, dass Status-Updates korrekt sind',
            'Polling optimieren (nur für processing Quellen)',
          ],
          validation: ['PDF hochladen', 'Status prüfen', 'RAG Chat testen'],
          rollout: ['`npm run build`', '`pm2 restart whatsapp-bot-builder --update-env`'],
        },
      };

      return {
        patternId: 'knowledge-upload-failed',
        summary,
        actions: [action],
        customerMessage:
          'Wir haben einen Fix vorbereitet, der den Upload und die Verarbeitung von Wissensquellen verbessert. Nach dem Update sollten PDFs und andere Quellen korrekt verarbeitet werden.',
      };
    },
  },
  {
    id: 'embed-code-invalid',
    match: (ticket, text) => {
      const match = text.match(/(embed.*code.*falsch|widget.*url.*fehler|bot.*einbinden.*funktioniert.*nicht|widget.*script.*lädt.*nicht)/i);
      if (!match) {
        return null;
      }

      const summary = 'Autopatch: Embed-Code generiert falsche URLs oder Widget lädt nicht.';
      const action: ResolutionAction = {
        type: 'autopatch_plan',
        description: summary,
        payload: {
          fixName: slugify('embed-code-fix', 'frontend'),
          goal: 'Embed-Code generiert korrekte URLs und Widget lädt korrekt.',
          targetFiles: [
            'components/widget/EmbedCodeGenerator.tsx',
            'app/[locale]/widget/embed/page.tsx',
            'public/widget.js',
          ],
          steps: [
            'Prüfe URL-Generierung (embedUrl, widgetUrl)',
            'Prüfe WhatsApp-Link und Test-Seite Buttons',
            'Prüfe widget.js für CORS-Probleme',
            'Teste alle Code-Beispiele',
          ],
          validation: ['Embed-Code generieren', 'Links testen', 'Widget testen'],
          rollout: ['`npm run build`', '`pm2 restart whatsapp-bot-builder --update-env`'],
        },
      };

      return {
        patternId: 'embed-code-invalid',
        summary,
        actions: [action],
        customerMessage:
          'Wir haben einen Fix vorbereitet, der die Embed-Code-Generierung korrigiert. Nach dem Update sollten alle Links und Code-Beispiele korrekt funktionieren.',
      };
    },
  },
  {
    id: 'bot-settings-save-failed',
    match: (ticket, text) => {
      const match = text.match(/(bot.*einstellungen.*speichern.*fehler|whatsapp.*setup.*fehlgeschlagen|bot.*status.*toggle.*fehler|settings.*save.*error)/i);
      if (!match) {
        return null;
      }

      const summary = 'Autopatch: Bot-Einstellungen werden nicht gespeichert oder WhatsApp Setup fehlgeschlagen.';
      const action: ResolutionAction = {
        type: 'autopatch_plan',
        description: summary,
        payload: {
          fixName: slugify('bot-settings-fix', 'frontend'),
          goal: 'Bot-Einstellungen werden korrekt gespeichert und WhatsApp Setup funktioniert.',
          targetFiles: [
            'components/bots/BotDetail.tsx',
            'components/bots/WhatsAppSetupWizard.tsx',
          ],
          steps: [
            'Prüfe Bot-Status Toggle (handleToggleStatus)',
            'Prüfe WhatsApp Setup Wizard',
            'Optimistic Updates implementieren',
            'Error-Handling verbessern',
          ],
          validation: ['Status toggle testen', 'WhatsApp Setup durchführen'],
          rollout: ['`npm run build`', '`pm2 restart whatsapp-bot-builder --update-env`'],
        },
      };

      return {
        patternId: 'bot-settings-save-failed',
        summary,
        actions: [action],
        customerMessage:
          'Wir haben einen Fix vorbereitet, der das Speichern der Bot-Einstellungen verbessert. Nach dem Update sollten alle Änderungen korrekt gespeichert werden.',
      };
    },
  },
];

export function matchAutopatchPattern(ticket: MinimalTicket): AutopatchCandidate | null {
  const combined = `${ticket.title ?? ''} ${ticket.description ?? ''} ${(ticket as any)?.latest_message ?? ''}`
    .toString()
    .trim();

  if (!combined) {
    return null;
  }

  for (const pattern of autopatchPatterns) {
    const candidate = pattern.match(ticket, combined);
    if (candidate) {
      return candidate;
    }
  }

  return null;
}

