import type { SupportSupabaseClient } from '../supabaseClient.js';
import type { Logger } from '../../utils/logger.js';

export interface ExternalChange {
  id: string;
  provider: string;
  changeType: 'api_update' | 'breaking_change' | 'deprecation' | 'version_update' | 'webhook_change';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  detectedAt: string;
  updatedAt?: string;
  status: 'detected' | 'in_progress' | 'updated' | 'failed';
  autoUpdated: boolean;
  affectedServices?: string[];
  metadata?: Record<string, unknown>;
}

export interface ChangeDetectionResult {
  changes: ExternalChange[];
  provider: string;
  lastChecked: string;
}

/**
 * Base class for external API monitoring
 */
export abstract class ExternalAPIMonitor {
  protected supabase: SupportSupabaseClient;
  protected logger: Logger;
  protected provider: string;

  constructor(supabase: SupportSupabaseClient, logger: Logger, provider: string) {
    this.supabase = supabase;
    this.logger = logger;
    this.provider = provider;
  }

  /**
   * Get the provider name
   */
  getProvider(): string {
    return this.provider;
  }

  /**
   * Check for changes in the external API
   */
  abstract checkForChanges(): Promise<ChangeDetectionResult>;

  /**
   * Save detected changes to database
   */
  async saveChanges(changes: ExternalChange[]): Promise<void> {
    if (changes.length === 0) {
      return;
    }

    try {
      const { error } = await this.supabase
        .from('external_api_changes')
        .insert(
          changes.map((change) => ({
            provider: change.provider,
            change_type: change.changeType,
            title: change.title,
            description: change.description,
            impact: change.impact,
            detected_at: change.detectedAt,
            status: change.status,
            auto_updated: change.autoUpdated,
            affected_services: change.affectedServices || [],
            metadata: change.metadata || {},
          }))
        );

      if (error) {
        this.logger.error(
          { err: error, provider: this.provider, changesCount: changes.length },
          'Failed to save external API changes'
        );
        throw error;
      }

      this.logger.info(
        { provider: this.provider, changesCount: changes.length },
        'Saved external API changes to database'
      );
    } catch (error) {
      this.logger.error(
        { err: error, provider: this.provider },
        'Error saving external API changes'
      );
      throw error;
    }
  }

  /**
   * Check if a similar change already exists
   */
  async changeExists(title: string, detectedAfter: Date): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('external_api_changes')
        .select('id')
        .eq('provider', this.provider)
        .eq('title', title)
        .gte('detected_at', detectedAfter.toISOString())
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        this.logger.warn({ err: error }, 'Error checking for existing change');
        return false;
      }

      return data !== null;
    } catch (error) {
      this.logger.warn({ err: error }, 'Error checking for existing change');
      return false;
    }
  }
}

