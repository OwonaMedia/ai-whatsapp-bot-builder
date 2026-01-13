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
import { MetricsTracker } from '../utils/metricsTracker.js';
import { TicketResolutionGuarantee } from './ticketResolutionGuarantee.js';
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

// Cache für Pattern-Erkennung (TTL: 5 Minuten)
interface PatternCacheEntry {
  result: Awaited<ReturnType<SupportTicketRouter['detectImmediateAutopatch']>>;
  timestamp: number;
  ticketHash: string;
}

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
  private readonly ticketResolutionGuarantee: TicketResolutionGuarantee;
  private readonly metricsTracker: MetricsTracker;
  private readonly patternCache = new Map<string, PatternCacheEntry>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 Minuten
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
      context.llmClient, // LLM Client für Level-3 Matching
    );
    this.ticketResolutionGuarantee = new TicketResolutionGuarantee(
      context.supabase,
      logger.child({ component: 'TicketResolutionGuarantee' }),
    );
    this.metricsTracker = new MetricsTracker(
      context.supabase,
      logger.child({ component: 'MetricsTracker' }),
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
      // KRITISCH: Prüfe ob Ticket bereits verarbeitet wird (wartet auf Telegram-Bestätigung)
      const isProcessing = await this.isTicketBeingProcessed(ticket.id);
      if (isProcessing) {
        this.logger.debug(
          { ticketId: ticket.id },
          'Ticket wird bereits verarbeitet (wartet auf Bestätigung) - überspringe'
        );
        continue; // Überspringe Ticket, wenn es bereits verarbeitet wird
      }

      await this.dispatch({ eventType: 'UPDATE', ticket: ticket as SupportTicket });
    }
  }

  /**
   * Prüft ob ein Ticket bereits verarbeitet wird (z.B. wartet auf Telegram-Bestätigung)
   */
  private async isTicketBeingProcessed(ticketId: string): Promise<boolean> {
    try {
      // Prüfe ob bereits eine Bestätigungsanfrage gesendet wurde (telegram_approval_request)
      const { data: requestData } = await this.context.supabase
        .from('support_automation_events')
        .select('*')
        .eq('ticket_id', ticketId)
        .eq('action_type', 'telegram_approval_request')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (requestData) {
        // Prüfe ob bereits eine Antwort vorhanden ist (telegram_approval)
        const { data: approvalData } = await this.context.supabase
          .from('support_automation_events')
          .select('*')
          .eq('ticket_id', ticketId)
          .eq('action_type', 'telegram_approval')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!approvalData) {
          // Anfrage wurde gesendet, aber noch keine Antwort - Ticket wird verarbeitet
          this.logger.debug(
            { ticketId, requestCreatedAt: requestData.created_at },
            'Ticket wartet auf Telegram-Bestätigung (Anfrage gesendet, aber keine Antwort)'
          );
          return true;
        }

        // Antwort vorhanden - prüfe ob sehr neu (< 2 Minuten)
        const approvalCreatedAt = new Date(approvalData.created_at);
        const now = new Date();
        const minutesSinceApproval = (now.getTime() - approvalCreatedAt.getTime()) / (1000 * 60);
        if (minutesSinceApproval < 2) {
          this.logger.debug(
            { ticketId, minutesSinceApproval },
            'Ticket hat kürzlich Bestätigung erhalten - könnte noch verarbeitet werden'
          );
          return true;
        }
      }

      // ZUSÄTZLICH: Prüfe ob Ticket-Status auf "investigating" ist und sehr neu aktualisiert wurde
      const { data: ticketData } = await this.context.supabase
        .from('support_tickets')
        .select('status, updated_at')
        .eq('id', ticketId)
        .single();

      if (ticketData && ticketData.status === 'investigating') {
        const updatedAt = new Date(ticketData.updated_at || ticketData.updated_at);
        const now = new Date();
        const minutesSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60);
        // Wenn Ticket vor weniger als 2 Minuten auf "investigating" gesetzt wurde, könnte es noch verarbeitet werden
        if (minutesSinceUpdate < 2) {
          this.logger.debug(
            { ticketId, minutesSinceUpdate },
            'Ticket wurde kürzlich auf investigating gesetzt - könnte noch verarbeitet werden'
          );
          return true;
        }
      }

      return false;
    } catch (error) {
      this.logger.warn({ err: error, ticketId }, 'Fehler beim Prüfen ob Ticket verarbeitet wird');
      return false; // Im Zweifel erlauben
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
    const detectionStartTime = Date.now();
    
    // Track Problem Detection
    let problemDetected = false;
    let problemType: string | undefined;
    let detectionMethod: 'keyword' | 'semantic' | 'llm' | 'reverse_engineering' = 'reverse_engineering';
    let fixGenerated = false;
    let fixType: string | undefined;
    let fixApplied = false;
    let fixSuccess = false;
    let postFixVerificationPassed = false;
    
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
    
    // Track Problem Detection
    problemDetected = true;
    problemType = autopatchCandidate.patternId;
    detectionMethod = 'reverse_engineering'; // Reverse Engineering Analyzer wird verwendet
    
    // KRITISCH: Console-Logging für sofortige Sichtbarkeit
    this.debugLog('processAutopatchCandidate: Start', {
      ticketId: ticket.id,
      patternId: autopatchCandidate.patternId,
      hasAutoFixInstructions: !!autopatchCandidate.autoFixInstructions,
      autoFixInstructionsLength: autopatchCandidate.autoFixInstructions?.length ?? 0,
      autoFixInstructionsFull: JSON.stringify(autopatchCandidate.autoFixInstructions ?? []),
      processStartTime,
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

    // Kundenkommunikation NUR senden wenn AutoFix-Instructions vorhanden sind
    // Wenn keine Instructions vorhanden, wird später eine interne Nachricht gesendet
    if (autopatchCandidate.autoFixInstructions && autopatchCandidate.autoFixInstructions.length > 0) {
      const initialMessage = this.getInitialCustomerMessage(ticket, autopatchCandidate);
      // Duplikat-Prüfung vor dem Senden
      if (!(await this.hasRecentMessage(ticket.id, 'support', initialMessage))) {
        await this.context.supabase.from('support_ticket_messages').insert({
          ticket_id: ticket.id,
          author_type: 'support',
          author_name: 'Support Team',
          message: initialMessage,
          internal_only: false,
          metadata: autopatchMetadata,
          quick_reply_options: [],
        });
      }
    }

    // Actions ausführen (z.B. Autopatch-Spezifikation erstellen)
    // WICHTIG: autopatch_plan Actions werden automatisch ausgeführt, nicht nur gespeichert
    // executeAutopatchPlan wird NICHT mehr aufgerufen - AutoFix-Instructions werden direkt ausgeführt
    for (const action of autopatchCandidate.actions) {
      if (action.type === 'autopatch_plan') {
        // Speichere Plan nur intern (für Dokumentation)
        const logger = this.logger.child({ component: 'AutopatchPlan', ticketId: ticket.id });
        await persistAutopatchPlan(
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
        // Keine Kundenkommunikation hier - wird nach AutoFix gemacht
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
      // Track Fix Generation
      fixGenerated = true;
      fixType = autopatchCandidate.autoFixInstructions.map((i) => i.type).join(', ');
      
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
          
          // KRITISCH: Verwende frontendRoot für Code-Modifikationen
          // Code-Änderungen müssen im Frontend-Verzeichnis vorgenommen werden, nicht im support-mcp-server Verzeichnis
          const absoluteRootDir = this.context.config.frontendRoot || 
            (process.cwd().endsWith('support-mcp-server')
              ? path.resolve(process.cwd(), '../frontend')
              : path.resolve(process.cwd(), 'frontend'));
          
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
          const executeFixStartTime = Date.now();
          this.debugLog('executeAutoFixInstructions wird aufgerufen', {
            absoluteRootDir,
            instructionCount: autopatchCandidate.autoFixInstructions.length,
            instructions: autopatchCandidate.autoFixInstructions,
            startTime: executeFixStartTime,
          });
          
          const fixResult = await executeAutoFixInstructions(
            absoluteRootDir,
            autopatchCandidate.autoFixInstructions,
            fixLogger,
            {
              ticketId: ticket.id,
              supabase: this.context.supabase,
            },
          );
          
          // Track Fix Application
          fixApplied = true;
          fixSuccess = fixResult.success;
          
          const executeFixDuration = Date.now() - executeFixStartTime;
          // KRITISCH: Logging direkt nach dem Aufruf
          this.debugLog('executeAutoFixInstructions zurückgekehrt', {
            success: fixResult.success,
            message: fixResult.message,
            hasError: !!fixResult.error,
            duration: executeFixDuration,
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
          
          // KRITISCH: Post-Fix-Verifikation - prüfe ob Problem wirklich behoben ist
          const postFixVerifyStartTime = Date.now();
          this.debugLog('processAutopatchCandidate: Start verifyProblemAfterFix', {
            ticketId: ticket.id,
            patternId: autopatchCandidate.patternId,
            startTime: postFixVerifyStartTime,
          });
          this.logger.info(
            { ticketId: ticket.id, patternId: autopatchCandidate.patternId },
            'Starte Post-Fix-Verifikation'
          );
          
          const postFixVerification = await this.verifyProblemAfterFix(ticket, autopatchCandidate, fixResult);
          const postFixVerifyDuration = Date.now() - postFixVerifyStartTime;
          this.debugLog('processAutopatchCandidate: verifyProblemAfterFix abgeschlossen', {
            ticketId: ticket.id,
            duration: postFixVerifyDuration,
            problemExists: postFixVerification.problemExists,
          });
          
          if (postFixVerification.problemExists) {
            // Problem wurde NICHT behoben - KEINE Kunden-Nachricht
            autoFixStatus = 'planned'; // Status bleibt "planned" da Problem weiterhin besteht
            autoFixMessage = `AutoFix angewendet, aber Problem-Verifikation fehlgeschlagen: ${postFixVerification.evidence.join('; ')}`;
            
            this.logger.warn(
              {
                ticketId: ticket.id,
                patternId: autopatchCandidate.patternId,
                evidence: postFixVerification.evidence,
              },
              'Post-Fix-Verifikation: Problem besteht weiterhin - KEINE Kunden-Nachricht'
            );
            
            // Nur interne Nachricht (mit Duplikat-Prüfung)
            const postFixFailedMessage = `Fix wurde angewendet, aber Problem-Verifikation zeigt, dass das Problem weiterhin besteht. Manuelle Prüfung erforderlich.`;
            if (!(await this.hasRecentMessage(ticket.id, 'system', postFixFailedMessage))) {
              await this.context.supabase.from('support_ticket_messages').insert({
                ticket_id: ticket.id,
                author_type: 'system',
                author_name: 'Autopatch Automation',
                message: postFixFailedMessage,
                internal_only: true,
                metadata: {
                  kind: 'autopatch_postfix_verification_failed',
                  evidence: postFixVerification.evidence,
                  patternId: autopatchCandidate.patternId,
                },
                quick_reply_options: [],
              });
            }

            // KRITISCH: Ticket-Lösungs-Garantie aufrufen
            try {
              const guaranteeResult = await this.ticketResolutionGuarantee.ensureTicketResolution(
                ticket,
                fixResult,
                1, // autoFixAttempts
              );
              
              this.logger.info(
                {
                  ticketId: ticket.id,
                  guaranteeStatus: guaranteeResult.status,
                  guaranteeResolved: guaranteeResult.resolved,
                },
                'Ticket-Lösungs-Garantie angewendet'
              );

              // Update Ticket-Status basierend auf Garantie-Ergebnis
              if (guaranteeResult.status !== ticket.status) {
                await this.context.supabase
                  .from('support_tickets')
                  .update({ status: guaranteeResult.status })
                  .eq('id', ticket.id);
              }
            } catch (error) {
              this.logger.error(
                { err: error, ticketId: ticket.id },
                'Fehler bei Ticket-Lösungs-Garantie'
              );
            }
          } else {
            // Track Post-Fix Verification
            postFixVerificationPassed = true;
            
            // Problem wurde wirklich behoben - Kunden-Nachricht senden
            this.logger.info(
              {
                ticketId: ticket.id,
                patternId: autopatchCandidate.patternId,
                evidence: postFixVerification.evidence,
              },
              'Post-Fix-Verifikation erfolgreich - Problem behoben'
            );
            
            // Kundenfreundliche Nachricht (nur wenn Problem wirklich behoben ist)
            const customerMessage = this.getCustomerFriendlyMessage(ticket, autopatchCandidate, warnings.length > 0);
            // Duplikat-Prüfung vor dem Senden
            if (!(await this.hasRecentMessage(ticket.id, 'support', customerMessage))) {
              await this.context.supabase.from('support_ticket_messages').insert({
                ticket_id: ticket.id,
                author_type: 'support',
                author_name: 'Support Team',
                message: customerMessage,
                internal_only: false,
                metadata: {
                  kind: 'autopatch_autofix_success_verified',
                  summary: autoFixMessage,
                  patternId: autopatchCandidate.patternId,
                  verificationEvidence: postFixVerification.evidence,
                },
                quick_reply_options: [],
              });
            }

            if (warnings.length) {
              // Warnungen nur intern
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
          }
        } else {
          autoFixMessage =
            (fixResult.error instanceof Error ? fixResult.error.message : fixResult.message) ??
            'AutoFix fehlgeschlagen.';
          
          // KEINE Kunden-Nachricht bei Fehler - nur interne Nachricht
          await this.context.supabase.from('support_ticket_messages').insert({
            ticket_id: ticket.id,
            author_type: 'system',
            author_name: 'Autopatch Automation',
            message: `Automatischer Fix konnte nicht vollständig durchgeführt werden: ${autoFixMessage}`,
            internal_only: true,
            metadata: {
              kind: 'autopatch_autofix_failed_internal',
              error: autoFixMessage,
              patternId: autopatchCandidate.patternId,
            },
            quick_reply_options: [],
          });

          // KRITISCH: Ticket-Lösungs-Garantie aufrufen bei AutoFix-Fehler
          try {
            const guaranteeResult = await this.ticketResolutionGuarantee.ensureTicketResolution(
              ticket,
              fixResult,
              1, // autoFixAttempts
            );
            
            this.logger.info(
              {
                ticketId: ticket.id,
                guaranteeStatus: guaranteeResult.status,
                guaranteeResolved: guaranteeResult.resolved,
              },
              'Ticket-Lösungs-Garantie angewendet (AutoFix fehlgeschlagen)'
            );

            // Update Ticket-Status basierend auf Garantie-Ergebnis
            if (guaranteeResult.status !== ticket.status) {
              await this.context.supabase
                .from('support_tickets')
                .update({ status: guaranteeResult.status })
                .eq('id', ticket.id);
            }
          } catch (error) {
            this.logger.error(
              { err: error, ticketId: ticket.id },
              'Fehler bei Ticket-Lösungs-Garantie'
            );
          }
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
      
      // Wenn keine AutoFix-Instructions vorhanden, KEINE Kunden-Nachricht (nur intern)
      const noAutofixMessage = `Problem erkannt (${autopatchCandidate.patternId}), aber keine automatischen Fix-Instructions verfügbar. Manuelle Prüfung erforderlich.`;
      // Duplikat-Prüfung vor dem Senden
      if (!(await this.hasRecentMessage(ticket.id, 'system', noAutofixMessage))) {
        await this.context.supabase.from('support_ticket_messages').insert({
          ticket_id: ticket.id,
          author_type: 'system',
          author_name: 'Autopatch Automation',
          message: noAutofixMessage,
          internal_only: true,
          metadata: {
            kind: 'autopatch_no_autofix',
            patternId: autopatchCandidate.patternId,
          },
          quick_reply_options: [],
        });
      }
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

    // Timing-Zusammenfassung
    const processDuration = Date.now() - processStartTime;
    const detectionTime = Date.now() - detectionStartTime;
    
    this.debugLog('processAutopatchCandidate: Abgeschlossen', {
      ticketId: ticket.id,
      patternId: autopatchCandidate.patternId,
      totalDuration: processDuration,
      detectionTime,
      problemDetected,
      problemType,
      detectionMethod,
      fixGenerated,
      fixType,
      fixApplied,
      fixSuccess,
      postFixVerificationPassed,
    });
    
    // Track Metrics
    try {
      await this.metricsTracker.trackProblemDiagnosis({
        ticketId: ticket.id,
        problemDetected,
        problemType,
        detectionMethod,
        detectionTime,
        fixGenerated,
        fixType,
        fixGenerationTime: fixGenerated ? detectionTime : 0,
        fixApplied,
        fixSuccess,
        fixApplicationTime: fixApplied ? (processDuration - detectionTime) : 0,
        totalProcessingTime: processDuration,
        postFixVerificationPassed,
        postFixVerificationTime: postFixVerificationPassed ? (processDuration - detectionTime) : 0,
        createdAt: new Date(),
      });
    } catch (error) {
      this.logger.warn(
        { err: error, ticketId: ticket.id },
        'Fehler beim Tracken der Metriken (nicht kritisch)'
      );
    }
    
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
   * Erstellt initiale kundenfreundliche Nachricht
   */
  private getInitialCustomerMessage(
    ticket: SupportTicket,
    autopatchCandidate: AutopatchCandidate
  ): string {
    const ticketText = `${ticket.title ?? ''} ${ticket.description ?? ''}`.toLowerCase();
    
    // Spezifische Nachrichten basierend auf Problem-Typ
    if (ticketText.includes('pdf') || ticketText.includes('upload') || ticketText.includes('wissensquelle')) {
      return 'Ich habe das PDF-Upload-Problem erkannt und behebe es jetzt automatisch. Das dauert nur einen Moment...';
    }
    
    if (ticketText.includes('zahlung') || ticketText.includes('payment') || ticketText.includes('checkout') || ticketText.includes('apple pay')) {
      return 'Ich habe das Zahlungsproblem erkannt und behebe es jetzt automatisch. Das dauert nur einen Moment...';
    }
    
    if (ticketText.includes('übersetzung') || ticketText.includes('translation') || ticketText.includes('missing_message')) {
      return 'Ich habe den fehlenden Text erkannt und ergänze ihn jetzt automatisch. Das dauert nur einen Moment...';
    }
    
    // Generische Nachricht
    return 'Ich habe das Problem erkannt und behebe es jetzt automatisch. Das dauert nur einen Moment...';
  }

  /**
   * Erstellt kundenfreundliche Nachrichten (nicht technisch)
   */
  private getCustomerFriendlyMessage(
    ticket: SupportTicket,
    autopatchCandidate: AutopatchCandidate,
    hasWarnings: boolean
  ): string {
    const ticketText = `${ticket.title ?? ''} ${ticket.description ?? ''}`.toLowerCase();
    
    // Spezifische Nachrichten basierend auf Problem-Typ
    if (ticketText.includes('pdf') || ticketText.includes('upload') || ticketText.includes('wissensquelle')) {
      return hasWarnings
        ? 'Das PDF-Upload-Problem wurde behoben. Bitte lade die Seite einmal neu (Strg/Cmd + Shift + R) und versuche es erneut. Falls das Problem weiterhin besteht, melde dich gerne.'
        : 'Das PDF-Upload-Problem wurde behoben. Bitte lade die Seite einmal neu (Strg/Cmd + Shift + R) und versuche es erneut.';
    }
    
    if (ticketText.includes('zahlung') || ticketText.includes('payment') || ticketText.includes('checkout') || ticketText.includes('apple pay')) {
      return hasWarnings
        ? 'Das Zahlungsproblem wurde behoben. Bitte lade die Seite einmal neu und versuche es erneut. Falls das Problem weiterhin besteht, melde dich gerne.'
        : 'Das Zahlungsproblem wurde behoben. Bitte lade die Seite einmal neu und versuche es erneut.';
    }
    
    if (ticketText.includes('übersetzung') || ticketText.includes('translation') || ticketText.includes('missing_message')) {
      return 'Der fehlende Text wurde ergänzt. Bitte lade die Seite einmal neu und prüfe, ob alles korrekt angezeigt wird.';
    }
    
    // Generische Nachricht
    return hasWarnings
      ? 'Das Problem wurde behoben. Bitte lade die Seite einmal neu (Strg/Cmd + Shift + R) und versuche es erneut. Falls das Problem weiterhin besteht, melde dich gerne.'
      : 'Das Problem wurde behoben. Bitte lade die Seite einmal neu (Strg/Cmd + Shift + R) und versuche es erneut.';
  }

  /**
   * Führt einen AutoFix-Plan automatisch aus
   * DEPRECATED: Wird nicht mehr verwendet - AutoFix-Instructions werden direkt ausgeführt
   * Diese Methode wird nur noch für interne Dokumentation verwendet (Plan speichern)
   */
  private async executeAutopatchPlan(
    ticket: SupportTicket,
    action: ResolutionAction,
    autopatchCandidate: AutopatchCandidate,
  ) {
    if (action.type !== 'autopatch_plan') {
      return;
    }
    
    // Nur Plan speichern (intern), keine Kundenkommunikation
    const logger = this.logger.child({ component: 'AutopatchPlan', ticketId: ticket.id });
    await persistAutopatchPlan(
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
    
    // Keine Kundenkommunikation hier - wird nach AutoFix gemacht
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
    this.debugLog('detectImmediateAutopatch: Start', {
      ticketId: ticket.id,
      title: ticket.title,
      description: ticket.description?.substring(0, 100),
    });
    
    const autopatchMeta = (ticket.source_metadata as Record<string, unknown> | undefined)?.autopatch as
      | { status?: string; patternId?: string }
      | undefined;

    // Wenn bereits 'applied', kein erneutes Autopatch
    if (autopatchMeta?.status === 'applied') {
      this.debugLog('detectImmediateAutopatch: Autopatch bereits applied - überspringe', {
        ticketId: ticket.id,
        status: autopatchMeta.status,
        patternId: autopatchMeta.patternId,
      });
      return null;
    }

    // OPTIMIERUNG: Cache-Prüfung (schneller Early-Exit)
    const ticketHash = `${ticket.id}-${ticket.title}-${ticket.description?.substring(0, 100)}`;
    const cached = this.patternCache.get(ticketHash);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.debugLog('detectImmediateAutopatch: Cache-Hit', {
        ticketId: ticket.id,
        cacheAge: Date.now() - cached.timestamp,
      });
      return cached.result;
    }

    // OPTIMIERUNG: Early-Exit mit schnellem Keyword-Matching (vor Reverse Engineering)
    // Dies ist viel schneller als Reverse Engineering und kann viele Fälle abfangen
    const quickMatchStartTime = Date.now();
    const { matchAutopatchPattern } = await import('./actions/autopatchPatterns.js');
    const quickMatch = matchAutopatchPattern(ticket);
    const quickMatchDuration = Date.now() - quickMatchStartTime;
    
    if (quickMatch && quickMatchDuration < 100) {
      // Schnelles Pattern gefunden (< 100ms) - verwende es direkt
      this.debugLog('detectImmediateAutopatch: Schnelles Pattern gefunden (Keyword-Matching)', {
        ticketId: ticket.id,
        patternId: quickMatch.patternId,
        duration: quickMatchDuration,
      });
      
      // Problem-Verifikation (kann länger dauern, aber nur bei schnellem Match)
      const verified = await this.verifyProblemBeforeFix(ticket, quickMatch);
      if (!verified.problemExists) {
        this.logger.info(
          { ticketId: ticket.id, patternId: quickMatch.patternId, evidence: verified.evidence },
          'Problem-Verifikation: Problem existiert nicht - überspringe Fix'
        );
        // Cache null-Ergebnis
        this.patternCache.set(ticketHash, { result: null, timestamp: Date.now(), ticketHash });
        return null;
      }
      
      // Cache erfolgreiches Ergebnis
      this.patternCache.set(ticketHash, { result: quickMatch, timestamp: Date.now(), ticketHash });
      
      // Cache-Bereinigung (entferne alte Einträge)
      this.cleanupPatternCache();
      
      return quickMatch;
    }

    // WICHTIG: Zuerst Reverse Engineering Analyzer verwenden
    // Dieser betrachtet ALLE Konfigurationen als potenzielle Fehlerquellen
    
    // NEU: Nutze Reverse Engineering als "negative Blaupause" - erkenne Abweichungen
    const rootDir = this.context.config.frontendRoot;
    const detectDeviationsStartTime = Date.now();
    this.debugLog('detectImmediateAutopatch: Start detectDeviationsFromBlueprint', {
      ticketId: ticket.id,
      rootDir,
    });
    const deviations = await this.reverseEngineeringAnalyzer.detectDeviationsFromBlueprint(ticket, rootDir);
    const detectDeviationsDuration = Date.now() - detectDeviationsStartTime;
    this.debugLog('detectImmediateAutopatch: detectDeviationsFromBlueprint abgeschlossen', {
      ticketId: ticket.id,
      duration: detectDeviationsDuration,
      deviationCount: deviations.length,
      hasDeviations: deviations.length > 0,
    });
    
    if (deviations.length === 0) {
      this.debugLog('detectImmediateAutopatch: Keine Abweichungen gefunden - verwende Fallback', {
        ticketId: ticket.id,
      });
    }
    
    if (deviations.length > 0) {
      this.debugLog('detectImmediateAutopatch: Abweichungen gefunden', {
        ticketId: ticket.id,
        deviationCount: deviations.length,
        topRelevanceScore: deviations[0].relevanceScore,
        topDeviationName: deviations[0].config.name,
      });
      // Sortiere nach Relevanz (bereits in detectDeviationsFromBlueprint sortiert)
      const mostRelevantDeviation = deviations[0];
      
      // OPTIMIERUNG: Relevanz-Threshold erhöht (0.3 → 0.5) für weniger false positives
      const minRelevanceThreshold = 0.5;
      if (mostRelevantDeviation.relevanceScore < minRelevanceThreshold) {
        this.debugLog('detectImmediateAutopatch: Relevanz-Score zu niedrig', {
          ticketId: ticket.id,
          relevanceScore: mostRelevantDeviation.relevanceScore,
          threshold: minRelevanceThreshold,
        });
        this.logger.warn(
          { 
            ticketId: ticket.id, 
            deviationCount: deviations.length,
            topRelevanceScore: mostRelevantDeviation.relevanceScore,
            threshold: minRelevanceThreshold,
            topDeviation: mostRelevantDeviation.config.name,
          },
          'Reverse Engineering Blaupause: Relevanz-Score zu niedrig - verwende Fallback'
        );
        // Fallback zu normalem Matching
      } else {
        this.logger.info(
          { 
            ticketId: ticket.id, 
            deviationCount: deviations.length,
            topRelevanceScore: mostRelevantDeviation.relevanceScore,
            topDeviation: mostRelevantDeviation.config.name,
            severity: mostRelevantDeviation.severity,
            top3RelevanceScores: deviations.slice(0, 3).map(d => ({
              name: d.config.name,
              relevance: d.relevanceScore,
              severity: d.severity,
            })),
          },
          'Reverse Engineering Blaupause: Relevante Abweichungen erkannt'
        );
        
        // Erstelle Autopatch-Candidate aus Abweichung
        const createCandidateStartTime = Date.now();
        this.debugLog('detectImmediateAutopatch: Start createCandidateFromDeviation', {
          ticketId: ticket.id,
          deviationName: mostRelevantDeviation.config.name,
        });
        const deviationCandidate = await this.createCandidateFromDeviation(mostRelevantDeviation, ticket, rootDir);
        const createCandidateDuration = Date.now() - createCandidateStartTime;
        this.debugLog('detectImmediateAutopatch: createCandidateFromDeviation abgeschlossen', {
          ticketId: ticket.id,
          duration: createCandidateDuration,
          patternId: deviationCandidate.patternId,
        });
        
        // WICHTIG: Problem-Verifikation VOR Rückgabe
        const verifyStartTime = Date.now();
        this.debugLog('detectImmediateAutopatch: Start verifyProblemBeforeFix', {
          ticketId: ticket.id,
          patternId: deviationCandidate.patternId,
        });
        const verified = await this.verifyProblemBeforeFix(ticket, deviationCandidate);
        const verifyDuration = Date.now() - verifyStartTime;
        this.debugLog('detectImmediateAutopatch: verifyProblemBeforeFix abgeschlossen', {
          ticketId: ticket.id,
          duration: verifyDuration,
          problemExists: verified.problemExists,
        });
        if (!verified.problemExists) {
          this.logger.info(
            { ticketId: ticket.id, patternId: deviationCandidate.patternId, evidence: verified.evidence },
            'Problem-Verifikation: Problem existiert nicht - überspringe Fix'
          );
          // Fallback zu normalem Matching
        } else {
          this.logger.info(
            { ticketId: ticket.id, patternId: deviationCandidate.patternId, evidence: verified.evidence },
            'Problem-Verifikation: Abweichung bestätigt - Fix wird ausgeführt'
          );
          
          // Cache erfolgreiches Ergebnis
          this.patternCache.set(ticketHash, { result: deviationCandidate, timestamp: Date.now(), ticketHash });
          this.cleanupPatternCache();
          
          return deviationCandidate;
        }
      }
    }
    
    // Fallback: Normales Matching (wie bisher)
    const matchStartTime = Date.now();
    this.debugLog('detectImmediateAutopatch: Start matchTicketToConfiguration', {
      ticketId: ticket.id,
    });
    const reverseEngCandidate = await this.reverseEngineeringAnalyzer.matchTicketToConfiguration(ticket);
    const matchDuration = Date.now() - matchStartTime;
    this.debugLog('detectImmediateAutopatch: matchTicketToConfiguration abgeschlossen', {
      ticketId: ticket.id,
      duration: matchDuration,
      found: !!reverseEngCandidate,
      patternId: reverseEngCandidate?.patternId,
    });
    if (reverseEngCandidate) {
      this.logger.info(
        { ticketId: ticket.id, patternId: reverseEngCandidate.patternId },
        'Reverse Engineering Analyzer hat Pattern erkannt'
      );
      
      // WICHTIG: Problem-Verifikation VOR Rückgabe
      const verified = await this.verifyProblemBeforeFix(ticket, reverseEngCandidate);
      if (!verified.problemExists) {
        this.logger.info(
          { ticketId: ticket.id, patternId: reverseEngCandidate.patternId, evidence: verified.evidence },
          'Problem-Verifikation: Problem existiert nicht - überspringe Fix'
        );
        return null;
      }
      
      this.logger.info(
        { ticketId: ticket.id, patternId: reverseEngCandidate.patternId, evidence: verified.evidence },
        'Problem-Verifikation: Problem bestätigt - Fix wird ausgeführt'
      );
      
      // Cache erfolgreiches Ergebnis
      this.patternCache.set(ticketHash, { result: reverseEngCandidate, timestamp: Date.now(), ticketHash });
      this.cleanupPatternCache();
      
      return reverseEngCandidate;
    }

    // Fallback: Hardcodierte Patterns (nur wenn Reverse Engineering nichts findet)
    this.debugLog('detectImmediateAutopatch: Start matchAutopatchPattern (hardcodiert)', {
      ticketId: ticket.id,
      title: ticket.title,
      description: ticket.description?.substring(0, 100),
    });
    const candidate = matchAutopatchPattern(ticket);
    if (!candidate) {
      this.debugLog('detectImmediateAutopatch: matchAutopatchPattern hat kein Pattern gefunden', {
        ticketId: ticket.id,
        title: ticket.title,
      });
      return null;
    }
    this.debugLog('detectImmediateAutopatch: matchAutopatchPattern hat Pattern gefunden', {
      ticketId: ticket.id,
      patternId: candidate.patternId,
    });
    
    // WICHTIG: Problem-Verifikation VOR Rückgabe
    const verified = await this.verifyProblemBeforeFix(ticket, candidate);
    if (!verified.problemExists) {
      this.logger.info(
        { ticketId: ticket.id, patternId: candidate.patternId, evidence: verified.evidence },
        'Problem-Verifikation: Problem existiert nicht - überspringe Fix'
      );
      return null;
    }
    
    this.logger.info(
      { ticketId: ticket.id, patternId: candidate.patternId, evidence: verified.evidence },
      'Problem-Verifikation: Problem bestätigt - Fix wird ausgeführt'
    );
    
    // WICHTIG: Wenn Status 'planned' ist, MUSS der Candidate zurückgegeben werden,
    // damit processAutopatchCandidate die AutoFix-Instructions ausführen kann!
    // Nur wenn bereits 'applied' oder ein anderes Pattern, dann null zurückgeben
    if (
      autopatchMeta?.patternId &&
      autopatchMeta.patternId === candidate.patternId &&
      autopatchMeta.status === 'applied'
    ) {
      // Cache null-Ergebnis für bereits angewendete Patterns
      this.patternCache.set(ticketHash, { result: null, timestamp: Date.now(), ticketHash });
      this.cleanupPatternCache();
      return null;
    }
    
    // Cache erfolgreiches Ergebnis
    this.patternCache.set(ticketHash, { result: candidate, timestamp: Date.now(), ticketHash });
    this.cleanupPatternCache();
    
    // Wenn Pattern bereits erkannt wurde, aber Status ist 'planned' oder nicht vorhanden,
    // dann Candidate zurückgeben, damit AutoFix ausgeführt werden kann
    return candidate;
  }

  /**
   * Bereinigt den Pattern-Cache (entfernt alte Einträge)
   */
  private cleanupPatternCache(): void {
    const now = Date.now();
    const maxCacheSize = 100; // Maximal 100 Einträge im Cache
    
    // Entferne abgelaufene Einträge
    for (const [key, entry] of this.patternCache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.patternCache.delete(key);
      }
    }
    
    // Wenn Cache zu groß ist, entferne älteste Einträge
    if (this.patternCache.size > maxCacheSize) {
      const entries = Array.from(this.patternCache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, this.patternCache.size - maxCacheSize);
      for (const [key] of toRemove) {
        this.patternCache.delete(key);
      }
    }
  }

  /**
   * Verifiziert ob ein Problem nach dem Fix wirklich behoben wurde
   */
  private async verifyProblemAfterFix(
    ticket: SupportTicket,
    candidate: { patternId: string; summary: string; actions: ResolutionAction[]; customerMessage: string; autoFixInstructions?: AutoFixInstruction[] },
    autoFixResult?: { success: boolean; message?: string; buildFailed?: boolean; lintFailed?: boolean; modifiedFiles?: string[] }
  ): Promise<{ problemExists: boolean; evidence: string[]; severity: 'low' | 'medium' | 'high' | 'critical' }> {
    try {
      // Lade ProblemVerifier
      const { ProblemVerifier } = await import('./actions/problemVerifier.js');
      
      // WICHTIG: rootDir muss auf das Frontend-Verzeichnis zeigen (REMOTE-SERVER)
      const rootDir = this.context.config.frontendRoot;
      
      const verifier = new ProblemVerifier(rootDir, this.logger, this.reverseEngineeringAnalyzer);

      // NEU: Erweiterte Post-Fix-Verifikation mit mehreren Validierungsstufen
      if (autoFixResult) {
        this.logger.info(
          { ticketId: ticket.id, patternId: candidate.patternId },
          'Verwende erweiterte Post-Fix-Verifikation mit mehreren Validierungsstufen'
        );

        const result = await verifier.verifyPostFix(
          ticket,
          candidate.patternId,
          autoFixResult,
          candidate.autoFixInstructions
        );

        return {
          problemExists: result.problemExists,
          evidence: result.evidence,
          severity: result.severity,
        };
      }

      // Fallback: Standard-Verifikation wenn kein AutoFixResult verfügbar
      this.logger.warn(
        { ticketId: ticket.id, patternId: candidate.patternId },
        'AutoFixResult nicht verfügbar - verwende Standard-Verifikation'
      );

      const result = await verifier.verifyProblem(ticket, candidate.patternId);
      
      return {
        problemExists: result.problemExists,
        evidence: result.evidence,
        severity: result.severity,
      };
    } catch (error) {
      this.logger.error(
        {
          err: error,
          ticketId: ticket.id,
          patternId: candidate.patternId,
        },
        'Fehler bei Post-Fix-Verifikation'
      );
      // Bei Fehler: Vorsichtshalber annehmen, dass Problem weiterhin besteht
      return {
        problemExists: true,
        evidence: [`Verifikationsfehler: ${error instanceof Error ? error.message : String(error)}`],
        severity: 'high',
      };
    }
  }

  /**
   * Verifiziert ob ein Problem tatsächlich vorliegt, bevor ein Fix ausgeführt wird
   */
  private async verifyProblemBeforeFix(
    ticket: SupportTicket,
    candidate: { patternId: string; summary: string; actions: ResolutionAction[]; customerMessage: string; autoFixInstructions?: AutoFixInstruction[] }
  ): Promise<{ problemExists: boolean; evidence: string[]; severity: 'low' | 'medium' | 'high' | 'critical' }> {
    try {
      // Lade ProblemVerifier
      const { ProblemVerifier } = await import('./actions/problemVerifier.js');
      
      // WICHTIG: rootDir muss auf das Frontend-Verzeichnis zeigen (REMOTE-SERVER)
      // Verwende FRONTEND_ROOT aus Config (Remote: /var/www/whatsapp-bot-builder/frontend)
      // Der ProblemVerifier prüft Frontend-Dateien (lib/pdf/parsePdf.ts, etc.)
      const rootDir = this.context.config.frontendRoot;
      
      const verifier = new ProblemVerifier(rootDir, this.logger, this.reverseEngineeringAnalyzer);

      const result = await verifier.verifyProblem(ticket, candidate.patternId);
      
      // Logge Verifikations-Ergebnis (nur intern, mit Duplikat-Prüfung)
      const verificationMessage = `🔍 Problem-Verifikation abgeschlossen:\n\n${result.evidence.join('\n')}\n\n**Ergebnis:** ${result.problemExists ? '✅ Problem bestätigt' : '❌ Problem nicht bestätigt'}\n**Schweregrad:** ${result.severity}`;
      if (!(await this.hasRecentMessage(ticket.id, 'system', verificationMessage))) {
        await this.context.supabase.from('support_ticket_messages').insert({
          ticket_id: ticket.id,
          author_type: 'system',
          author_name: 'Problem Verifier',
          message: verificationMessage,
          internal_only: true,
          metadata: {
            kind: 'problem_verification',
            patternId: candidate.patternId,
            problemExists: result.problemExists,
            evidence: result.evidence,
            severity: result.severity,
          },
          quick_reply_options: [],
        });
      }

      return result;
    } catch (error) {
      this.logger.error({ err: error, ticketId: ticket.id, patternId: candidate.patternId }, 'Fehler bei Problem-Verifikation');
      
      // Im Zweifel Problem annehmen (sicherer Ansatz)
      return {
        problemExists: true,
        evidence: [`⚠️  Verifikationsfehler: ${error}`],
        severity: 'medium',
      };
    }
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
  /**
   * Erstellt einen Autopatch-Candidate aus einer Abweichung von der Reverse Engineering Blaupause
   */
  private async createCandidateFromDeviation(
    deviation: {
      config: import('./actions/reverseEngineeringAnalyzer.js').ConfigurationItem;
      deviation: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      evidence: string[];
      relevanceScore: number;
    },
    ticket: SupportTicket,
    rootDir: string
  ): Promise<AutopatchCandidate> {
    const config = deviation.config;
    const patternId = `config-${config.type}-${config.name}`;
    
    // Erfasse System-Zustand für AutoFix-Plan
    const { readFile, access, constants } = await import('fs/promises');
    const { join } = await import('path');
    
    let systemState: {
      currentFileContents?: Record<string, string>;
      environmentVariables?: Record<string, string>;
      dependencies?: Record<string, string>;
      configurations?: Record<string, unknown>;
      reverseEngineeringRefs?: string[];
    } | undefined;

    let codeChanges: {
      diffs?: Array<{
        file: string;
        before: string;
        after: string;
        lineNumbers?: { start: number; end: number };
      }>;
      affectedFunctions?: string[];
      importChanges?: string[];
    } | undefined;

    // Erfasse aktuellen Datei-Zustand
    const fullPath = config.location.startsWith('/') ? config.location : join(rootDir, config.location);
    let currentContent: string | undefined;
    try {
      await access(fullPath, constants.F_OK);
      currentContent = await readFile(fullPath, 'utf-8');
      
      systemState = {
        currentFileContents: {
          [config.location]: currentContent,
        },
      };

      // Erfasse System-Kontext (env vars, dependencies)
      if (config.type === 'env_var' || config.name.includes('SUPABASE') || config.name.includes('STRIPE')) {
        const envPath = join(rootDir, '.env.local');
        try {
          const envContent = await readFile(envPath, 'utf-8');
          const envVars: Record<string, string> = {};
          const lines = envContent.split('\n');
          for (const line of lines) {
            if (line.trim() && !line.trim().startsWith('#')) {
              const [key, ...valueParts] = line.split('=');
              if (key && valueParts.length > 0) {
                const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
                if (key.includes(config.name) || config.name.includes(key) || 
                    key.includes('SUPABASE') || key.includes('STRIPE') || key.includes('PAYPAL')) {
                  const maskedValue = key.includes('KEY') || key.includes('SECRET') || key.includes('TOKEN')
                    ? value.substring(0, 8) + '...'
                    : value;
                  envVars[key.trim()] = maskedValue;
                }
              }
            }
          }
          systemState.environmentVariables = envVars;
        } catch {
          // .env.local nicht lesbar
        }
      }

      // Erfasse Abhängigkeiten
      if (config.name.includes('pdf') || config.name.includes('parse')) {
        const packageJsonPath = join(rootDir, 'package.json');
        try {
          const packageContent = await readFile(packageJsonPath, 'utf-8');
          const packageJson = JSON.parse(packageContent);
          if (packageJson.dependencies) {
            const deps: Record<string, string> = {};
            for (const [dep, version] of Object.entries(packageJson.dependencies)) {
              if (dep.includes('pdf') || dep.includes('parse') || dep.includes('supabase')) {
                deps[dep] = String(version);
              }
            }
            systemState.dependencies = deps;
          }
        } catch {
          // package.json nicht lesbar
        }
      }

      // Reverse Engineering Referenzen
      systemState.reverseEngineeringRefs = [
        `Konfiguration: ${config.name}`,
        `Typ: ${config.type}`,
        `Beschreibung: ${config.description}`,
        `Abweichung: ${deviation.deviation}`,
      ];

      // Extrahiere betroffene Funktionen
      const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)|(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(/g;
      const functions: string[] = [];
      let match;
      while ((match = functionRegex.exec(currentContent)) !== null) {
        const funcName = match[1] || match[2];
        if (funcName) {
          functions.push(funcName);
        }
      }

      codeChanges = {
        affectedFunctions: functions.slice(0, 10),
        importChanges: this.extractImportChanges(currentContent, config),
      };

    } catch {
      // Datei existiert nicht oder kann nicht gelesen werden
      // System-Zustand bleibt undefined
    }
    
    // NEU: Verwende universelle AutoFix-Instructions aus Reverse Engineering
    // Diese Instructions funktionieren für ALLE Probleme dieser Konfiguration, nicht nur für spezifische Ticket-Symptome
    const autoFixInstructions: import('./actions/autopatchPatterns.js').AutoFixInstruction[] = [];
    
    // Priorität 1: Verwende universelle Instructions aus Reverse Engineering
    if (config.universalFixInstructions && config.universalFixInstructions.length > 0) {
      autoFixInstructions.push(...config.universalFixInstructions);
      
      this.logger.info(
        { 
          ticketId: ticket.id, 
          configName: config.name, 
          instructionCount: config.universalFixInstructions.length,
          instructionTypes: config.universalFixInstructions.map(i => i.type),
        },
        'Verwende universelle AutoFix-Instructions aus Reverse Engineering'
      );
    } 
    // Priorität 2: Fallback - Generiere Instructions aus fixStrategies
    else if (this.reverseEngineeringAnalyzer) {
      const fallbackInstructions = this.reverseEngineeringAnalyzer.generateInstructionsFromStrategies(config);
      if (fallbackInstructions.length > 0) {
        autoFixInstructions.push(...fallbackInstructions);
        
        this.logger.info(
          { 
            ticketId: ticket.id, 
            configName: config.name, 
            instructionCount: fallbackInstructions.length,
            source: 'fixStrategies',
          },
          'Generiere AutoFix-Instructions aus fixStrategies (Fallback)'
        );
      }
    }
    
    const action: ResolutionAction = {
      type: 'autopatch_plan',
      description: `Korrigiere Abweichung: ${deviation.deviation}`,
      payload: {
        fixName: `fix-${config.type}-${config.name}`,
        goal: `Abweichung von dokumentiertem Zustand beheben: ${deviation.deviation}`,
        targetFiles: [config.location],
        steps: [
          `Problem: ${deviation.deviation}`,
          `Dokumentierter Zustand: ${config.description}`,
          ...deviation.evidence.map(e => `- ${e}`),
          ...config.fixStrategies.map((strategy) => `- ${strategy}`),
        ],
        validation: [
          `${config.name} entspricht dokumentiertem Zustand`,
          ...deviation.evidence.filter(e => e.startsWith('✅')).map(e => e.replace('✅ ', '')),
        ],
        rollout: ['`npm run build`', '`pm2 restart whatsapp-bot-builder --update-env`'],
        // NEU: System-Zustand und Code-Änderungen für universelle Problem-Lösung
        systemState,
        codeChanges,
        context: {
          affectedComponents: config.type === 'frontend_config' ? [config.name] : undefined,
          apiEndpoints: config.type === 'api_endpoint' ? [config.name] : undefined,
        },
        errorHandling: {
          possibleErrors: config.potentialIssues,
          rollbackStrategy: `Wiederherstellung von Backup oder Git-Revert`,
          validationSteps: [`${config.name} funktioniert korrekt`, 'Tests durchführen'],
          monitoring: ['Logs prüfen', 'Fehlerrate überwachen'],
        },
      },
    };

    return {
      patternId,
      summary: `Autopatch: Abweichung von Reverse Engineering Blaupause - ${deviation.deviation}`,
      actions: [action],
      customerMessage: `Ich habe das Problem erkannt und behebe es jetzt automatisch.`,
      // NEU: AutoFix-Instructions (wenn verfügbar)
      autoFixInstructions: autoFixInstructions.length > 0 ? autoFixInstructions : undefined,
    };
  }

  /**
   * Extrahiert Import-Änderungen aus Code
   */
  private extractImportChanges(content: string, config: import('./actions/reverseEngineeringAnalyzer.js').ConfigurationItem): string[] {
    const changes: string[] = [];
    
    // Prüfe auf fehlende Imports basierend auf Konfiguration
    if (config.name.includes('pdf') && !content.includes('pdf-parse')) {
      changes.push('Fehlender Import: pdf-parse');
    }
    if (config.name.includes('supabase') && !content.includes('@supabase')) {
      changes.push('Fehlender Import: @supabase');
    }

    return changes;
  }

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

export function extractQuickReplyOptions(actions: ResolutionAction[]): unknown[] | null {
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

export function hasAction(actions: ResolutionAction[], match: ResolutionAction['type']) {
  return actions.some((action) => action.type === match);
}

