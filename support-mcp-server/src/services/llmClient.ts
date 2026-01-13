import OpenAI from 'openai';
import type { Logger } from '../utils/logger.js';
import type { KnowledgeDocument } from './knowledgeBase.js';
import type { SupportConfig } from './config.js';
import type { AgentProfile } from './agentProfiles.js';

const TIER2_STRATEGIES: Partial<Record<AgentProfile['id'], string>> = {
  'supabase-analyst-agent': `
### Tier-2-Strategie: Supabase Analyst
- Kontext sammeln: Ticketverlauf, letzte DB-Aktionen, relevante Logs.
- Reverse-Engineering Kapitel "05_SECURITY", "08_FEATURES", SQL-Migrationen heranziehen.
- Diagnose-Reihenfolge:
  1. Auth/Sitzungen verifizieren (auth.users, auth.sessions, profiles).
  2. Policies & Trigger prüfen (handle_new_user, create_free_subscription).
  3. Fehler reproduzieren (RPC, Auth-Methoden, RLS).
- Verwende das Ergebnis von support_supabase_diagnostics() und ergänze es um gezielte Checks.
- Erzeuge nur Aktionen mit payload.operation aus ['auth_consistency','subscription_health','audit_log_review'].
- Reparatur-Schritte:
  - SQL/Migration in Dry-Run prüfen (EXPLAIN/BEGIN…ROLLBACK).
  - Bei Erfolg live anwenden, Änderungen protokollieren.
  - Nachfix: Reproduktionsschritt erneut durchführen.
- Dokumentation:
  - Ursachenanalyse, ausgeführte SQL/Trigger, Validierungsergebnis.
  - Empfohlene Kundenkommunikation an Tier 1 formulieren.
`,
  'hetzner-ops-agent': `
### Tier-2-Strategie: Hetzner Ops
- Kontext: Deployment-Status, letzte PM2 Logs, Monitoring-Snapshot.
- Diagnose-Reihenfolge:
  1. Ressourcen prüfen (uptime, df -h, free -m, top).
  2. Logs (journalctl -u caddy / pm2 logs whatsapp-bot-builder).
  3. Netzwerk/Ports (ss -tulpen, Firewall).
- Reparatur:
  - Dienste gezielt neu starten (pm2 restart …, systemctl reload caddy).
  - Deployment durchführen falls nötig (npm install --omit=dev --legacy-peer-deps && npm run build).
  - Änderungen dokumentieren (Ort, Datei, Backup).
- Dokumentation:
  - Root Cause, ausgeführte Kommandos, Ergebnis, Follow-up.
`,
  'frontend-diagnostics-agent': `
### Tier-2-Strategie: Frontend Diagnostics
- Kontext: Build-Fehler, Digest-IDs, betroffene Seiten.
- Diagnose-Reihenfolge:
  1. npm run build / lint / test ausführen, Fehler protokollieren.
  2. .next/server/chunks auf Referenzen durchsuchen.
  3. CSP/Asset-Lieferung prüfen (next.config.js, Network Logs).
- Reparatur:
  - Fix im Workspace (Cursor) vorbereiten, Tests erneut laufen lassen.
  - Deployment-Schritte gemäß reverse-engineering/07_DEPLOYMENT.md (rsync, npm run build, pm2 restart).
  - Ergebnis mit Live-Check (curl/Screenshot) validieren.
- Dokumentation:
  - Ursache, Fix (Dateien/Commits), QA-Schritte für Tier 1/Kunden.
`,
};

export interface ResolutionAction {
  type: 'supabase_query' | 'hetzner_command' | 'ux_update' | 'manual_followup' | 'autopatch_plan';
  description: string;
  payload?: Record<string, unknown>;
}

export interface ResolutionPlan {
  status: 'resolved' | 'waiting_customer';
  summary: string;
  actions: ResolutionAction[];
}

function stringifyMetadata(metadata: Record<string, unknown> | null | undefined, maxLength = 800) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return 'Keine zusätzlichen Metadaten übermittelt.';
  }

  const json = JSON.stringify(metadata, null, 2);
  if (json.length <= maxLength) {
    return json;
  }

  return `${json.slice(0, maxLength)}… (gekürzt)`;
}

export class LlmClient {
  private readonly openai: OpenAI | null;

  constructor(private readonly config: SupportConfig, private readonly logger: Logger) {
    this.openai = config.GROQ_API_KEY
      ? new OpenAI({
          apiKey: config.GROQ_API_KEY,
          baseURL: 'https://api.groq.com/openai/v1',
        })
      : null;
  }

  async generatePlan(input: {
    agent: AgentProfile;
    ticket: {
      id: string;
      title: string;
      description: string;
      category: string | null;
      priority: string;
      metadata: Record<string, unknown> | null;
    };
    knowledge: KnowledgeDocument[];
  }): Promise<ResolutionPlan> {
    if (!this.openai) {
      this.logger.warn('GROQ_API_KEY nicht gesetzt – benutze Fallback-Plan');
      return {
        status: 'waiting_customer',
        summary:
          'Vielen Dank für die Meldung! Unser Support-Team analysiert das Problem und meldet sich in Kürze mit einem Update.',
        actions: [
          {
            type: 'manual_followup',
            description: 'Manuelle Prüfung erforderlich, da keine LLM-Analyse verfügbar.',
          },
        ],
      };
    }

    const prompt = buildPrompt(input.agent, input.ticket, input.knowledge);

    try {
      const llmStartTime = Date.now();
      this.logger.info(
        { 
          agentId: input.agent.id,
          ticketId: input.ticket.id,
          knowledgeCount: input.knowledge.length,
        },
        'LLM-Aufruf gestartet'
      );
      
      const response = await this.openai.responses.create({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2,
        max_output_tokens: 1024,
        input: prompt,
      });

      const llmDuration = Date.now() - llmStartTime;
      this.logger.info(
        { 
          agentId: input.agent.id,
          ticketId: input.ticket.id,
          duration: llmDuration,
        },
        'LLM-Aufruf abgeschlossen'
      );

      const outputText = normalizeResponseOutput(response);
      const parsed = parseResolutionPlan(outputText);

      return {
        status: parsed.status ?? 'waiting_customer',
        summary: parsed.summary ?? 'Analyse abgeschlossen. Ein Mensch prüft den nächsten Schritt.',
        actions: Array.isArray(parsed.actions) ? parsed.actions : [],
      };
    } catch (error) {
      const llmDuration = error instanceof Error && 'llmStartTime' in error 
        ? Date.now() - (error as any).llmStartTime 
        : undefined;
      this.logger.error(
        { 
          err: error,
          duration: llmDuration,
          agentId: input.agent.id,
          ticketId: input.ticket.id,
        },
        'LLM-Analyse fehlgeschlagen'
      );
      return {
        status: 'waiting_customer',
        summary:
          'Ticket wurde erfasst. Die automatische Analyse war nicht erfolgreich. Ein Support-Mitarbeiter übernimmt die weitere Bearbeitung.',
        actions: [
          {
            type: 'manual_followup',
            description: 'LLM-Analyse fehlgeschlagen.',
            payload: {
              error: error instanceof Error ? error.message : 'unknown_error',
            },
          },
        ],
      };
    }
  }
}

function buildPrompt(agent: AgentProfile, ticket: {
  id: string;
  title: string;
  description: string;
  category: string | null;
  priority: string;
  metadata: Record<string, unknown> | null;
}, knowledge: KnowledgeDocument[]) {
  const knowledgeSnippets = knowledge
    .map(
      (doc, index) =>
        `### Quelle ${index + 1}: ${doc.title}\nPfad: ${doc.id}\n---\n${doc.content.slice(0, 800)}`
    )
    .join('\n\n');

  const goals = agent.goals.map((goal, index) => `${index + 1}. ${goal}`).join('\n');
  const actions = agent.allowedActions.map((action) => `- ${action}`).join('\n');
  const tier2Strategy = agent.tier === 'tier2' && agent.id in TIER2_STRATEGIES
    ? `\n### Verbindliche Tier-2-Strategie\n${TIER2_STRATEGIES[agent.id as keyof typeof TIER2_STRATEGIES]}\n`
    : '';

  return `
Du bist ${agent.label} (${agent.tier.toUpperCase()}) für whatsapp.owona.de.
${agent.description}

Arbeitsregeln:
- Nutze zuerst die Reverse-Engineering-Dokumentation und die interne Knowledge Base (siehe Quellen unten).
- Falls diese Informationen nicht ausreichen, dokumentiere das und greife erst dann auf externes Expertenwissen zu. Quellen IMMER angeben.
- Halte dich strikt an die erlaubten Aktionen und produziere nur notwendige Informationen für den Kunden (Tier1) bzw. intern (Tier2).
- Prüfe zuerst, ob die Ticketbeschreibung bereits alle nötigen Details für eine Umsetzung enthält. Nur wenn konkrete Daten fehlen (z. B. IDs, Zugangsdaten, Schritte zum Reproduzieren), frage nach. Generische Rückfragen wie „nenn mir mehr Infos“ sind zu vermeiden.

Ziele:
${goals}

Erlaubte Aktionen:
${actions}

Ticket-Kontext:
- ID: ${ticket.id}
- Titel: ${ticket.title}
- Kategorie: ${ticket.category ?? 'unbekannt'}
- Priorität: ${ticket.priority}
- Beschreibung: ${ticket.description}
- Metadaten: ${stringifyMetadata(ticket.metadata)}

${tier2Strategy}

Relevante Wissensbasis:
${knowledgeSnippets || '- Keine zusätzlichen Quellen gefunden -'}

**Wichtig:** Halte dich an progressive disclosure – technische Details gehören in "actions" oder interne Notizen, nicht direkt in die Kundenkommunikation.

Antworte ausschließlich in diesem JSON-Format:
{
  "status": "resolved" | "waiting_customer",
  "summary": "Deutschsprachige, freundliche Antwort",
  "actions": [
    {
      "type": "supabase_query" | "hetzner_command" | "ux_update" | "manual_followup",
      "description": "Kurze Beschreibung",
      "payload": {}
    }
  ]
}
`;
}

function normalizeResponseOutput(response: any): string {
  if (typeof response.output_text === 'string' && response.output_text.trim().length > 0) {
    return response.output_text.trim();
  }

  const aggregated = ((response.output ?? []) as any[])
    .map((item: any) => {
      if (item.type === 'output_text') {
        return item.text;
      }
      if (item && 'content' in item && Array.isArray(item.content)) {
        return (item.content as any[])
          .map((contentItem: any) => (contentItem && 'text' in contentItem ? contentItem.text : ''))
          .join('\n');
      }
      return '';
    })
    .filter(Boolean)
    .join('\n')
    .trim();

  if (!aggregated) {
    throw new Error('Keine Antwort vom LLM erhalten');
  }

  return aggregated;
}

function parseResolutionPlan(rawText: string): ResolutionPlan {
  const cleaned = rawText
    .replace(/```json/gi, '```')
    .replace(/```/g, '')
    .trim();

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new SyntaxError('Ausgabe enthält kein gültiges JSON');
  }

  const candidate = cleaned.slice(firstBrace, lastBrace + 1);

  try {
    return JSON.parse(candidate) as ResolutionPlan;
  } catch (error) {
    throw new SyntaxError(
      `Konnte JSON nicht parsen: ${(error as Error).message}. Rohtext: ${candidate.slice(0, 500)}`
    );
  }
}

