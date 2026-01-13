import 'dotenv/config';
import { createSupportContext } from '../services/supportContext.js';
import { createLogger, type Logger } from '../utils/logger.js';
import { SupportTicketRouter } from '../services/ticketRouter.js';
import { ServiceHeartbeat } from '../services/serviceHeartbeat.js';
import type { SupportContext } from '../services/supportContext.js';
import type { PostgrestResponse } from '@supabase/supabase-js';
import { retryWithBackoff, withTimeout } from '../utils/retry.js';
import { EventDeduplicator } from '../utils/eventDeduplicator.js';

type TicketStatus = 'new' | 'investigating';

type TicketRow = {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: string;
  category: string | null;
  source_metadata: Record<string, unknown> | null;
  assigned_agent?: string | null;
  escalation_path?: Array<Record<string, unknown>> | null;
  updated_at: string;
};

type MonitorConfig = {
  intervalMs: number;
  staleMinutes: number;
  reminderMinutes: number;
};

class TicketMonitor {
  private readonly router: SupportTicketRouter;
  private readonly monitorConfig: MonitorConfig;
  private timer: NodeJS.Timeout | null = null;
  private readonly heartbeat: ServiceHeartbeat;
  private readonly processingTickets = new Set<string>();
  private lastCycleAt: Date | null = null;
  private lastRealtimeAt: Date | null = null;
  private lastDispatchAt: Date | null = null;
  private readonly eventDeduplicator: EventDeduplicator;

  constructor(private readonly context: SupportContext, private readonly logger: Logger) {
    this.router = new SupportTicketRouter(context, logger.child({ component: 'TicketRouter' }));
    this.monitorConfig = context.config.monitor;
    const heartbeatInterval = Math.max(this.monitorConfig.intervalMs, 30_000);
    this.heartbeat = new ServiceHeartbeat(
      context.supabase,
      logger.child({ component: 'TicketMonitorHeartbeat' }),
      'support-ticket-monitor',
      heartbeatInterval,
      () => this.getHeartbeatMeta()
    );
    // Event-Deduplizierung für Realtime-Events
    this.eventDeduplicator = new EventDeduplicator(60000); // 1 Minute TTL
  }

  async start() {
    this.logger.info(
      {
        intervalMs: this.monitorConfig.intervalMs,
        staleMinutes: this.monitorConfig.staleMinutes,
        reminderMinutes: this.monitorConfig.reminderMinutes,
      },
      'Ticket-Monitor gestartet'
    );

    this.heartbeat.start('up');
    await this.runCycle('initial');
    this.schedule();
    await this.bindRealtime();
  }

  async stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.eventDeduplicator.destroy();
    await this.heartbeat.stop('down');
  }

  private schedule() {
    if (this.timer) {
      clearInterval(this.timer);
    }

    this.timer = setInterval(() => {
      this.runCycle('interval').catch((error) => {
        this.logger.error({ err: error }, 'Ticket-Monitor Fehler im Intervall');
      });
    }, this.monitorConfig.intervalMs);
  }

  private async bindRealtime() {
    // REALTIME DEAKTIVIERT - Kostenreduzierung ($20/24h Problem)
    // Statt Realtime verwenden wir Polling (bereits implementiert in schedule())
    // Polling läuft alle 30 Sekunden und verursacht KEINE Realtime Messages
    this.logger.info('Realtime-Subscription deaktiviert - verwende Polling statt Realtime');
    // DEAKTIVIERT - Code bleibt für spätere Referenz:
    /*
    this.context.supabase
      .channel('support-ticket-monitor')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets' },
        async (payload) => {
          // ... Realtime Event Handler Code ...
        }
      )
      .subscribe((status) => {
        this.logger.info({ status }, 'Ticket-Monitor Realtime Status');
      });
    */
  }

  private async runCycle(reason: 'initial' | 'interval') {
    this.lastCycleAt = new Date();
    const thresholdIso = this.thresholdIso(this.monitorConfig.staleMinutes);

    const response: PostgrestResponse<TicketRow> = await this.context.supabase
      .from('support_tickets')
      .select(
        'id, title, description, status, priority, category, source_metadata, assigned_agent, escalation_path, updated_at'
      )
      .in('status', ['new', 'investigating'])
      .lte('updated_at', thresholdIso)
      .order('updated_at', { ascending: true })
      .limit(20);

    if (response.error) {
      this.logger.error({ err: response.error }, 'Ticket-Monitor konnte Tickets nicht laden');
      return;
    }

    for (const ticket of response.data ?? []) {
      await this.maybeHandleTicket(ticket, reason);
    }
  }

  private thresholdIso(minutes: number) {
    return new Date(Date.now() - minutes * 60_000).toISOString();
  }

  private async maybeHandleTicket(ticket: TicketRow, reason: string) {
    if (this.processingTickets.has(ticket.id)) {
      return;
    }

    const isStale = new Date(ticket.updated_at).getTime() <= Date.now() - this.monitorConfig.staleMinutes * 60_000;
    if (!isStale) {
      return;
    }

    const remindThreshold = this.thresholdIso(this.monitorConfig.reminderMinutes);
    const recentEvent = await this.context.supabase
      .from('support_automation_events')
      .select('created_at')
      .eq('ticket_id', ticket.id)
      .eq('action_type', 'monitor_nudge')
      .gte('created_at', remindThreshold)
      .maybeSingle();

    if (recentEvent.error) {
      this.logger.warn({ err: recentEvent.error, ticketId: ticket.id }, 'Ticket-Monitor konnte Events nicht prüfen');
    }

    if (recentEvent.data) {
      return;
    }

    this.processingTickets.add(ticket.id);
    try {
      this.logger.info({ ticketId: ticket.id, reason }, 'Ticket-Monitor stößt Tier-2 an');
      await this.router.dispatch({ eventType: 'UPDATE', ticket });
      this.lastDispatchAt = new Date();
      await this.context.supabase.from('support_automation_events').insert({
        ticket_id: ticket.id,
        action_type: 'monitor_nudge',
        payload: {
          reason,
          triggered_at: new Date().toISOString(),
          stale_minutes: this.monitorConfig.staleMinutes,
        },
      });
    } catch (error) {
      this.logger.error({ err: error, ticketId: ticket.id }, 'Ticket-Monitor konnte Ticket nicht eskalieren');
    } finally {
      this.processingTickets.delete(ticket.id);
    }
  }

  private getHeartbeatMeta() {
    return {
      processingTickets: this.processingTickets.size,
      lastCycleAt: this.lastCycleAt ? this.lastCycleAt.toISOString() : null,
      lastRealtimeAt: this.lastRealtimeAt ? this.lastRealtimeAt.toISOString() : null,
      lastDispatchAt: this.lastDispatchAt ? this.lastDispatchAt.toISOString() : null,
      monitorIntervalMs: this.monitorConfig.intervalMs,
    };
  }
}

async function bootstrap() {
  const rootLogger = createLogger();
  const monitorLogger = rootLogger.child({ component: 'TicketMonitor' });

  try {
    const context = await createSupportContext(monitorLogger);
    const monitor = new TicketMonitor(context, monitorLogger);

    let shuttingDown = false;
    const shutdown = async (signal: NodeJS.Signals | 'manual' = 'manual') => {
      if (shuttingDown) return;
      shuttingDown = true;
      monitorLogger.info({ signal }, 'Ticket-Monitor fährt herunter');
      await monitor.stop().catch((error) => {
        monitorLogger.warn({ err: error }, 'Monitor konnte nicht sauber stoppen');
      });
      process.exit(0);
    };

    process.on('SIGTERM', (signal) => {
      void shutdown(signal);
    });
    process.on('SIGINT', (signal) => {
      void shutdown(signal);
    });

    await monitor.start();
  } catch (error) {
    monitorLogger.error({ err: error }, 'Ticket-Monitor konnte nicht gestartet werden');
    process.exit(1);
  }
}

bootstrap();
