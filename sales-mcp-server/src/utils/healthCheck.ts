/**
 * Health-Check-Endpoint für System-Monitoring
 * Prüft Datenbank, Realtime, AutoFix-Funktionalität
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Logger } from './logger.js';
import { metricsCollector } from './metricsCollector.js';
import type { SupportTicketRouter } from '../services/ticketRouter.js';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: {
      status: 'ok' | 'error';
      latency?: number;
      error?: string;
    };
    realtime: {
      status: 'ok' | 'error';
      error?: string;
    };
    autopatch: {
      status: 'ok' | 'error';
      error?: string;
    };
  };
  metrics: {
    uptime: number;
    ticketsProcessed: number;
    autopatchSuccessRate: number;
    errorRate: number;
    averageInsertLatency: number;
  };
}

export class HealthChecker {
  private startTime: Date;

  constructor(
    private readonly supabase: SupabaseClient,
    private readonly logger: Logger,
    private readonly router?: SupportTicketRouter
  ) {
    this.startTime = new Date();
  }

  /**
   * Führt Health-Check durch
   */
  async checkHealth(): Promise<HealthCheckResult> {
    const checks = {
      database: await this.checkDatabase(),
      realtime: await this.checkRealtime(),
      autopatch: await this.checkAutopatch(),
    };

    const metrics = metricsCollector.getMetrics();
    const uptime = Date.now() - this.startTime.getTime();

    // Bestimme Gesamt-Status
    const hasError = Object.values(checks).some((check) => check.status === 'error');
    const hasDegraded = Object.values(checks).some((check) => check.status === 'error') && 
                        Object.values(checks).some((check) => check.status === 'ok');
    
    const status: 'healthy' | 'degraded' | 'unhealthy' = 
      hasError && !hasDegraded ? 'unhealthy' :
      hasDegraded ? 'degraded' :
      'healthy';

    return {
      status,
      timestamp: new Date().toISOString(),
      checks,
      metrics: {
        uptime,
        ticketsProcessed: metrics.ticketsProcessed,
        autopatchSuccessRate: metrics.autopatchSuccessRate,
        errorRate: metrics.errorRate,
        averageInsertLatency: metrics.averageInsertLatency,
      },
    };
  }

  /**
   * Prüft Datenbank-Verbindung
   */
  private async checkDatabase(): Promise<{ status: 'ok' | 'error'; latency?: number; error?: string }> {
    const startTime = Date.now();
    try {
      const { error } = await this.supabase
        .from('support_tickets')
        .select('id')
        .limit(1);
      
      const latency = Date.now() - startTime;
      
      if (error) {
        return {
          status: 'error',
          latency,
          error: error.message,
        };
      }
      
      return {
        status: 'ok',
        latency,
      };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Prüft Realtime-Verbindung
   */
  private async checkRealtime(): Promise<{ status: 'ok' | 'error'; error?: string }> {
    if (!this.router) {
      return {
        status: 'error',
        error: 'Router-Kontext nicht verfügbar',
      };
    }

    const meta = this.router.getHeartbeatMeta();
    const ticketsOk = meta.ticketChannelStatus === 'SUBSCRIBED';
    const messagesOk = meta.messageChannelStatus === 'SUBSCRIBED';

    if (ticketsOk && messagesOk) {
      return { status: 'ok' };
    }

    const errorMessage = `tickets=${meta.ticketChannelStatus ?? 'unknown'}, messages=${meta.messageChannelStatus ?? 'unknown'}, reconnects=${meta.realtimeReconnects}`;
    return {
      status: 'error',
      error: errorMessage,
    };
  }

  /**
   * Prüft AutoFix-Funktionalität
   */
  private async checkAutopatch(): Promise<{ status: 'ok' | 'error'; error?: string }> {
    try {
      // Prüfe ob messages-Verzeichnis existiert
      const fs = await import('node:fs/promises');
      const path = await import('node:path');
      
      // Repository-Root ermitteln (von support-mcp-server aus)
      const repositoryRoot = path.resolve(process.cwd(), '..');
      const messagesDir = path.join(repositoryRoot, 'messages');
      
      try {
        await fs.access(messagesDir);
        return {
          status: 'ok',
        };
      } catch {
        return {
          status: 'error',
          error: `messages-Verzeichnis nicht gefunden: ${messagesDir}`,
        };
      }
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

/**
 * Exportierte Funktion für Health-Check
 */
export async function getHealthStatus(
  supabase: SupabaseClient,
  router: SupportTicketRouter
): Promise<HealthCheckResult> {
  // Erstelle temporären Logger für HealthChecker
  const { createLogger } = await import('./logger.js');
  const logger = createLogger();
  const checker = new HealthChecker(supabase, logger, router);
  return await checker.checkHealth();
}

