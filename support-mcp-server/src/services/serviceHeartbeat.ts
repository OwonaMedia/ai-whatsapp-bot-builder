import type { Logger } from '../utils/logger.js';
import type { SupportSupabaseClient } from './supabaseClient.js';

export type ServiceHealthStatus = 'up' | 'degraded' | 'down';

type MetaProvider = () => Promise<Record<string, unknown>> | Record<string, unknown>;

export class ServiceHeartbeat {
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly supabase: SupportSupabaseClient,
    private readonly logger: Logger,
    private readonly serviceName: string,
    private readonly intervalMs: number,
    private readonly metaProvider?: MetaProvider
  ) {}

  start(initialStatus: ServiceHealthStatus = 'up') {
    this.logger.info(
      { service: this.serviceName, intervalMs: this.intervalMs },
      'Starte Service-Heartbeat'
    );
    void this.beat(initialStatus);
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.timer = setInterval(() => {
      void this.beat('up');
    }, this.intervalMs);
  }

  async stop(finalStatus: ServiceHealthStatus = 'down') {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.beat(finalStatus);
    this.logger.info({ service: this.serviceName }, 'Service-Heartbeat gestoppt');
  }

  private async beat(status: ServiceHealthStatus) {
    try {
      const baseMeta: Record<string, unknown> = {
        intervalMs: this.intervalMs,
      };

      let extraMeta: Record<string, unknown> = {};
      if (this.metaProvider) {
        const resolved = await this.metaProvider();
        if (resolved && typeof resolved === 'object') {
          extraMeta = resolved;
        }
      }

      const meta = {
        ...baseMeta,
        ...extraMeta,
      };

      const { error } = await this.supabase.from('support_service_status').upsert({
        service_name: this.serviceName,
        status,
        last_heartbeat: new Date().toISOString(),
        meta,
      });

      if (error) {
        this.logger.warn(
          { err: error, service: this.serviceName },
          'Heartbeat konnte nicht gespeichert werden'
        );
      }
    } catch (error) {
      this.logger.error(
        { err: error, service: this.serviceName },
        'Heartbeat-Ausführung fehlgeschlagen'
      );
    }
  }
}

