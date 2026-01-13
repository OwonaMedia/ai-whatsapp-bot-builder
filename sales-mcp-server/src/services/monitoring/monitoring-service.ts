import type { SupportSupabaseClient } from '../supabaseClient.js';
import type { Logger } from '../../utils/logger.js';
import { MetaWhatsAppMonitor } from './meta-whatsapp.js';
import { StripeMonitor, PayPalMonitor, MollieMonitor } from './payment-providers.js';
import { HetznerMonitor, N8nMonitor, SupabaseMonitor } from './server-infrastructure.js';
import type { ExternalAPIMonitor } from './external-apis.js';

/**
 * Main monitoring service that coordinates all external API monitors
 */
export class MonitoringService {
  private monitors: ExternalAPIMonitor[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    private supabase: SupportSupabaseClient,
    private logger: Logger,
    private checkIntervalMs: number = 24 * 60 * 60 * 1000 // Default: 24 hours
  ) {
    // Initialize all monitors
    this.monitors = [
      new MetaWhatsAppMonitor(supabase, logger),
      new StripeMonitor(supabase, logger),
      new PayPalMonitor(supabase, logger),
      new MollieMonitor(supabase, logger),
      new HetznerMonitor(supabase, logger),
      new N8nMonitor(supabase, logger),
      new SupabaseMonitor(supabase, logger),
    ];
  }

  /**
   * Start monitoring service
   */
  start(): void {
    if (this.isRunning) {
      this.logger.warn('Monitoring service is already running');
      return;
    }

    this.logger.info(
      { intervalMs: this.checkIntervalMs, monitorsCount: this.monitors.length },
      'Starting external API monitoring service'
    );

    // Run initial check
    this.runChecks().catch((error) => {
      this.logger.error({ err: error }, 'Error in initial monitoring check');
    });

    // Schedule periodic checks
    this.intervalId = setInterval(() => {
      this.runChecks().catch((error) => {
        this.logger.error({ err: error }, 'Error in periodic monitoring check');
      });
    }, this.checkIntervalMs);

    this.isRunning = true;
  }

  /**
   * Stop monitoring service
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    this.logger.info('Stopped external API monitoring service');
  }

  /**
   * Run checks for all monitors
   */
  async runChecks(): Promise<void> {
    this.logger.info({ monitorsCount: this.monitors.length }, 'Running external API checks');

    const results = await Promise.allSettled(
      this.monitors.map((monitor) => monitor.checkForChanges())
    );

    let successCount = 0;
    let failureCount = 0;
    let totalChanges = 0;

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successCount++;
        totalChanges += result.value.changes.length;
        this.logger.info(
          {
            provider: result.value.provider,
            changesCount: result.value.changes.length,
            lastChecked: result.value.lastChecked,
          },
          'Monitoring check completed'
        );

        // Trigger auto-update for detected changes
        if (result.value.changes.length > 0) {
          this.processChangesForAutoUpdate(result.value.changes).catch((error) => {
            this.logger.error(
              { err: error, provider: result.value.provider },
              'Error processing changes for auto-update'
            );
          });
        }
      } else {
        failureCount++;
        this.logger.error(
          { err: result.reason, provider: this.monitors[index].getProvider() },
          'Monitoring check failed'
        );
      }
    });

    this.logger.info(
      {
        successCount,
        failureCount,
        totalChanges,
        monitorsCount: this.monitors.length,
      },
      'External API monitoring check completed'
    );
  }

  /**
   * Process changes for automatic updates
   */
  private async processChangesForAutoUpdate(changes: Array<{ id: string; provider: string; changeType: string; impact: string }>): Promise<void> {
    // Only process low/medium impact changes automatically
    // High/critical changes require manual review
    const autoUpdateableChanges = changes.filter(
      (change) => change.impact === 'low' || change.impact === 'medium'
    );

    if (autoUpdateableChanges.length === 0) {
      return;
    }

    // Import UpdateHandler dynamically to avoid circular dependencies
    const { UpdateHandler } = await import('../auto-updates/update-handler.js');
    const updateHandler = new UpdateHandler(this.supabase, this.logger);

    for (const change of autoUpdateableChanges) {
      try {
        // Fetch full change details from database
        const { data: fullChange, error } = await this.supabase
          .from('external_api_changes')
          .select('*')
          .eq('id', change.id)
          .single();

        if (error || !fullChange) {
          this.logger.warn({ err: error, changeId: change.id }, 'Could not fetch change details for auto-update');
          continue;
        }

        // Process change for auto-update
        await updateHandler.processChange({
          id: fullChange.id,
          provider: fullChange.provider,
          changeType: fullChange.change_type,
          title: fullChange.title,
          description: fullChange.description,
          impact: fullChange.impact,
          detectedAt: fullChange.detected_at,
          updatedAt: fullChange.updated_at,
          status: fullChange.status,
          autoUpdated: fullChange.auto_updated,
          affectedServices: fullChange.affected_services,
          metadata: fullChange.metadata || {},
        });
      } catch (error) {
        this.logger.error(
          { err: error, changeId: change.id, provider: change.provider },
          'Error processing change for auto-update'
        );
      }
    }
  }

  /**
   * Manually trigger a check for a specific provider
   */
  async checkProvider(provider: string): Promise<void> {
    const monitor = this.monitors.find((m) => m.getProvider() === provider);
    if (!monitor) {
      throw new Error(`Monitor not found for provider: ${provider}`);
    }

    this.logger.info({ provider }, 'Manually triggering monitoring check');
    await monitor.checkForChanges();
  }

  /**
   * Get status of all monitors
   */
  getStatus(): {
    isRunning: boolean;
    checkIntervalMs: number;
    monitors: Array<{ provider: string }>;
  } {
    return {
      isRunning: this.isRunning,
      checkIntervalMs: this.checkIntervalMs,
      monitors: this.monitors.map((m) => ({ provider: m.getProvider() })),
    };
  }
}

