import type { SupabaseClient } from '@supabase/supabase-js';
import type { Logger } from '../utils/logger.js';
import { logWithContext } from '../utils/logger.js';

interface ApprovalRequest {
  ticketId: string;
  instructionType: 'hetzner-command' | 'supabase-migration' | 'supabase-rls-policy';
  description: string;
  command?: string;
  sql?: string;
  policyName?: string;
}

interface ApprovalResponse {
  approved: boolean;
  timestamp: string;
  ticketId: string;
}

export class TelegramNotificationService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly logger: Logger,
    private readonly n8nWebhookUrl: string | undefined,
  ) {}

  /**
   * Prüft ob bereits eine Bestätigungsanfrage für dieses Ticket/Instruction gesendet wurde
   */
  async hasPendingApprovalRequest(
    ticketId: string,
    instructionType: string
  ): Promise<boolean> {
    try {
      // Prüfe ob bereits eine Bestätigung vorhanden ist
      const { data: existingApproval } = await this.supabase
        .from('support_automation_events')
        .select('*')
        .eq('ticket_id', ticketId)
        .eq('action_type', 'telegram_approval')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingApproval) {
        const payload = existingApproval.payload as { approved?: boolean; instructionType?: string } | null;
        // Wenn bereits eine Bestätigung vorhanden ist, keine neue Anfrage senden
        if (payload?.approved !== undefined) {
          return false; // Bestätigung bereits vorhanden
        }
        // Wenn eine Anfrage gesendet wurde, aber noch keine Antwort, dann ist eine Anfrage pending
        if (payload?.instructionType === instructionType) {
          return true; // Anfrage bereits gesendet, wartet auf Antwort
        }
      }

      return false;
    } catch (error) {
      this.logger.warn({ err: error, ticketId }, 'Fehler beim Prüfen auf pending approval');
      return false; // Im Zweifel erlauben
    }
  }

  /**
   * Sendet Telegram-Benachrichtigung mit Bestätigungsanfrage
   * Prüft zuerst, ob bereits eine Anfrage gesendet wurde oder eine Bestätigung vorliegt
   */
  async sendApprovalRequest(request: ApprovalRequest): Promise<void> {
    if (!this.n8nWebhookUrl) {
      this.logger.warn('N8N_WEBHOOK_URL nicht konfiguriert - überspringe Telegram-Benachrichtigung');
      return;
    }

    // KRITISCH: Prüfe ob bereits eine Anfrage gesendet wurde oder eine Bestätigung vorliegt
    const hasPending = await this.hasPendingApprovalRequest(request.ticketId, request.instructionType);
    if (hasPending) {
      logWithContext(this.logger, 'info', 'Telegram-Bestätigungsanfrage bereits gesendet - überspringe Duplikat', {
        component: 'TelegramNotification',
        metadata: { ticketId: request.ticketId, instructionType: request.instructionType },
      });
      return; // Keine neue Anfrage senden
    }

    // Prüfe ob bereits eine Bestätigung vorhanden ist
    const existingApproval = await this.checkExistingApproval(request.ticketId, request.instructionType);
    if (existingApproval) {
      logWithContext(this.logger, 'info', 'Bestätigung bereits vorhanden - überspringe neue Anfrage', {
        component: 'TelegramNotification',
        metadata: { ticketId: request.ticketId, approved: existingApproval.approved },
      });
      return; // Keine neue Anfrage senden
    }

    logWithContext(this.logger, 'info', 'Sende Telegram-Bestätigungsanfrage', {
      component: 'TelegramNotification',
      metadata: { ticketId: request.ticketId, instructionType: request.instructionType },
    });

    try {
      const response = await fetch(this.n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'request_approval',
          ticketId: request.ticketId,
          instructionType: request.instructionType,
          description: request.description,
          command: request.command,
          sql: request.sql,
          policyName: request.policyName,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`n8n Webhook fehlgeschlagen: ${response.status} ${response.statusText}`);
      }

      logWithContext(this.logger, 'info', 'Telegram-Bestätigungsanfrage gesendet', {
        component: 'TelegramNotification',
        metadata: { ticketId: request.ticketId },
      });

      // KRITISCH: Erstelle Eintrag in support_automation_events, um zu markieren, dass Anfrage gesendet wurde
      // Dies ermöglicht isTicketBeingProcessed, zu erkennen, dass Ticket verarbeitet wird
      try {
        await this.supabase.from('support_automation_events').insert({
          ticket_id: request.ticketId,
          action_type: 'telegram_approval_request',
          payload: {
            instructionType: request.instructionType,
            description: request.description,
            command: request.command,
            sql: request.sql,
            policyName: request.policyName,
            timestamp: new Date().toISOString(),
            // approved ist noch nicht vorhanden - wird später vom n8n Workflow gesetzt
          },
        });
      } catch (insertError) {
        // Nicht kritisch - Log nur als Warnung
        this.logger.warn(
          { err: insertError, ticketId: request.ticketId },
          'Konnte Eintrag für Telegram-Anfrage nicht erstellen (nicht kritisch)'
        );
      }
    } catch (error) {
      logWithContext(this.logger, 'error', 'Fehler beim Senden der Telegram-Benachrichtigung', {
        component: 'TelegramNotification',
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: { ticketId: request.ticketId },
      });
      throw error;
    }
  }

  /**
   * Prüft ob bereits eine Bestätigung für dieses Ticket/Instruction vorhanden ist
   */
  async checkExistingApproval(
    ticketId: string,
    instructionType: string
  ): Promise<ApprovalResponse | null> {
    try {
      const { data, error } = await this.supabase
        .from('support_automation_events')
        .select('*')
        .eq('ticket_id', ticketId)
        .eq('action_type', 'telegram_approval')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        this.logger.warn({ err: error, ticketId }, 'Fehler beim Abrufen der Bestätigung');
        return null;
      }

      if (data) {
        const payload = data.payload as { approved?: boolean; instructionType?: string; timestamp?: string } | null;
        if (payload?.approved !== undefined && payload?.instructionType === instructionType) {
          return {
            approved: payload.approved === true,
            timestamp: payload.timestamp || new Date().toISOString(),
            ticketId,
          };
        }
      }

      return null;
    } catch (error) {
      this.logger.warn({ err: error, ticketId }, 'Fehler beim Prüfen auf vorhandene Bestätigung');
      return null;
    }
  }

  /**
   * Wartet auf Telegram-Bestätigung (Polling von support_automation_events)
   * Timeout: 30 Minuten
   * Prüft sofort, ob bereits eine Bestätigung vorhanden ist
   */
  async waitForApproval(ticketId: string, instructionType?: string, timeoutMs: number = 30 * 60 * 1000): Promise<ApprovalResponse | null> {
    // KRITISCH: Prüfe sofort, ob bereits eine Bestätigung vorhanden ist
    if (instructionType) {
      const existingApproval = await this.checkExistingApproval(ticketId, instructionType);
      if (existingApproval) {
        logWithContext(this.logger, 'info', 'Bestätigung bereits vorhanden - verwende vorhandene Bestätigung', {
          component: 'TelegramNotification',
          metadata: { ticketId, approved: existingApproval.approved },
        });
        return existingApproval;
      }
    }

    const startTime = Date.now();
    const pollInterval = 5000; // 5 Sekunden

    logWithContext(this.logger, 'info', 'Warte auf Telegram-Bestätigung', {
      component: 'TelegramNotification',
      metadata: { ticketId, timeoutMs, instructionType },
    });

    while (Date.now() - startTime < timeoutMs) {
      try {
        const { data, error } = await this.supabase
          .from('support_automation_events')
          .select('*')
          .eq('ticket_id', ticketId)
          .eq('action_type', 'telegram_approval')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          this.logger.warn({ err: error, ticketId }, 'Fehler beim Abrufen der Bestätigung');
        } else if (data) {
          const payload = data.payload as { approved?: boolean; instructionType?: string; timestamp?: string } | null;
          // Prüfe ob Bestätigung für den richtigen Instruction-Type ist
          if (payload?.approved !== undefined) {
            // Wenn instructionType angegeben ist, prüfe ob es passt
            if (instructionType && payload.instructionType !== instructionType) {
              // Bestätigung für anderen Instruction-Type - weiter warten
            } else {
              logWithContext(this.logger, 'info', 'Bestätigung erhalten', {
                component: 'TelegramNotification',
                metadata: { ticketId, approved: payload.approved, instructionType: payload.instructionType },
              });

              return {
                approved: payload.approved === true,
                timestamp: payload.timestamp || new Date().toISOString(),
                ticketId,
              };
            }
          }
        }

        // Warte vor nächstem Poll
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      } catch (error) {
        this.logger.warn({ err: error, ticketId }, 'Fehler beim Polling der Bestätigung');
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }
    }

    logWithContext(this.logger, 'warn', 'Timeout beim Warten auf Bestätigung', {
      component: 'TelegramNotification',
      metadata: { ticketId, timeoutMs },
    });

    return null;
  }

  /**
   * Sendet Ergebnis-Benachrichtigung (Erfolg/Fehler)
   */
  async sendResultNotification(
    ticketId: string,
    success: boolean,
    message: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    if (!this.n8nWebhookUrl) {
      this.logger.warn('N8N_WEBHOOK_URL nicht konfiguriert - überspringe Telegram-Benachrichtigung');
      return;
    }

    logWithContext(this.logger, 'info', 'Sende Ergebnis-Benachrichtigung', {
      component: 'TelegramNotification',
      metadata: { ticketId, success },
    });

    try {
      const response = await fetch(this.n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'result_notification',
          ticketId,
          success,
          message,
          details,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`n8n Webhook fehlgeschlagen: ${response.status} ${response.statusText}`);
      }

      logWithContext(this.logger, 'info', 'Ergebnis-Benachrichtigung gesendet', {
        component: 'TelegramNotification',
        metadata: { ticketId, success },
      });
    } catch (error) {
      logWithContext(this.logger, 'error', 'Fehler beim Senden der Ergebnis-Benachrichtigung', {
        component: 'TelegramNotification',
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: { ticketId },
      });
      // Nicht werfen - Ergebnis-Benachrichtigung ist nicht kritisch
    }
  }
}

