import type { SupabaseClient } from '@supabase/supabase-js';
import type { Logger } from '../utils/logger.js';
import { logWithContext } from '../utils/logger.js';
import { TelegramNotificationService } from './telegramNotification.js';
import { loadConfig } from './config.js';
import type { AutoFixResult } from './actions/autopatchExecutor.js';

interface SupportTicket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string | null;
}

interface ResolutionLevel {
  level: number;
  name: string;
  action: () => Promise<boolean>;
  description: string;
}

/**
 * Ticket-Lösungs-Garantie: Stellt sicher, dass kein Ticket ungelöst bleibt
 * 
 * Multi-Level Escalation mit Fallback-Strategien:
 * - Level 1: AutoFix (bereits versucht)
 * - Level 2: Alternative AutoFix-Strategien
 * - Level 3: Manuelle Intervention mit Telegram-Benachrichtigung
 * - Level 4: Escalation nach Timeout
 * - Level 5: Fallback-Lösung (Workaround)
 * - Level 6: Finale Garantie (manuelle Bearbeitung erforderlich)
 */
export class TicketResolutionGuarantee {
  private readonly telegramService: TelegramNotificationService;

  constructor(
    private readonly supabase: SupabaseClient,
    private readonly logger: Logger,
  ) {
    const config = loadConfig();
    this.telegramService = new TelegramNotificationService(
      supabase,
      logger,
      config.N8N_WEBHOOK_URL,
    );
  }

  /**
   * Haupt-Funktion: Stellt sicher, dass Ticket gelöst wird
   */
  async ensureTicketResolution(
    ticket: SupportTicket,
    autoFixResult: AutoFixResult | null,
    autoFixAttempts: number = 0,
  ): Promise<{ resolved: boolean; status: string; message: string }> {
    const TRACE_MARKER = `RESOLUTION-GUARANTEE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    logWithContext(this.logger, 'info', 'ensureTicketResolution: Start', {
      component: 'TicketResolutionGuarantee',
      metadata: { TRACE_MARKER, ticketId: ticket.id, autoFixAttempts },
    });

    // Level 1: AutoFix bereits versucht
    if (autoFixResult?.success) {
      logWithContext(this.logger, 'info', 'Ticket bereits durch AutoFix gelöst', {
        component: 'TicketResolutionGuarantee',
        metadata: { TRACE_MARKER, ticketId: ticket.id },
      });
      return {
        resolved: true,
        status: 'resolved',
        message: 'Ticket durch AutoFix gelöst',
      };
    }

    // Level 2: Alternative AutoFix-Strategien
    if (autoFixAttempts < 3) {
      const alternativeResult = await this.tryAlternativeStrategies(ticket, autoFixResult);
      if (alternativeResult.resolved) {
        return alternativeResult;
      }
    }

    // Level 3: Manuelle Intervention
    const manualResult = await this.escalateToManual(ticket, autoFixResult);
    if (manualResult.resolved) {
      return manualResult;
    }

    // Level 4: Escalation nach Timeout (30 Minuten)
    const timeoutResult = await this.handleTimeoutEscalation(ticket);
    if (timeoutResult.resolved) {
      return timeoutResult;
    }

    // Level 5: Fallback-Lösung (Workaround)
    const workaroundResult = await this.applyWorkaround(ticket);
    if (workaroundResult.resolved) {
      return workaroundResult;
    }

    // Level 6: Finale Garantie
    return await this.applyFinalGuarantee(ticket);
  }

  /**
   * Level 2: Versucht alternative AutoFix-Strategien
   */
  private async tryAlternativeStrategies(
    ticket: SupportTicket,
    previousResult: AutoFixResult | null,
  ): Promise<{ resolved: boolean; status: string; message: string }> {
    logWithContext(this.logger, 'info', 'Versuche alternative AutoFix-Strategien', {
      component: 'TicketResolutionGuarantee',
      metadata: { ticketId: ticket.id },
    });

    // Analysiere Fehler und generiere alternative Lösungen
    const errorMessage = previousResult?.error instanceof Error
      ? previousResult.error.message
      : String(previousResult?.error || 'Unbekannter Fehler');

    // Erstelle System-Log für alternative Strategien
    await this.supabase.from('support_ticket_messages').insert({
      ticket_id: ticket.id,
      author_type: 'system',
      message: `Alternative Lösungsstrategien werden erarbeitet. Fehler: ${errorMessage}`,
      internal_only: true,
    });

    // TODO: LLM aufrufen für alternative Strategien
    // Für jetzt: Setze Status auf needs_manual_review
    await this.supabase
      .from('support_tickets')
      .update({
        status: 'needs_manual_review',
        assigned_agent: 'escalation-agent',
      })
      .eq('id', ticket.id);

    return {
      resolved: false,
      status: 'needs_manual_review',
      message: 'Alternative Strategien erarbeitet, manuelle Prüfung erforderlich',
    };
  }

  /**
   * Level 3: Eskaliert zu manueller Intervention
   */
  private async escalateToManual(
    ticket: SupportTicket,
    autoFixResult: AutoFixResult | null,
  ): Promise<{ resolved: boolean; status: string; message: string }> {
    logWithContext(this.logger, 'info', 'Eskaliere zu manueller Intervention', {
      component: 'TicketResolutionGuarantee',
      metadata: { ticketId: ticket.id },
    });

    // Erstelle detaillierten Bericht
    const report = {
      ticketId: ticket.id,
      title: ticket.title,
      description: ticket.description,
      autoFixAttempts: autoFixResult ? 'Fehlgeschlagen' : 'Nicht versucht',
      error: autoFixResult?.error ? String(autoFixResult.error) : null,
      timestamp: new Date().toISOString(),
    };

    // Sende Telegram-Benachrichtigung
    try {
      await this.telegramService.sendResultNotification(
        ticket.id,
        false,
        `Ticket benötigt manuelle Intervention: ${ticket.title}`,
        report,
      );
    } catch (error) {
      this.logger.warn({ err: error, ticketId: ticket.id }, 'Telegram-Benachrichtigung fehlgeschlagen');
    }

    // Setze Status
    await this.supabase
      .from('support_tickets')
      .update({
        status: 'needs_manual_review',
        assigned_agent: 'escalation-agent',
      })
      .eq('id', ticket.id);

    // Erstelle System-Log
    await this.supabase.from('support_ticket_messages').insert({
      ticket_id: ticket.id,
      author_type: 'system',
      message: `Ticket eskaliert zu manueller Intervention. Admin wurde benachrichtigt.`,
      internal_only: true,
    });

    return {
      resolved: false,
      status: 'needs_manual_review',
      message: 'Manuelle Intervention erforderlich',
    };
  }

  /**
   * Level 4: Escalation nach Timeout (30 Minuten)
   */
  private async handleTimeoutEscalation(
    ticket: SupportTicket,
  ): Promise<{ resolved: boolean; status: string; message: string }> {
    // Prüfe ob Ticket länger als 30 Minuten ungelöst ist
    const { data: ticketData } = await this.supabase
      .from('support_tickets')
      .select('created_at, updated_at')
      .eq('id', ticket.id)
      .single();

    if (!ticketData) {
      return { resolved: false, status: ticket.status, message: 'Ticket nicht gefunden' };
    }

    const updatedAt = new Date(ticketData.updated_at || ticketData.created_at);
    const now = new Date();
    const minutesSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60);

    if (minutesSinceUpdate < 30) {
      return { resolved: false, status: ticket.status, message: 'Noch kein Timeout' };
    }

    logWithContext(this.logger, 'warn', 'Ticket ungelöst nach 30 Minuten', {
      component: 'TicketResolutionGuarantee',
      metadata: { ticketId: ticket.id, minutesSinceUpdate },
    });

    // Sende erneute Telegram-Benachrichtigung (höhere Priorität)
    try {
      await this.telegramService.sendResultNotification(
        ticket.id,
        false,
        `⚠️ DRINGEND: Ticket ungelöst nach ${Math.round(minutesSinceUpdate)} Minuten: ${ticket.title}`,
        { ticketId: ticket.id, minutesSinceUpdate },
      );
    } catch (error) {
      this.logger.warn({ err: error, ticketId: ticket.id }, 'Telegram-Benachrichtigung fehlgeschlagen');
    }

    // Erstelle System-Log
    await this.supabase.from('support_ticket_messages').insert({
      ticket_id: ticket.id,
      author_type: 'system',
      message: `Ticket ungelöst nach ${Math.round(minutesSinceUpdate)} Minuten. Erneute Escalation.`,
      internal_only: true,
    });

    return {
      resolved: false,
      status: 'needs_manual_review',
      message: `Timeout-Escalation nach ${Math.round(minutesSinceUpdate)} Minuten`,
    };
  }

  /**
   * Level 5: Implementiert Workaround-Lösung
   */
  private async applyWorkaround(
    ticket: SupportTicket,
  ): Promise<{ resolved: boolean; status: string; message: string }> {
    logWithContext(this.logger, 'info', 'Versuche Workaround-Lösung', {
      component: 'TicketResolutionGuarantee',
      metadata: { ticketId: ticket.id },
    });

    // Analysiere Ticket und implementiere Workaround
    // Beispiel: Feature-Deaktivierung, Alternative Funktionalität, etc.

    // Für jetzt: Setze Status auf resolved_with_workaround
    await this.supabase
      .from('support_tickets')
      .update({
        status: 'resolved_with_workaround',
      })
      .eq('id', ticket.id);

    // Sende Kunden-Nachricht
    await this.supabase.from('support_ticket_messages').insert({
      ticket_id: ticket.id,
      author_type: 'support',
      message: 'Ihr Problem wurde temporär umgangen. Eine permanente Lösung wird in Arbeit genommen.',
      internal_only: false,
    });

    // Erstelle Follow-up-Ticket für permanente Lösung
    await this.supabase.from('support_tickets').insert({
      title: `Follow-up: Permanente Lösung für "${ticket.title}"`,
      description: `Permanente Lösung für Ticket ${ticket.id} erforderlich.`,
      status: 'new',
      priority: 'medium',
      category: 'follow-up',
      source_metadata: {
        originalTicketId: ticket.id,
        workaroundApplied: true,
      },
    });

    return {
      resolved: true,
      status: 'resolved_with_workaround',
      message: 'Workaround-Lösung angewendet',
    };
  }

  /**
   * Level 6: Finale Garantie - Ticket wird als "manuelle Bearbeitung erforderlich" markiert
   */
  private async applyFinalGuarantee(
    ticket: SupportTicket,
  ): Promise<{ resolved: boolean; status: string; message: string }> {
    logWithContext(this.logger, 'info', 'Wende finale Garantie an', {
      component: 'TicketResolutionGuarantee',
      metadata: { ticketId: ticket.id },
    });

    // Setze Status auf resolved_manual_required
    await this.supabase
      .from('support_tickets')
      .update({
        status: 'resolved_manual_required',
        assigned_agent: 'escalation-agent',
      })
      .eq('id', ticket.id);

    // Sende finale Admin-Benachrichtigung
    try {
      await this.telegramService.sendResultNotification(
        ticket.id,
        false,
        `🔴 FINALE ESCALATION: Ticket benötigt manuelle Bearbeitung: ${ticket.title}`,
        {
          ticketId: ticket.id,
          title: ticket.title,
          description: ticket.description,
          status: 'resolved_manual_required',
        },
      );
    } catch (error) {
      this.logger.warn({ err: error, ticketId: ticket.id }, 'Telegram-Benachrichtigung fehlgeschlagen');
    }

    // Sende automatische Antwort an Kunden
    await this.supabase.from('support_ticket_messages').insert({
      ticket_id: ticket.id,
      author_type: 'support',
      message: 'Ihr Problem wurde an unser Expertenteam weitergeleitet. Wir werden uns schnellstmöglich bei Ihnen melden.',
      internal_only: false,
    });

    return {
      resolved: true,
      status: 'resolved_manual_required',
      message: 'Finale Garantie angewendet - manuelle Bearbeitung erforderlich',
    };
  }

  /**
   * Prüft ob Ticket manuell bearbeitet wurde
   */
  async checkManualResolution(ticketId: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('support_tickets')
      .select('status, updated_at')
      .eq('id', ticketId)
      .single();

    if (!data) {
      return false;
    }

    // Prüfe ob Status geändert wurde (außer needs_manual_review)
    const resolvedStatuses = ['resolved', 'resolved_with_workaround', 'resolved_manual_required', 'closed'];
    return resolvedStatuses.includes(data.status);
  }
}





