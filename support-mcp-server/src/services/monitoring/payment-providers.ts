import { ExternalAPIMonitor, type ChangeDetectionResult, type ExternalChange } from './external-apis.js';
import type { SupportSupabaseClient } from '../supabaseClient.js';
import type { Logger } from '../../utils/logger.js';
import { randomUUID } from 'crypto';

/**
 * Monitor for Stripe API changes
 */
export class StripeMonitor extends ExternalAPIMonitor {
  constructor(supabase: SupportSupabaseClient, logger: Logger) {
    super(supabase, logger, 'Stripe');
  }

  async checkForChanges(): Promise<ChangeDetectionResult> {
    const changes: ExternalChange[] = [];
    const now = new Date();

    try {
      // Check Stripe API changelog
      await this.checkAPIChangelog(changes, now);

      // Check for webhook signature changes
      await this.checkWebhookChanges(changes, now);

      if (changes.length > 0) {
        await this.saveChanges(changes);
      }

      return {
        changes,
        provider: this.provider,
        lastChecked: now.toISOString(),
      };
    } catch (error) {
      this.logger.error({ err: error, provider: this.provider }, 'Error checking Stripe API changes');
      return {
        changes: [],
        provider: this.provider,
        lastChecked: now.toISOString(),
      };
    }
  }

  private async checkAPIChangelog(changes: ExternalChange[], now: Date): Promise<void> {
    try {
      // Check Stripe's API changelog
      const changelogUrl = 'https://stripe.com/docs/upgrades';
      
      const response = await fetch(changelogUrl, {
        headers: {
          'User-Agent': 'OWONA-Monitoring/1.0',
        },
      });

      if (!response.ok) {
        return;
      }

      const html = await response.text();
      
      // Look for recent changelog entries (last 30 days)
      const datePattern = /(\d{1,2}\/\d{1,2}\/\d{4})/g;
      const dates = html.match(datePattern);
      
      if (dates && dates.length > 0) {
        // Check if there are recent entries
        const recentDates = dates.filter(dateStr => {
          try {
            const [month, day, year] = dateStr.split('/').map(Number);
            const entryDate = new Date(year, month - 1, day);
            const daysAgo = (now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24);
            return daysAgo <= 30;
          } catch {
            return false;
          }
        });

        if (recentDates.length > 0) {
          // Look for breaking changes or important updates
          const breakingChangeKeywords = ['breaking', 'deprecated', 'removed', 'changed'];
          const hasBreakingChanges = breakingChangeKeywords.some(keyword =>
            html.toLowerCase().includes(keyword.toLowerCase())
          );

          if (hasBreakingChanges) {
            const exists = await this.changeExists(
              'Stripe API Changelog Update',
              new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            );

            if (!exists) {
              changes.push({
                id: randomUUID(),
                provider: this.provider,
                changeType: hasBreakingChanges ? 'breaking_change' : 'api_update',
                title: 'Stripe API Changelog Update',
                description: `Recent changes detected in Stripe API changelog. ${recentDates.length} recent entries found. Please review for breaking changes.`,
                impact: hasBreakingChanges ? 'high' : 'medium',
                detectedAt: now.toISOString(),
                status: 'detected',
                autoUpdated: false,
                affectedServices: ['payments', 'stripe-integration'],
                metadata: {
                  recentEntries: recentDates.length,
                  changelogUrl,
                },
              });
            }
          }
        }
      }

      // Check Stripe API version
      const apiVersionMatch = html.match(/API\s+Version[:\s]+(\d{4}-\d{2}-\d{2})/i);
      if (apiVersionMatch) {
        const latestVersion = apiVersionMatch[1];
        // Compare with stored version (would need to store baseline)
        this.logger.debug({ latestVersion }, 'Detected Stripe API version');
      }
    } catch (error) {
      this.logger.warn({ err: error }, 'Error checking Stripe changelog');
    }
  }

  private async checkWebhookChanges(changes: ExternalChange[], now: Date): Promise<void> {
    try {
      // Check Stripe webhook documentation
      const webhookDocsUrl = 'https://stripe.com/docs/webhooks/signatures';
      
      const response = await fetch(webhookDocsUrl, {
        headers: {
          'User-Agent': 'OWONA-Monitoring/1.0',
        },
      });

      if (!response.ok) {
        return;
      }

      const html = await response.text();
      
      // Check for signature algorithm mentions
      const signatureAlgorithms = ['sha256', 'v1'];
      const foundAlgorithms = signatureAlgorithms.filter(alg =>
        html.toLowerCase().includes(alg.toLowerCase())
      );

      // Check if signature verification method changed
      if (foundAlgorithms.length > 0) {
        const timestampPattern = /timestamp[_\s]+tolerance/i;
        const hasTimestampTolerance = timestampPattern.test(html);

        // If we detect changes in signature verification, log it
        const exists = await this.changeExists(
          'Stripe Webhook Signature Update',
          new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        );

        if (!exists && (foundAlgorithms.length > 1 || !hasTimestampTolerance)) {
          changes.push({
            id: randomUUID(),
            provider: this.provider,
            changeType: 'webhook_change',
            title: 'Stripe Webhook Signature Update',
            description: `Changes detected in Stripe webhook signature verification. Algorithms: ${foundAlgorithms.join(', ')}. Please verify your webhook signature verification is up to date.`,
            impact: 'medium',
            detectedAt: now.toISOString(),
            status: 'detected',
            autoUpdated: false,
            affectedServices: ['payments', 'stripe-webhooks'],
            metadata: {
              algorithms: foundAlgorithms,
              docsUrl: webhookDocsUrl,
            },
          });
        }
      }
    } catch (error) {
      this.logger.warn({ err: error }, 'Error checking Stripe webhook changes');
    }
  }
}

/**
 * Monitor for PayPal API changes
 */
export class PayPalMonitor extends ExternalAPIMonitor {
  constructor(supabase: SupportSupabaseClient, logger: Logger) {
    super(supabase, logger, 'PayPal');
  }

  async checkForChanges(): Promise<ChangeDetectionResult> {
    const changes: ExternalChange[] = [];
    const now = new Date();

    try {
      // Check PayPal API changelog
      await this.checkAPIChangelog(changes, now);

      if (changes.length > 0) {
        await this.saveChanges(changes);
      }

      return {
        changes,
        provider: this.provider,
        lastChecked: now.toISOString(),
      };
    } catch (error) {
      this.logger.error({ err: error, provider: this.provider }, 'Error checking PayPal API changes');
      return {
        changes: [],
        provider: this.provider,
        lastChecked: now.toISOString(),
      };
    }
  }

  private async checkAPIChangelog(changes: ExternalChange[], now: Date): Promise<void> {
    try {
      // Check PayPal's API changelog
      const changelogUrl = 'https://developer.paypal.com/api/rest/release-notes/';
      
      const response = await fetch(changelogUrl, {
        headers: {
          'User-Agent': 'OWONA-Monitoring/1.0',
        },
      });

      if (!response.ok) {
        return;
      }

      const html = await response.text();
      
      // Look for recent release notes
      const datePattern = /(\d{4}-\d{2}-\d{2})/g;
      const dates = html.match(datePattern);
      
      if (dates && dates.length > 0) {
        const recentDates = dates.filter(dateStr => {
          try {
            const entryDate = new Date(dateStr);
            const daysAgo = (now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24);
            return daysAgo <= 30;
          } catch {
            return false;
          }
        });

        if (recentDates.length > 0) {
          // Look for breaking changes
          const breakingChangeKeywords = ['breaking', 'deprecated', 'removed', 'changed'];
          const hasBreakingChanges = breakingChangeKeywords.some(keyword =>
            html.toLowerCase().includes(keyword.toLowerCase())
          );

          const exists = await this.changeExists(
            'PayPal API Changelog Update',
            new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          );

          if (!exists) {
            changes.push({
              id: randomUUID(),
              provider: this.provider,
              changeType: hasBreakingChanges ? 'breaking_change' : 'api_update',
              title: 'PayPal API Changelog Update',
              description: `Recent changes detected in PayPal API changelog. ${recentDates.length} recent entries found. Please review for breaking changes.`,
              impact: hasBreakingChanges ? 'high' : 'medium',
              detectedAt: now.toISOString(),
              status: 'detected',
              autoUpdated: false,
              affectedServices: ['payments', 'paypal-integration'],
              metadata: {
                recentEntries: recentDates.length,
                changelogUrl,
              },
            });
          }
        }
      }
    } catch (error) {
      this.logger.warn({ err: error }, 'Error checking PayPal changelog');
    }
  }
}

/**
 * Monitor for Mollie API changes
 */
export class MollieMonitor extends ExternalAPIMonitor {
  constructor(supabase: SupportSupabaseClient, logger: Logger) {
    super(supabase, logger, 'Mollie');
  }

  async checkForChanges(): Promise<ChangeDetectionResult> {
    const changes: ExternalChange[] = [];
    const now = new Date();

    try {
      // Check Mollie API changelog
      await this.checkAPIChangelog(changes, now);

      if (changes.length > 0) {
        await this.saveChanges(changes);
      }

      return {
        changes,
        provider: this.provider,
        lastChecked: now.toISOString(),
      };
    } catch (error) {
      this.logger.error({ err: error, provider: this.provider }, 'Error checking Mollie API changes');
      return {
        changes: [],
        provider: this.provider,
        lastChecked: now.toISOString(),
      };
    }
  }

  private async checkAPIChangelog(changes: ExternalChange[], now: Date): Promise<void> {
    try {
      // Check Mollie's API changelog
      const changelogUrl = 'https://docs.mollie.com/changelog';
      
      const response = await fetch(changelogUrl, {
        headers: {
          'User-Agent': 'OWONA-Monitoring/1.0',
        },
      });

      if (!response.ok) {
        return;
      }

      const html = await response.text();
      
      // Look for recent changelog entries
      const datePattern = /(\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})/gi;
      const dates = html.match(datePattern);
      
      if (dates && dates.length > 0) {
        // Parse dates and check for recent entries
        const recentDates = dates.filter(dateStr => {
          try {
            const entryDate = new Date(dateStr);
            const daysAgo = (now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24);
            return daysAgo <= 30;
          } catch {
            return false;
          }
        });

        if (recentDates.length > 0) {
          // Look for breaking changes
          const breakingChangeKeywords = ['breaking', 'deprecated', 'removed', 'changed'];
          const hasBreakingChanges = breakingChangeKeywords.some(keyword =>
            html.toLowerCase().includes(keyword.toLowerCase())
          );

          const exists = await this.changeExists(
            'Mollie API Changelog Update',
            new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          );

          if (!exists) {
            changes.push({
              id: randomUUID(),
              provider: this.provider,
              changeType: hasBreakingChanges ? 'breaking_change' : 'api_update',
              title: 'Mollie API Changelog Update',
              description: `Recent changes detected in Mollie API changelog. ${recentDates.length} recent entries found. Please review for breaking changes.`,
              impact: hasBreakingChanges ? 'high' : 'medium',
              detectedAt: now.toISOString(),
              status: 'detected',
              autoUpdated: false,
              affectedServices: ['payments', 'mollie-integration'],
              metadata: {
                recentEntries: recentDates.length,
                changelogUrl,
              },
            });
          }
        }
      }
    } catch (error) {
      this.logger.warn({ err: error }, 'Error checking Mollie changelog');
    }
  }
}

