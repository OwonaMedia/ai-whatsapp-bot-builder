import type { RealtimeChannel } from '@supabase/supabase-js';
import path from 'node:path';
import type { Logger } from '../utils/logger.js';
import { logWithContext } from '../utils/logger.js';
import type { SupportContext } from './supportContext.js';
import type { KnowledgeDocument } from './knowledgeBase.js';
import type { ResolutionAction, ResolutionPlan } from './llmClient.js';
import { getAgentProfile } from './agentProfiles.js';
import { SupabaseDiagnostics } from './tier2/supabaseDiagnostics.js';
import { persistAutopatchPlan } from './actions/autopatch.js';
import { matchAutopatchPattern } from './actions/autopatchPatterns.js';
import type { AutoFixInstruction, AutopatchCandidate } from './actions/autopatchPatterns.js';
import { ReverseEngineeringAnalyzer } from './actions/reverseEngineeringAnalyzer.js';
import { executeAutoFixInstructions } from './actions/autopatchExecutor.js';
import { applyRagPlaygroundScrollFix } from '../actions/uxFixes.js';
import { metricsCollector } from '../utils/metricsCollector.js';
import {
  writeAutopatchDebug,
  persistAutofixInstructions,
} from '../utils/autopatchDebugLogger.js';

interface SupportTicket {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string | null;
  source_metadata: Record<string, unknown> | null;
  assigned_agent?: string | null;
  escalation_path?: Array<Record<string, unknown>> | null;
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  author_type: 'customer' | 'support' | 'system';
  message: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
  internal_only?: boolean;
  quick_reply_options?: unknown[];
}

type TicketEvent = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  ticket: SupportTicket;
};

type Tier2AgentId =
  | 'supabase-analyst-agent'
  | 'hetzner-ops-agent'
  | 'frontend-diagnostics-agent'
  | 'autopatch-architect-agent';

export class SupportTicketRouter {
  private channel: RealtimeChannel | null = null;
  private messageChannel: RealtimeChannel | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private processedTickets = 0;
  private lastDispatchAt: Date | null = null;
  private lastPollingAt: Date | null = null;
  private lastTier2RunAt: Date | null = null;
  private lastCustomerReplyAt: Date | null = null;
  private lastRealtimeStatus = 'unknown';
  private ticketChannelStatus = 'unknown';
  private messageChannelStatus = 'unknown';
  private realtimeReconnects = 0;
  private ticketChannelReconnectInFlight = false;
  private messageChannelReconnectInFlight = false;
  private readonly supabaseDiagnostics: SupabaseDiagnostics;
  private readonly reverseEngineeringAnalyzer: ReverseEngineeringAnalyzer;
  private readonly debugLog = (label: string, payload?: Record<string, unknown>) =>
    writeAutopatchDebug(label, payload);

  constructor(private readonly context: SupportContext, private readonly logger: Logger) {
    this.supabaseDiagnostics = new SupabaseDiagnostics(
      context.supabase,
      logger.child({ component: 'SupabaseDiagnostics' }),
    );
    this.reverseEngineeringAnalyzer = new ReverseEngineeringAnalyzer(
      context.knowledgeBase,
      logger.child({ component: 'ReverseEngineeringAnalyzer' }),
    );
  }

  async start() {
    await this.bindRealtimeEvents();
    await this.bootstrapOpenTickets();
    this.schedulePolling();
  }

  private async bindRealtimeEvents() {
    // REALTIME DEAKTIVIERT - Kostenreduzierung ($20/24h Problem)
    // Statt Realtime verwenden wir Polling (bereits implementiert in schedulePolling)
    this.logger.info('Realtime-Subscriptions deaktiviert - verwende Polling statt Realtime');
    // await this.subscribeTicketChannel('initial');
    // await this.subscribeMessageChannel('initial');
  }

  private async bootstrapOpenTickets() {
    this.lastPollingAt = new Date();
    const { data, error } = await this.context.supabase
      .from('support_tickets')
      .select('*')
      .in('status', ['new', 'investigating']);

    if (error) {
      this.logger.error({ err: error }, 'Bootstrap fehlgeschlagen');
      return;
    }

    for (const ticket of data ?? []) {
      await this.dispatch({ eventType: 'UPDATE', ticket: ticket as SupportTicket });
    }
  }

  private schedulePolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }

    this.pollInterval = setInterval(() => {
      this.bootstrapOpenTickets().catch((error) => {
        this.logger.error({ err: error }, 'Periodisches Ticket-Scanning fehlgeschlagen');
      });
    }, 30_000);
  }

  private async subscribeTicketChannel(reason: string) {
    if (this.ticketChannelReconnectInFlight) {
      this.logger.debug({ reason }, 'Ticket-Realtime-Subscribe bereits aktiv');
      return;
    }

    this.ticketChannelReconnectInFlight = true;
    try {
      if (reason !== 'initial') {
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }

      if (this.channel) {
        await this.channel.unsubscribe().catch(() => undefined);
        this.channel = null;
      }

      const channel = this.context.supabase
        .channel('support-mcp-router')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'support_tickets' },
          async (payload) => {
            try {
              const event = payload.eventType;
              if (event === 'DELETE') {
                return;
              }

              const ticketId =
                (payload.new as { id?: string } | null)?.id ||
                (payload.old as { id?: string } | null)?.id;
              if (!ticketId) {
                this.logger.warn({ payload }, 'Realtime-Event ohne Ticket-ID – überspringe');
                return;
              }

              const { data: ticket, error } = await this.context.supabase
                .from('support_tickets')
                .select('*')
                .eq('id', ticketId)
                .maybeSingle();

              if (error || !ticket) {
                this.logger.warn({ err: error, ticketId, event }, 'Konnte Ticket für Realtime-Event nicht laden');
                return;
              }

              this.logger.debug({ ticketId, event, status: ticket.status }, 'Realtime-Event empfangen');
              await this.dispatch({ eventType: event, ticket: ticket as SupportTicket });
            } catch (error) {
              this.logger.error({ err: error, payload }, 'Fehler beim Verarbeiten von Realtime-Event');
            }
          }
        );

      this.channel = channel;
      await channel.subscribe((status) => {
        this.handleRealtimeStatus(status, 'tickets');
      });
    } catch (error) {
      this.logger.error({ err: error, reason }, 'Ticket-Realtime-Subscribe fehlgeschlagen');
      this.realtimeReconnects += 1;
    } finally {
      this.ticketChannelReconnectInFlight = false;
    }
  }

  private async subscribeMessageChannel(reason: string) {
    if (this.messageChannelReconnectInFlight) {
      this.logger.debug({ reason }, 'Message-Realtime-Subscribe bereits aktiv');
      return;
    }

    this.messageChannelReconnectInFlight = true;
    try {
      if (reason !== 'initial') {
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }

      if (this.messageChannel) {
        await this.messageChannel.unsubscribe().catch(() => undefined);
        this.messageChannel = null;
      }

      const channel = this.context.supabase
        .channel('support-mcp-messages')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'support_ticket_messages' },
          (payload) => {
            const message = payload.new as TicketMessage;
            if (message.author_type !== 'customer') {
              return;
            }

            this.handleCustomerReply(message).catch((error) => {
              this.logger.error({ err: error, ticketId: message.ticket_id }, 'Antwort konnte nicht verarbeitet werden');
            });
          }
        );

      this.messageChannel = channel;
      await channel.subscribe((status) => {
        this.handleRealtimeStatus(status, 'messages');
      });
    } catch (error) {
      this.logger.error({ err: error, reason }, 'Message-Realtime-Subscribe fehlgeschlagen');
      this.realtimeReconnects += 1;
    } finally {
      this.messageChannelReconnectInFlight = false;
    }
  }

  private handleRealtimeStatus(status: string, kind: 'tickets' | 'messages') {
    const normalizedStatus = typeof status === 'string' ? status : String(status);
    this.lastRealtimeStatus = normalizedStatus;

    if (kind === 'tickets') {
      this.ticketChannelStatus = normalizedStatus;
      this.logger.info({ status: normalizedStatus }, 'Realtime-Channel Status geändert');
    } else {
      this.messageChannelStatus = normalizedStatus;
      this.logger.info({ status: normalizedStatus }, 'Realtime-Channel (Messages) Status geändert');
    }

    if (['TIMED_OUT', 'CLOSED', 'CHANNEL_ERROR'].includes(normalizedStatus)) {
      this.realtimeReconnects += 1;
      if (kind === 'tickets') {
        void this.subscribeTicketChannel(normalizedStatus.toLowerCase());
      } else {
        void this.subscribeMessageChannel(normalizedStatus.toLowerCase());
      }
    }
  }

  private async handleCustomerReply(message: TicketMessage) {
    this.logger.info({ ticketId: message.ticket_id, messageId: message.id }, 'Kundennachricht eingegangen');
    this.lastCustomerReplyAt = new Date();

    const { data, error } = await this.context.supabase
      .from('support_tickets')
      .select('*')
      .eq('id', message.ticket_id)
      .maybeSingle();

    if (error || !data) {
      this.logger.warn({ err: error, ticketId: message.ticket_id }, 'Ticket zu Antwort konnte nicht geladen werden');
      return;
    }

    const ticket = data as SupportTicket;

    if (ticket.status === 'resolved' || ticket.status === 'closed') {
      this.logger.debug({ ticketId: ticket.id }, 'Antwort auf geschlossenes Ticket ignoriert');
      return;
    }

    // WICHTIG: Pattern-Erkennung VOR Agent-Zuweisung ausführen
    // Aktualisiere Ticket mit neuer Nachricht für Pattern-Erkennung
    const updatedTicket = { ...ticket, status: 'new' as const };
    
    // Pattern-Erkennung zuerst prüfen
    const autopatchCandidate = await this.detectImmediateAutopatch(updatedTicket);
    if (autopatchCandidate) {
      // Autopatch hat Priorität - dispatch wird das Ticket übernehmen
      await this.dispatch({ eventType: 'UPDATE', ticket: updatedTicket });
      return;
    }

    // Nur wenn kein Autopatch erkannt wurde, normalen Agent zuweisen
    const primaryAgent = this.determinePrimaryAgent(ticket);

    const { error: updateError } = await this.context.supabase
      .from('support_tickets')
      .update({ status: 'new', updated_at: new Date().toISOString(), assigned_agent: primaryAgent.id })
      .eq('id', ticket.id);

    if (updateError) {
      this.logger.warn({ err: updateError, ticketId: ticket.id }, 'Konnte Ticketstatus nicht aktualisieren');
    }

    await this.dispatch({ eventType: 'UPDATE', ticket: updatedTicket }, primaryAgent);
  }

  async dispatch(event: TicketEvent, forcedAgent?: ReturnType<typeof getAgentProfile>) {
    const { ticket } = event;
    const dispatchStartTime = Date.now();

    // KRITISCH: Console-Logging für sofortige Sichtbarkeit
    this.debugLog('dispatch aufgerufen', {
      ticketId: ticket.id,
      eventType: event.eventType,
      title: ticket.title,
      status: ticket.status,
    });

    logWithContext(
      this.logger,
      'info',
      'dispatch aufgerufen',
      {
        component: 'TicketRouter',
        ticketId: ticket.id,
        metadata: {
          eventType: event.eventType,
          title: ticket.title,
        },
      }
    );

    if (ticket.status === 'resolved' || ticket.status === 'closed') {
      this.debugLog('Ticket bereits abgeschlossen – überspringe', {
        ticketId: ticket.id,
        status: ticket.status,
      });
      this.logger.debug({ ticketId: ticket.id }, 'Ticket bereits abgeschlossen – überspringe');
      return;
    }

    // WICHTIG: Pattern-Erkennung ZUERST prüfen (vor Error-Handler, vor allem anderen)
    // Dies ist kritisch, damit Autopatch immer funktioniert
    // Zuerst Reverse Engineering Analyzer (betrachtet ALLE Konfigurationen als Fehlerquellen)
    // Dann Fallback zu hardcodierten Patterns
    this.debugLog('Prüfe Pattern-Erkennung', { ticketId: ticket.id, title: ticket.title });
    const autopatchCandidate = await this.detectImmediateAutopatch(ticket);
    
    this.debugLog('Pattern-Erkennung Ergebnis', {
      ticketId: ticket.id,
      hasCandidate: !!autopatchCandidate,
      patternId: autopatchCandidate?.patternId,
      hasAutoFixInstructions: !!autopatchCandidate?.autoFixInstructions,
      autoFixInstructionsLength: autopatchCandidate?.autoFixInstructions?.length ?? 0,
    });
    
    if (autopatchCandidate) {
      this.debugLog('Pattern-Erkennung: Autopatch-Candidate gefunden', {
        ticketId: ticket.id,
        patternId: autopatchCandidate.patternId,
        hasAutoFixInstructions: !!autopatchCandidate.autoFixInstructions,
        autoFixInstructionsLength: autopatchCandidate.autoFixInstructions?.length ?? 0,
        autoFixInstructionsFull: JSON.stringify(autopatchCandidate.autoFixInstructions ?? []),
      });
      
      logWithContext(
        this.logger,
        'info',
        'Pattern-Erkennung: Autopatch-Candidate gefunden',
        {
          component: 'TicketRouter',
          ticketId: ticket.id,
          patternId: autopatchCandidate.patternId,
          metadata: {
            title: ticket.title,
            hasAutoFixInstructions: !!autopatchCandidate.autoFixInstructions,
            autoFixInstructionsLength: autopatchCandidate.autoFixInstructions?.length ?? 0,
            autoFixInstructionsFull: JSON.stringify(autopatchCandidate.autoFixInstructions ?? []),
          },
        }
      );
      
      if (autopatchCandidate.autoFixInstructions?.length) {
        await persistAutofixInstructions(
          ticket.id,
          autopatchCandidate.patternId,
          autopatchCandidate.autoFixInstructions,
        );
        this.debugLog('persistAutofixInstructions', {
          ticketId: ticket.id,
          patternId: autopatchCandidate.patternId,
          instructionCount: autopatchCandidate.autoFixInstructions.length,
        });
      }

      // Pattern-Erkennung hat höchste Priorität - sofort verarbeiten
      this.debugLog('Rufe processAutopatchCandidate auf', { ticketId: ticket.id });
      await this.processAutopatchCandidate(ticket, autopatchCandidate);
      this.processedTickets += 1;
      this.lastDispatchAt = new Date();
      
      // Metrics aufzeichnen
      metricsCollector.recordTicketProcessed();
      const duration = Date.now() - dispatchStartTime;
      metricsCollector.recordLatency('dispatch', duration);
      
      logWithContext(
        this.logger,
        'info',
        'dispatch abgeschlossen (Autopatch)',
        {
          component: 'TicketRouter',
          ticketId: ticket.id,
          duration,
          patternId: autopatchCandidate.patternId,
        }
      );
      return;
    }

    // WICHTIG: Error-Handler prüfen (zweite Priorität)
    const shouldUseErrorHandler = this.shouldUseErrorHandler(ticket);
    this.logger.info(
      { ticketId: ticket.id, shouldUseErrorHandler, title: ticket.title, metadata: ticket.source_metadata },
      'Error-Handler-Prüfung'
    );
    
    if (shouldUseErrorHandler) {
      this.logger.info({ ticketId: ticket.id, reason: this.getErrorHandlerReason(ticket) }, 'Error-Handler-Agent wird aktiviert');
      await this.context.supabase
        .from('support_tickets')
        .update({
          status: 'investigating',
          assigned_agent: 'error-handler-agent',
        })
        .eq('id', ticket.id);

      await this.context.supabase.from('support_ticket_messages').insert({
        ticket_id: ticket.id,
        author_type: 'system',
        author_name: 'Error Handler Agent',
        message: 'Kritischer Fehler erkannt. Fehler-Handling wird durchgeführt...',
        internal_only: true,
        metadata: {
          kind: 'error_handler_activated',
          reason: this.getErrorHandlerReason(ticket),
        },
        quick_reply_options: [],
      });

      // Error-Handler-Logik hier implementieren
      await this.handleErrorRecovery(ticket);

      this.processedTickets += 1;
      this.lastDispatchAt = new Date();
      return;
    }

    // Normale Agent-Zuweisung (wenn kein Pattern erkannt wurde)
    const primaryAgent = forcedAgent ?? this.determinePrimaryAgent(ticket);
    await this.assignAgentToTicket(ticket, primaryAgent, event.eventType);
  }

  /**
   * Verarbeitet einen Autopatch-Candidate vollständig.
   * Diese Methode stellt sicher, dass der gesamte Autopatch-Prozess zuverlässig abläuft.
   */
  private async processAutopatchCandidate(
    ticket: SupportTicket,
    autopatchCandidate: NonNullable<ReturnType<typeof matchAutopatchPattern>>,
  ): Promise<void> {
    const processStartTime = Date.now();
    
    // WICHTIG: autopatchCandidate ist garantiert nicht null (Non-Nullable)
    if (!autopatchCandidate) {
      logWithContext(
        this.logger,
        'error',
        'autopatchCandidate ist null - sollte nicht passieren',
        {
          component: 'TicketRouter',
          ticketId: ticket.id,
        }
      );
      return;
    }
    
    // KRITISCH: Console-Logging für sofortige Sichtbarkeit
    this.debugLog('processAutopatchCandidate: Start', {
      ticketId: ticket.id,
      patternId: autopatchCandidate.patternId,
      hasAutoFixInstructions: !!autopatchCandidate.autoFixInstructions,
      autoFixInstructionsLength: autopatchCandidate.autoFixInstructions?.length ?? 0,
      autoFixInstructionsFull: JSON.stringify(autopatchCandidate.autoFixInstructions ?? []),
    });
    
    logWithContext(
      this.logger,
      'info',
      'Automatischer Autopatch-Plan wird erstellt (Tier 1)',
      {
        component: 'TicketRouter',
        ticketId: ticket.id,
        patternId: autopatchCandidate.patternId,
        metadata: {
          hasAutoFixInstructions: !!autopatchCandidate.autoFixInstructions,
          autoFixInstructionsLength: autopatchCandidate.autoFixInstructions?.length ?? 0,
          autoFixInstructionsFull: JSON.stringify(autopatchCandidate.autoFixInstructions ?? []),
        },
      }
    );

    // WICHTIG: Ticket-Status und Agent sofort setzen, damit keine Race-Conditions entstehen
    await this.context.supabase
      .from('support_tickets')
      .update({
        status: 'investigating',
        assigned_agent: 'autopatch-architect-agent',
      })
      .eq('id', ticket.id);

    const autopatchMetadata = {
      kind: 'autopatch_initiated',
      summary: autopatchCandidate.summary,
      patternId: autopatchCandidate.patternId,
    };

    // Kundenkommunikation senden
    await this.context.supabase.from('support_ticket_messages').insert({
      ticket_id: ticket.id,
      author_type: 'support',
      author_name: 'Frontend Automation',
      message: autopatchCandidate.customerMessage,
      internal_only: false,
      metadata: autopatchMetadata,
      quick_reply_options: [],
    });

    // Actions ausführen (z.B. Autopatch-Spezifikation erstellen)
    // WICHTIG: autopatch_plan Actions werden automatisch ausgeführt, nicht nur gespeichert
    for (const action of autopatchCandidate.actions) {
      if (action.type === 'autopatch_plan') {
        // AutoFix-Plan automatisch ausführen
        await this.executeAutopatchPlan(ticket, action as Extract<ResolutionAction, { type: 'autopatch_plan' }>, autopatchCandidate);
      } else {
        await this.executeAction(ticket, action, 'autopatch-architect-agent', autopatchCandidate.summary);
      }
    }

    // AutoFix ausführen (wenn Instructions vorhanden)
    let autoFixStatus: 'applied' | 'planned' = 'planned';
    let autoFixMessage: string | undefined;
      
    // KRITISCH: Detailliertes Logging für Debugging
    logWithContext(
      this.logger,
      'info',
      'Prüfe AutoFix-Instructions',
      {
        component: 'TicketRouter',
        ticketId: ticket.id,
        patternId: autopatchCandidate.patternId,
        metadata: {
          hasAutoFixInstructions: !!autopatchCandidate.autoFixInstructions,
          autoFixInstructionsLength: autopatchCandidate.autoFixInstructions?.length ?? 0,
          autoFixInstructionsTypes: autopatchCandidate.autoFixInstructions?.map((i) => i.type) ?? [],
          autoFixInstructionsFull: JSON.stringify(autopatchCandidate.autoFixInstructions ?? []),
        },
      }
    );
    
    if (autopatchCandidate.autoFixInstructions && autopatchCandidate.autoFixInstructions.length > 0) {
      this.logger.info(
        {
          ticketId: ticket.id,
          instructionCount: autopatchCandidate.autoFixInstructions.length,
          instructions: autopatchCandidate.autoFixInstructions.map((i) => i.type),
          cwd: process.cwd(),
        },
        'Starte executeAutoFixInstructions'
      );
      
      const fixLogger = this.logger.child({
        component: 'AutoFixExecutor',
        ticketId: ticket.id,
        patternId: autopatchCandidate.patternId,
      });
      
        try {
          const autofixStartTime = Date.now();
          
          // KRITISCH: Detailliertes Logging vor executeAutoFixInstructions
          logWithContext(
            this.logger,
            'info',
            'Starte executeAutoFixInstructions',
            {
              component: 'TicketRouter',
              ticketId: ticket.id,
              patternId: autopatchCandidate.patternId,
              metadata: {
                instructionCount: autopatchCandidate.autoFixInstructions.length,
                instructionTypes: autopatchCandidate.autoFixInstructions.map((i) => i.type),
                instructionsFull: JSON.stringify(autopatchCandidate.autoFixInstructions),
                cwd: process.cwd(),
              },
            }
          );
          
          // KRITISCH: Absoluter Pfad verwenden (Experten-Empfehlung)
          // process.cwd() kann unterschiedlich sein, je nachdem wie PM2 den Prozess startet
          // Verwende explizit das Verzeichnis, in dem support-mcp-server liegt
          const absoluteRootDir = process.cwd().endsWith('support-mcp-server')
            ? process.cwd()
            : path.resolve(process.cwd(), 'support-mcp-server');
          
          logWithContext(
            this.logger,
            'info',
            'Path für executeAutoFixInstructions',
            {
              component: 'TicketRouter',
              ticketId: ticket.id,
              metadata: {
                processCwd: process.cwd(),
                absoluteRootDir,
                instructionCount: autopatchCandidate.autoFixInstructions.length,
                instructionsFull: JSON.stringify(autopatchCandidate.autoFixInstructions),
              },
            }
          );
          
          // KRITISCH: Logging direkt vor dem Aufruf
          this.debugLog('executeAutoFixInstructions wird aufgerufen', {
            absoluteRootDir,
            instructionCount: autopatchCandidate.autoFixInstructions.length,
            instructions: autopatchCandidate.autoFixInstructions,
          });
          
          const fixResult = await executeAutoFixInstructions(
            absoluteRootDir,
            autopatchCandidate.autoFixInstructions,
            fixLogger,
          );
          
          // KRITISCH: Logging direkt nach dem Aufruf
          this.debugLog('executeAutoFixInstructions zurückgekehrt', {
            success: fixResult.success,
            message: fixResult.message,
            hasError: !!fixResult.error,
          });
          
          const autofixDuration = Date.now() - autofixStartTime;
          
          // Metrics aufzeichnen
          metricsCollector.recordLatency('autofix', autofixDuration);
          if (fixResult.success) {
            metricsCollector.recordAutopatchSuccess();
          } else {
            metricsCollector.recordAutopatchFailed();
            metricsCollector.recordError(
              'AutoFixExecutor',
              fixResult.message ?? 'AutoFix fehlgeschlagen',
              ticket.id
            );
          }
          
          logWithContext(
            this.logger,
            fixResult.success ? 'info' : 'warn',
            'executeAutoFixInstructions abgeschlossen',
            {
              component: 'TicketRouter',
              ticketId: ticket.id,
              patternId: autopatchCandidate.patternId,
              duration: autofixDuration,
              error: fixResult.error instanceof Error ? fixResult.error : undefined,
              metadata: {
                success: fixResult.success,
                message: fixResult.message,
                hasError: !!fixResult.error,
              },
            }
          );

          const warnings = fixResult.warnings ?? [];

          if (fixResult.success) {
          autoFixStatus = 'applied';
            autoFixMessage = warnings.length
              ? `${fixResult.message ?? 'AutoFix angewendet.'} (${warnings.join('; ')})`
              : fixResult.message ?? 'AutoFix erfolgreich angewendet.';
          await this.context.supabase.from('support_ticket_messages').insert({
            ticket_id: ticket.id,
            author_type: 'support',
            author_name: 'Frontend Automation',
              message: warnings.length
                ? 'Der Fix wurde ausgerollt. Bitte Browser neu laden. Es gab zusätzliche Hinweise, siehe internen Kommentar.'
                : 'Der Fix wurde automatisch ausgerollt. Bitte Browser neu laden und erneut testen.',
            internal_only: false,
            metadata: {
              kind: 'autopatch_autofix_success',
              summary: autoFixMessage,
              patternId: autopatchCandidate.patternId,
            },
            quick_reply_options: [],
          });

            if (warnings.length) {
              await this.context.supabase.from('support_ticket_messages').insert({
                ticket_id: ticket.id,
                author_type: 'system',
                author_name: 'Autopatch Automation',
                message: `Autofix Hinweise:\n- ${warnings.join('\n- ')}`,
                internal_only: true,
                metadata: {
                  kind: 'autopatch_autofix_warning',
                  warnings,
                  patternId: autopatchCandidate.patternId,
                },
                quick_reply_options: [],
              });
            }
        } else {
          autoFixMessage =
            (fixResult.error instanceof Error ? fixResult.error.message : fixResult.message) ??
            'AutoFix fehlgeschlagen.';
          await this.context.supabase.from('support_ticket_messages').insert({
            ticket_id: ticket.id,
            author_type: 'system',
            author_name: 'Autopatch Automation',
            message: 'Automatischer Fix konnte nicht vollständig durchgeführt werden. Manuelle Überprüfung erforderlich.',
            internal_only: true,
            metadata: {
              kind: 'autopatch_autofix_failed',
              error: autoFixMessage,
              patternId: autopatchCandidate.patternId,
            },
            quick_reply_options: [],
          });
        }
      } catch (error) {
        this.logger.error(
          {
            err: error,
            ticketId: ticket.id,
            patternId: autopatchCandidate.patternId,
          },
          'Fehler beim Ausführen von executeAutoFixInstructions'
        );
        autoFixMessage = error instanceof Error ? error.message : 'Unbekannter Fehler beim AutoFix';
      }
    } else {
      this.logger.warn(
        {
          ticketId: ticket.id,
          hasAutoFixInstructions: !!autopatchCandidate.autoFixInstructions,
          autoFixInstructionsLength: autopatchCandidate.autoFixInstructions?.length ?? 0,
        },
        'Keine AutoFix-Instructions vorhanden'
      );
    }

    // Metadaten aktualisieren
    const updatedMetadata = {
      ...(ticket.source_metadata ?? {}),
      autopatch: {
        ...(ticket.source_metadata?.autopatch as Record<string, unknown> | undefined),
        status: autoFixStatus,
        patternId: autopatchCandidate.patternId,
        updatedAt: new Date().toISOString(),
        autoFixMessage,
      },
    };

    await this.context.supabase
      .from('support_tickets')
      .update({
        status: 'waiting_customer',
        assigned_agent: 'autopatch-architect-agent',
        updated_at: new Date().toISOString(),
        source_metadata: updatedMetadata,
      })
      .eq('id', ticket.id);
    
    const processDuration = Date.now() - processStartTime;
    logWithContext(
      this.logger,
      'info',
      'Autopatch-Verarbeitung abgeschlossen',
      {
        component: 'TicketRouter',
        ticketId: ticket.id,
        patternId: autopatchCandidate.patternId,
        duration: processDuration,
        metadata: {
          autoFixStatus,
          autoFixMessage,
        },
      }
    );
  }

  private async assignAgentToTicket(
    ticket: SupportTicket,
    agent: ReturnType<typeof getAgentProfile>,
    eventType: string,
  ): Promise<void> {
    // Normale Agent-Zuweisung
    await this.context.supabase
      .from('support_tickets')
      .update({
        status: 'new',
        assigned_agent: agent.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticket.id);

    this.processedTickets += 1;
    this.lastDispatchAt = new Date();
  }

  // RAG Fix wird später im Code geprüft - hier entfernt, da es bereits weiter unten implementiert ist

  private determinePrimaryAgent(ticket: SupportTicket) {
    const description = `${ticket.title} ${ticket.description}`.toLowerCase();

    if (ticket.category?.toLowerCase().includes('ui') || description.includes('ui')) {
      return getAgentProfile('ui-debug-agent');
    }

    if (ticket.category?.toLowerCase().includes('escalation')) {
      return getAgentProfile('escalation-agent');
    }

    return getAgentProfile('support-agent');
  }

  private determineTier2Agents(ticket: SupportTicket, plan: ResolutionPlan): Tier2AgentId[] {
    const description = `${ticket.title} ${ticket.description}`.toLowerCase();
    const actions = plan.actions;
    const agents = new Set<Tier2AgentId>();

    if (
      description.includes('supabase') ||
      description.includes('auth') ||
      hasAction(actions, 'supabase_query') ||
      plan.status === 'waiting_customer'
    ) {
      agents.add('supabase-analyst-agent');
    }

    if (description.includes('server') || description.includes('pm2') || hasAction(actions, 'hetzner_command')) {
      agents.add('hetzner-ops-agent');
    }

    if (description.includes('ui') || description.includes('frontend') || hasAction(actions, 'ux_update')) {
      agents.add('frontend-diagnostics-agent');
    }

    const needsAutopatch =
      actions.some(
        (action) =>
          action.type === 'ux_update' &&
          (!action.payload || typeof action.payload.fixId !== 'string' || action.payload.fixId.trim().length === 0),
      ) || actions.some((action) => action.type === 'autopatch_plan');
    if (needsAutopatch) {
      agents.add('autopatch-architect-agent');
    }

    return Array.from(agents);
  }

  private async runTier2Agents(ticket: SupportTicket, agents: Tier2AgentId[]) {
    for (const agentId of agents) {
      const agent = getAgentProfile(agentId);
    const additionalKnowledge: KnowledgeDocument[] = [];

    if (agent.id === 'supabase-analyst-agent') {
      const diagnostic = await this.supabaseDiagnostics.run(ticket.id);
      if (diagnostic) {
        await this.insertSystemLog(
          ticket.id,
          diagnostic.summary,
          {
            kind: 'supabase_diagnostics',
            details: diagnostic.details,
          },
          agent.label,
        );
        await this.insertAutomationEvent(ticket.id, 'supabase_diagnostics', {
          agent: agent.id,
          details: diagnostic.details,
        }, agent.id);

        additionalKnowledge.push(diagnostic.knowledgeDoc);
      }
    }

    const knowledge = [
      ...this.context.knowledgeBase.query(
        `${ticket.title} ${ticket.description} ${agent.label}`,
        6
      ),
      ...additionalKnowledge,
    ];

      const plan = await this.context.llmClient.generatePlan({
        agent,
        ticket: {
          id: ticket.id,
          title: ticket.title,
          description: ticket.description,
          category: ticket.category,
          priority: ticket.priority ?? 'normal',
          metadata: ticket.source_metadata ?? {},
        },
        knowledge,
      });

      await this.context.supabase.from('support_ticket_messages').insert({
        ticket_id: ticket.id,
        author_type: 'system',
        author_name: agent.label,
        message: plan.summary,
        internal_only: true,
      quick_reply_options: [],
        metadata: {
          agent: agent.id,
          plan,
          knowledge: knowledge.map((doc) => ({ id: doc.id, title: doc.title })),
        },
      });

      for (const action of plan.actions) {
        await this.executeAction(ticket, action, agent.id, plan.summary);
      }

      await this.context.supabase
        .from('support_tickets')
        .update({
          last_escalation: new Date().toISOString(),
          escalation_path: this.appendEscalationPath(ticket, agent.id, plan.status),
        })
        .eq('id', ticket.id);

      this.lastTier2RunAt = new Date();
    }
  }

  private appendEscalationPath(ticket: SupportTicket, agentId: string, status: string) {
    const currentPath = Array.isArray((ticket as any).escalation_path) ? (ticket as any).escalation_path : [];
    return [
      ...currentPath,
      {
        agent: agentId,
        status,
        timestamp: new Date().toISOString(),
      },
    ];
  }

  private async executeAction(
    ticket: SupportTicket,
    action: ResolutionAction,
    agentId: string,
    planSummary?: string,
  ) {
    const metadata = {
      ticket_id: ticket.id,
      action,
    };

    switch (action.type) {
      case 'supabase_query':
        await this.insertAutomationEvent(ticket.id, 'supabase_query', action.payload ?? {}, agentId);
        await this.insertSystemLog(ticket.id, `Supabase-Aktion vorgeschlagen: ${action.description}`, metadata, agentId);
        break;
      case 'hetzner_command':
        await this.insertAutomationEvent(ticket.id, 'hetzner_command', action.payload ?? {}, agentId);
        await this.insertSystemLog(ticket.id, `Serveraktion geplant: ${action.description}`, metadata, agentId);
        break;
      case 'ux_update':
        await this.insertAutomationEvent(ticket.id, 'ux_update', action.payload ?? {}, agentId);
        await this.insertSystemLog(ticket.id, `UX-Update vorgeschlagen: ${action.description}`, metadata, agentId);
        await this.handleUxUpdate(ticket, action);
        break;
      case 'autopatch_plan': {
        const logger = this.logger.child({ component: 'AutopatchPlan', ticketId: ticket.id, agentId });
        const filePath = await persistAutopatchPlan(
          process.cwd(),
          action,
          planSummary ?? action.description ?? '',
          {
            ticketId: ticket.id,
            title: ticket.title,
            description: ticket.description,
            locale:
              (ticket as any)?.source_metadata?.locale ??
              (ticket as any)?.source_metadata?.language ??
              null,
          },
          logger,
        );

        await this.insertSystemLog(
          ticket.id,
          `Autopatch-Spezifikation erstellt: ${filePath}`,
          {
            ticketId: ticket.id,
            filePath,
            action,
            planSummary,
          },
          'Autopatch Architect',
        );
        break;
      }
      case 'manual_followup':
      default:
        await this.insertSystemLog(ticket.id, `Manuelle Nacharbeit nötig: ${action.description}`, metadata, agentId);
        break;
    }
  }

  private async insertSystemLog(
    ticketId: string,
    message: string,
    metadata: Record<string, unknown>,
    authorName = 'MCP System'
  ) {
    if (await this.hasRecentMessage(ticketId, 'system', message)) {
      return;
    }

    await this.context.supabase.from('support_ticket_messages').insert({
      ticket_id: ticketId,
      author_type: 'system',
      author_name: authorName,
      message,
      metadata,
      internal_only: true,
      quick_reply_options: [],
    });
  }

  /**
   * Führt einen AutoFix-Plan automatisch aus
   * Analysiert die Schritte im Plan und führt sie aus
   */
  private async executeAutopatchPlan(
    ticket: SupportTicket,
    action: ResolutionAction,
    autopatchCandidate: AutopatchCandidate,
  ) {
    if (action.type !== 'autopatch_plan') {
      return;
    }
    const payload = (action.payload || {}) as Record<string, unknown>;
    const fixName = (typeof payload?.fixName === 'string' ? payload.fixName : 'autopatch-fix') as string;
    const targetFiles = (Array.isArray(payload?.targetFiles) ? payload.targetFiles : []) as string[];
    const steps = (Array.isArray(payload?.steps) ? payload.steps : []) as string[];
    
    this.logger.info(
      {
        ticketId: ticket.id,
        fixName,
        targetFiles,
        stepCount: steps.length,
      },
      'Führe AutoFix-Plan automatisch aus'
    );

    // Informiere Kunden, dass der Fix automatisch ausgeführt wird
    await this.context.supabase.from('support_ticket_messages').insert({
      ticket_id: ticket.id,
      author_type: 'support',
      author_name: 'Frontend Automation',
      message: `Ich führe jetzt automatisch einen Fix für "${fixName}" aus. Dies kann einige Sekunden dauern...`,
      internal_only: false,
      metadata: {
        kind: 'autopatch_plan_execution_started',
        fixName,
        targetFiles,
      },
      quick_reply_options: [],
    });

    // TODO: Hier könnte ein intelligenter Plan-Executor implementiert werden
    // Der die Schritte analysiert und automatisch Code-Änderungen vornimmt
    // Für jetzt: Plan speichern und Kunden informieren, dass manuelle Ausführung nötig ist
    
    // Speichere den Plan (wie bisher)
    const logger = this.logger.child({ component: 'AutopatchPlan', ticketId: ticket.id });
    const filePath = await persistAutopatchPlan(
      process.cwd(),
      action,
      autopatchCandidate.summary,
      {
        ticketId: ticket.id,
        title: ticket.title,
        description: ticket.description,
        locale: (ticket as any)?.source_metadata?.locale ?? null,
      },
      logger,
    );

    // Informiere Kunden über den Fortschritt
    await this.context.supabase.from('support_ticket_messages').insert({
      ticket_id: ticket.id,
      author_type: 'support',
      author_name: 'Frontend Automation',
      message: `Der Fix-Plan wurde erstellt. Für komplexe Fixes wie PDF-Upload-Probleme ist eine manuelle Überprüfung erforderlich. Der Plan wurde gespeichert und wird von unserem Team bearbeitet.`,
      internal_only: false,
      metadata: {
        kind: 'autopatch_plan_saved',
        filePath,
        fixName,
      },
      quick_reply_options: [],
    });
  }

  private async insertAutomationEvent(
    ticketId: string,
    actionType: string,
    payload: Record<string, unknown>,
    agentId: string
  ) {
    const payloadWithAgent = {
      ...(payload ?? {}),
      agent: agentId,
    };

    const { error } = await this.context.supabase.from('support_automation_events').insert({
      ticket_id: ticketId,
      action_type: actionType,
      payload: payloadWithAgent,
    });

    if (error) {
      this.logger.warn(
        { err: error, ticketId, actionType },
        'Automation-Event konnte nicht gespeichert werden (Tabelle vorhanden?)'
      );
    }
  }

  getHeartbeatMeta() {
    return {
      processedTickets: this.processedTickets,
      lastDispatchAt: this.lastDispatchAt ? this.lastDispatchAt.toISOString() : null,
      lastPollingAt: this.lastPollingAt ? this.lastPollingAt.toISOString() : null,
      lastTier2RunAt: this.lastTier2RunAt ? this.lastTier2RunAt.toISOString() : null,
      lastCustomerReplyAt: this.lastCustomerReplyAt ? this.lastCustomerReplyAt.toISOString() : null,
      lastRealtimeStatus: this.lastRealtimeStatus,
      ticketChannelStatus: this.ticketChannelStatus,
      messageChannelStatus: this.messageChannelStatus,
      realtimeReconnects: this.realtimeReconnects,
    };
  }

  private async detectImmediateAutopatch(
    ticket: SupportTicket,
  ): Promise<
    | {
        patternId: string;
        summary: string;
        actions: ResolutionAction[];
        customerMessage: string;
        autoFixInstructions?: AutoFixInstruction[];
      }
    | null
  > {
    const autopatchMeta = (ticket.source_metadata as Record<string, unknown> | undefined)?.autopatch as
      | { status?: string; patternId?: string }
      | undefined;

    // Wenn bereits 'applied', kein erneutes Autopatch
    if (autopatchMeta?.status === 'applied') {
      return null;
    }

    // WICHTIG: Zuerst Reverse Engineering Analyzer verwenden
    // Dieser betrachtet ALLE Konfigurationen als potenzielle Fehlerquellen
    const reverseEngCandidate = await this.reverseEngineeringAnalyzer.matchTicketToConfiguration(ticket);
    if (reverseEngCandidate) {
      this.logger.info(
        { ticketId: ticket.id, patternId: reverseEngCandidate.patternId },
        'Reverse Engineering Analyzer hat Pattern erkannt'
      );
      return reverseEngCandidate;
    }

    // Fallback: Hardcodierte Patterns (nur wenn Reverse Engineering nichts findet)
    const candidate = matchAutopatchPattern(ticket);
    if (!candidate) {
      return null;
    }
    
    // WICHTIG: Wenn Status 'planned' ist, MUSS der Candidate zurückgegeben werden,
    // damit processAutopatchCandidate die AutoFix-Instructions ausführen kann!
    // Nur wenn bereits 'applied' oder ein anderes Pattern, dann null zurückgeben
    if (
      autopatchMeta?.patternId &&
      autopatchMeta.patternId === candidate.patternId &&
      autopatchMeta.status === 'applied'
    ) {
      return null;
    }
    
    // Wenn Pattern bereits erkannt wurde, aber Status ist 'planned' oder nicht vorhanden,
    // dann Candidate zurückgeben, damit AutoFix ausgeführt werden kann
    return candidate;
  }

  private async hasRecentMessage(
    ticketId: string,
    authorType: 'system' | 'support',
    message: string,
    windowMinutes = 10
  ): Promise<boolean> {
    const sinceIso = new Date(Date.now() - windowMinutes * 60_000).toISOString();
    const { data, error } = await this.context.supabase
      .from('support_ticket_messages')
      .select('id')
      .eq('ticket_id', ticketId)
      .eq('author_type', authorType)
      .eq('message', message)
      .gte('created_at', sinceIso)
      .limit(1);

    if (error) {
      this.logger.warn({ err: error, ticketId }, 'Duplikatprüfung fehlgeschlagen');
      return false;
    }

    return Array.isArray(data) && data.length > 0;
  }

  async stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.channel) {
      await this.channel.unsubscribe();
      this.channel = null;
    }
    if (this.messageChannel) {
      await this.messageChannel.unsubscribe();
      this.messageChannel = null;
    }
  }

  private async handleUxUpdate(ticket: SupportTicket, action: ResolutionAction) {
    const fixId = typeof action.payload?.fixId === 'string' ? action.payload.fixId : null;
    if (!fixId) {
      return;
    }

    const logger = this.logger.child({ component: 'UxFixRunner', fixId, ticketId: ticket.id });

    try {
      switch (fixId) {
        case 'rag_playground_scroll': {
          const applied = await applyRagPlaygroundScrollFix(process.cwd(), logger);
          if (applied) {
            await this.insertSystemLog(
              ticket.id,
              'Automatische UX-Anpassung angewendet: RAG Playground Scroll & Sticky-Sources.',
              {
                fixId,
                ticketId: ticket.id,
              },
              'Frontend Automation'
            );

            await this.context.supabase.from('support_ticket_messages').insert({
              ticket_id: ticket.id,
              author_type: 'support',
              author_name: 'Frontend Automation',
              message:
                'Ich habe den RAG Playground aktualisiert: Die Wissensquellen bleiben jetzt links sichtbar und der Chatbereich lässt sich vollständig scrollen. Bitte lade die Seite einmal neu (Strg/Cmd + Shift + R) und probiere es erneut.',
              metadata: {
                kind: 'ux_fix',
                fixId,
              },
              internal_only: false,
              quick_reply_options: [],
            });

            await this.context.supabase
              .from('support_tickets')
              .update({
                status: 'waiting_customer',
                updated_at: new Date().toISOString(),
              })
              .eq('id', ticket.id);
          }
          break;
        }
        default:
          logger.warn('Unbekannte UX-Fix-ID – keine Aktion ausgeführt');
      }
    } catch (error) {
      logger.error({ err: error }, 'UX-Fix konnte nicht ausgeführt werden');
      await this.insertSystemLog(
        ticket.id,
        `Automatische UX-Anpassung fehlgeschlagen (${fixId}). Bitte manuell prüfen.`,
        {
          fixId,
          error: error instanceof Error ? error.message : 'unknown_error',
        }
      );
    }
  }

  private shouldAutoApplyRagFix(ticket: SupportTicket): boolean {
    const text = `${ticket.title ?? ''} ${ticket.description ?? ''}`.toLowerCase();
    if (!text.includes('rag playground')) {
      return false;
    }

    const keywords = ['scroll', 'scrolle', 'nicht scroll', 'wissen', 'wissensquelle', 'quelle', 'links'];
    return keywords.some((keyword) => text.includes(keyword));
  }

  /**
   * Prüft, ob der Error-Handler-Agent aktiviert werden sollte.
   * Wird bei kritischen Fehlern, wiederholten Fehlern oder Systemfehlern aktiviert.
   */
  private shouldUseErrorHandler(ticket: SupportTicket): boolean {
    const text = `${ticket.title ?? ''} ${ticket.description ?? ''}`.toLowerCase();
    const metadata = ticket.source_metadata as Record<string, unknown> | undefined;

    // Wiederholte Fehler (mehrere Versuche) - ZUERST prüfen (höchste Priorität)
    const errorCount = (metadata?.error_count as number | undefined) ?? 0;
    if (errorCount >= 3) {
      this.logger.info({ ticketId: ticket.id, errorCount, metadata }, 'Error-Handler: Wiederholter Fehler erkannt (error_count >= 3)');
      return true;
    }

    // Fehler in Auto-Fix-Operationen
    const autopatchMeta = metadata?.autopatch as Record<string, unknown> | undefined;
    const retryCount = (autopatchMeta?.retry_count as number | undefined) ?? 0;
    if (autopatchMeta?.status === 'failed' && retryCount >= 2) {
      this.logger.info({ ticketId: ticket.id, retryCount, autopatchMeta }, 'Error-Handler: Auto-Fix-Fehler erkannt (retry_count >= 2)');
      return true;
    }

    // Kritische Systemfehler - verschiedene Varianten prüfen
    const criticalErrorPatterns = [
      'err_module_not_found',
      'cannot find module',
      'module not found',
      'internal server error',
      'database connection error',
      'service unavailable',
      'timeout',
      'crash',
      'fatal error',
      'critical error',
      'system error',
    ];
    
    const matchedPattern = criticalErrorPatterns.find((pattern) => text.includes(pattern));
    if (matchedPattern) {
      this.logger.info({ ticketId: ticket.id, pattern: matchedPattern, title: ticket.title }, 'Error-Handler: Kritischer Fehler erkannt');
      return true;
    }

    this.logger.debug({ ticketId: ticket.id, text: text.substring(0, 100), errorCount, hasAutopatch: !!autopatchMeta }, 'Error-Handler: Keine Bedingung erfüllt');
    return false;
  }

  /**
   * Gibt den Grund für die Error-Handler-Aktivierung zurück.
   */
  private getErrorHandlerReason(ticket: SupportTicket): string {
    const text = `${ticket.title ?? ''} ${ticket.description ?? ''}`.toLowerCase();
    const metadata = ticket.source_metadata as Record<string, unknown> | undefined;

    if (text.includes('err_module_not_found') || text.includes('cannot find module')) {
      return 'Module not found error';
    }
    if (text.includes('internal server error')) {
      return 'Internal server error';
    }
    if (text.includes('database connection error')) {
      return 'Database connection error';
    }

    const errorCount = (metadata?.error_count as number | undefined) ?? 0;
    if (errorCount >= 3) {
      return `Repeated errors (${errorCount} attempts)`;
    }

    const autopatchMeta = metadata?.autopatch as Record<string, unknown> | undefined;
    if (autopatchMeta?.status === 'failed') {
      return 'Autopatch failed multiple times';
    }

    return 'Unknown critical error';
  }

  /**
   * Führt Fehler-Wiederherstellung durch:
   * - Retry-Logik für fehlgeschlagene Operationen
   * - Fehler-Logging und -Reporting
   * - Automatische Wiederherstellung wo möglich
   */
  private async handleErrorRecovery(ticket: SupportTicket): Promise<void> {
    const metadata = ticket.source_metadata as Record<string, unknown> | undefined;
    const errorCount = ((metadata?.error_count as number | undefined) ?? 0) + 1;

    // Fehler zählen
    await this.context.supabase
      .from('support_tickets')
      .update({
        source_metadata: {
          ...metadata,
          error_count: errorCount,
          last_error_at: new Date().toISOString(),
        },
      })
      .eq('id', ticket.id);

    // Fehler-Logging
    await this.insertSystemLog(
      ticket.id,
      `Error-Handler aktiviert: ${this.getErrorHandlerReason(ticket)} (Versuch ${errorCount})`,
      {
        kind: 'error_handler',
        reason: this.getErrorHandlerReason(ticket),
        errorCount,
        ticketId: ticket.id,
      },
      'Error Handler Agent'
    );

    // Retry-Logik für Auto-Fix-Operationen
    const autopatchMeta = metadata?.autopatch as Record<string, unknown> | undefined;
    if (autopatchMeta?.status === 'failed' && errorCount < 3) {
      this.logger.info({ ticketId: ticket.id }, 'Retry für fehlgeschlagenen Auto-Fix');
      
      // Retry mit verbessertem Fehler-Handling
      await this.context.supabase
        .from('support_tickets')
        .update({
          source_metadata: {
            ...metadata,
            autopatch: {
              ...autopatchMeta,
              retry_count: ((autopatchMeta.retry_count as number | undefined) ?? 0) + 1,
              last_retry_at: new Date().toISOString(),
            },
          },
        })
        .eq('id', ticket.id);
    }

    // Bei zu vielen Fehlern: Eskalation
    if (errorCount >= 3) {
      await this.insertSystemLog(
        ticket.id,
        `Kritischer Fehler: ${errorCount} Versuche fehlgeschlagen. Manuelle Intervention erforderlich.`,
        {
          kind: 'error_escalation',
          errorCount,
          ticketId: ticket.id,
        },
        'Error Handler Agent'
      );

      await this.context.supabase
        .from('support_tickets')
        .update({
          priority: 'high',
          status: 'investigating',
          assigned_agent: 'escalation-agent',
        })
        .eq('id', ticket.id);
    }
  }
}

function extractQuickReplyOptions(actions: ResolutionAction[]): unknown[] | null {
  const quickReplyAction = actions.find(
    (action) => action.type === 'manual_followup' && Array.isArray(action.payload?.quickReplies)
  );
  if (!quickReplyAction) {
    return null;
  }
  const replies = quickReplyAction.payload?.quickReplies;
  if (Array.isArray(replies)) {
    return replies;
  }
  return [];
}

function hasAction(actions: ResolutionAction[], match: ResolutionAction['type']) {
  return actions.some((action) => action.type === match);
}

