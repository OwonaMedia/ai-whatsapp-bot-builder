#!/usr/bin/env node

/**
 * ⚠️  Legacy Script
 *
 * Diese Datei bleibt aus Kompatibilitätsgründen bestehen. Der neue,
 * funktionsreiche Support-MCP-Server befindet sich unter:
 * `support-mcp-server/` (TypeScript, Knowledge-Fusion, Automation).
 *
 * Für neue Deployments bitte ausschließlich den TypeScript-Server verwenden.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const REQUIRED_ENV = ['SUPABASE_SERVICE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];

class SupportMCPServer {
  constructor() {
    this.env = this.validateEnv();
    this.supabase = createClient(this.env.SUPABASE_SERVICE_URL, this.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      realtime: {
        params: {
          apikey: this.env.SUPABASE_SERVICE_ROLE_KEY,
          eventsPerSecond: 2,
        },
      },
    });

    this.channel = null;
    this.healthInterval = null;
    this.isShuttingDown = false;
  }

  validateEnv() {
    const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      console.error('[SupportMCP] Fehlende Umgebungsvariablen:', missing.join(', '));
      process.exit(1);
    }

    return {
      SUPABASE_SERVICE_URL: process.env.SUPABASE_SERVICE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      GROQ_API_KEY: process.env.GROQ_API_KEY,
      HETZNER_SSH_HOST: process.env.HETZNER_SSH_HOST,
      HETZNER_SSH_USER: process.env.HETZNER_SSH_USER,
      HETZNER_SSH_KEY_PATH: process.env.HETZNER_SSH_KEY_PATH,
    };
  }

  async start() {
    console.log('[SupportMCP] Starte Support MCP Server...');
    await this.setupRealtimeChannel();
    this.startHealthCheck();
    this.setupGracefulShutdown();
  }

  async setupRealtimeChannel() {
    console.log('[SupportMCP] Initialisiere Realtime-Channel für Support-Tickets...');

    this.channel = this.supabase
      .channel('support-ticket-events', {
        config: {
          presence: {
            key: `support-mcp-${process.pid}`,
          },
        },
      })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_tickets' },
        async (payload) => {
          try {
            await this.handleNewTicket(payload.new);
          } catch (error) {
            console.error('[SupportMCP] Fehler beim Verarbeiten eines Tickets:', error);
          }
        }
      )
      .on('broadcast', { event: 'support_ticket_resolved' }, async (payload) => {
        console.log('[SupportMCP] Broadcast erhalten:', payload.payload);
      })
      .subscribe((status) => {
        console.log('[SupportMCP] Realtime Channel Status:', status);
      });
  }

  startHealthCheck() {
    this.healthInterval = setInterval(() => {
      console.log('[SupportMCP] Healthcheck OK –', new Date().toISOString());
    }, 1000 * 60 * 5); // alle 5 Minuten
  }

  setupGracefulShutdown() {
    const shutdown = async () => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;
      console.log('[SupportMCP] Fahre Support MCP kontrolliert herunter...');

      try {
        if (this.channel) {
          await this.channel.unsubscribe();
        }
      } catch (error) {
        console.error('[SupportMCP] Fehler beim Abmelden vom Realtime-Channel:', error);
      }

      if (this.healthInterval) {
        clearInterval(this.healthInterval);
      }

      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }

  async handleNewTicket(ticket) {
    console.log('[SupportMCP] Neues Ticket empfangen:', ticket.id, ticket.title);

    await this.updateTicketStatus(ticket.id, 'investigating');
    await this.insertSupportMessage(ticket.id, 'system', 'Ticket empfangen. Automatische Diagnose gestartet.');

    const diagnostics = await this.runDiagnostics(ticket);
    const resolutionPlan = await this.generateResolutionPlan(ticket, diagnostics);

    if (resolutionPlan.actions?.length) {
      for (const action of resolutionPlan.actions) {
        await this.executeAction(ticket, action);
      }
    }

    const resolved = resolutionPlan.status === 'resolved';

    if (resolved) {
      await this.updateTicketStatus(ticket.id, 'resolved');
    } else {
      await this.updateTicketStatus(ticket.id, 'waiting_customer');
    }

    await this.insertSupportMessage(
      ticket.id,
      'support',
      resolutionPlan.summary,
      {
        diagnostics,
        plan: resolutionPlan,
        autoResolved: resolved,
      }
    );

    console.log('[SupportMCP] Ticket verarbeitet:', ticket.id);
  }

  async runDiagnostics(ticket) {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      checks: [],
    };

    diagnostics.checks.push({
      name: 'basic_context',
      status: 'ok',
      data: {
        tenant_id: ticket.tenant_id,
        category: ticket.category,
      },
    });

    return diagnostics;
  }

  async generateResolutionPlan(ticket, diagnostics) {
    if (!this.env.GROQ_API_KEY) {
      return {
        status: 'waiting_customer',
        summary:
          'Vielen Dank für deine Meldung! Unser Support-Team hat das Ticket aufgenommen. Ein Experte prüft nun dein Anliegen und meldet sich im Nachrichten-Bereich deines Kontos.',
        actions: [],
      };
    }

    try {
      const prompt = this.buildGroqPrompt(ticket, diagnostics);
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama3-70b-8192',
          messages: [
            { role: 'system', content: 'Du bist ein Support-Automations-Assistent für whatsapp.owona.de.' },
            { role: 'user', content: prompt },
          ],
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API Fehler: ${errorText}`);
      }

      const data = await response.json();
      const message = data.choices?.[0]?.message?.content ?? '';
      const plan = this.parseGroqPlan(message);

      return plan;
    } catch (error) {
      console.error('[SupportMCP] Groq Analyse fehlgeschlagen:', error);
      return {
        status: 'waiting_customer',
        summary:
          'Ticket wurde erfasst. Automatische Analyse konnte nicht abgeschlossen werden. Unser Support-Team schaut sich das Anliegen manuell an.',
        actions: [],
      };
    }
  }

  buildGroqPrompt(ticket, diagnostics) {
    const metadataSnippet = JSON.stringify(ticket.source_metadata ?? {}, null, 2);
    const diagnosticsSnippet = JSON.stringify(diagnostics, null, 2);

    return `
Ticket ID: ${ticket.id}
Kategorie: ${ticket.category}
Titel: ${ticket.title}
Beschreibung: ${ticket.description}
Metadata: ${metadataSnippet}

Diagnostics:
${diagnosticsSnippet}

Bitte antworte mit folgendem JSON-Format:
{
  "status": "resolved" | "waiting_customer",
  "summary": "Zusammenfassung auf Deutsch",
  "actions": [
    {
      "type": "supabase_query" | "hetzner_command" | "ux_update" | "manual_followup",
      "description": "kurze Beschreibung",
      "payload": {...}
    }
  ]
}
`;
  }

  parseGroqPlan(message) {
    try {
      const jsonStart = message.indexOf('{');
      const jsonEnd = message.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error('Kein JSON im Groq-Response gefunden');
      }

      const json = message.slice(jsonStart, jsonEnd + 1);
      const parsed = JSON.parse(json);
      return {
        status: parsed.status ?? 'waiting_customer',
        summary: parsed.summary ?? 'Analyse abgeschlossen.',
        actions: Array.isArray(parsed.actions) ? parsed.actions : [],
      };
    } catch (error) {
      console.error('[SupportMCP] Plan Parsing fehlgeschlagen:', error);
      return {
        status: 'waiting_customer',
        summary:
          'Automatische Analyse durchgeführt. Für die finale Lösung ist eine manuelle Prüfung erforderlich. Unser Team meldet sich zeitnah.',
        actions: [],
      };
    }
  }

  async executeAction(ticket, action) {
    const type = action.type;
    switch (type) {
      case 'supabase_query':
        return this.executeSupabaseQuery(action.payload, ticket);
      case 'hetzner_command':
        return this.executeHetznerCommand(action.payload, ticket);
      case 'ux_update':
        return this.logUxUpdate(action.payload, ticket);
      case 'manual_followup':
      default:
        console.log('[SupportMCP] Aktion erfordert manuelle Nacharbeit:', action);
        await this.insertSupportMessage(ticket.id, 'system', `Manuelle Aktion erforderlich: ${action.description}`, {
          action,
        });
    }
  }

  async executeSupabaseQuery(payload, ticket) {
    if (!payload || !payload.statement) {
      return;
    }

    await this.insertSupportMessage(
      ticket.id,
      'system',
      'Supabase-Aktion vorgeschlagen. Automatisierte Ausführung ist (noch) deaktiviert – bitte manuell prüfen.',
      { action: payload }
    );
  }

  async executeHetznerCommand(payload, ticket) {
    if (!payload || !payload.command) {
      return;
    }

    if (!this.env.HETZNER_SSH_HOST || !this.env.HETZNER_SSH_USER || !this.env.HETZNER_SSH_KEY_PATH) {
      await this.insertSupportMessage(
        ticket.id,
        'system',
        'Automatischer Serverzugriff nicht konfiguriert. Bitte manuell prüfen.',
        { action: payload }
      );
      return;
    }

    const sshKey = this.env.HETZNER_SSH_KEY_PATH;
    if (!fs.existsSync(sshKey)) {
      await this.insertSupportMessage(
        ticket.id,
        'system',
        'SSH-Key für Hetzner nicht gefunden. Bitte manuell prüfen.',
        { action: payload }
      );
      return;
    }

    // TODO: Optional Implementierung mit child_process + ssh
    await this.insertSupportMessage(
      ticket.id,
      'system',
      'Hetzner-Kommando ist geplant. Bitte manuell ausführen oder SSH-Integration aktivieren.',
      { action: payload }
    );
  }

  async logUxUpdate(payload, ticket) {
    await this.insertSupportMessage(ticket.id, 'system', 'UX-Update erforderlich. Ein Designer wird benachrichtigt.', {
      action: payload,
    });
  }

  async updateTicketStatus(ticketId, status) {
    const { error } = await this.supabase
      .from('support_tickets')
      .update({ status })
      .eq('id', ticketId);

    if (error) {
      console.error('[SupportMCP] Ticket-Status konnte nicht aktualisiert werden:', error);
    }
  }

  async insertSupportMessage(ticketId, authorType, message, metadata = {}) {
    const { error } = await this.supabase.from('support_ticket_messages').insert({
      ticket_id: ticketId,
      author_type: authorType,
      message,
      metadata,
    });

    if (error) {
      console.error('[SupportMCP] Support-Nachricht konnte nicht gespeichert werden:', error);
    }
  }
}

if (require.main === module) {
  const server = new SupportMCPServer();
  server.start().catch((error) => {
    console.error('[SupportMCP] Start fehlgeschlagen:', error);
    process.exit(1);
  });
}


