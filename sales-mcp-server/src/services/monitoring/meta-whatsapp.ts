import { ExternalAPIMonitor, type ChangeDetectionResult, type ExternalChange } from './external-apis.js';
import type { SupportSupabaseClient } from '../supabaseClient.js';
import type { Logger } from '../../utils/logger.js';
import { randomUUID } from 'crypto';

/**
 * Monitor for Meta/WhatsApp API changes
 */
export class MetaWhatsAppMonitor extends ExternalAPIMonitor {
  private readonly apiVersion = 'v18.0';
  private readonly baseUrl = 'https://graph.facebook.com';

  constructor(supabase: SupportSupabaseClient, logger: Logger) {
    super(supabase, logger, 'Meta/WhatsApp');
  }

  async checkForChanges(): Promise<ChangeDetectionResult> {
    const changes: ExternalChange[] = [];
    const now = new Date();

    try {
      // Check for API version changes
      await this.checkAPIVersion(changes, now);

      // Check for webhook signature changes
      await this.checkWebhookChanges(changes, now);

      // Check for rate limit changes
      await this.checkRateLimitChanges(changes, now);

      // Check for deprecations
      await this.checkDeprecations(changes, now);

      // Save changes to database
      if (changes.length > 0) {
        await this.saveChanges(changes);
      }

      return {
        changes,
        provider: this.provider,
        lastChecked: now.toISOString(),
      };
    } catch (error) {
      this.logger.error({ err: error, provider: this.provider }, 'Error checking Meta/WhatsApp API changes');
      return {
        changes: [],
        provider: this.provider,
        lastChecked: now.toISOString(),
      };
    }
  }

  private async checkAPIVersion(changes: ExternalChange[], now: Date): Promise<void> {
    try {
      // Check Meta Graph API version via API
      const latestVersion = await this.getLatestAPIVersion();
      
      if (latestVersion && latestVersion !== this.apiVersion) {
        const exists = await this.changeExists(
          `Meta Graph API Version Update: ${latestVersion}`,
          new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        );

        if (!exists) {
          changes.push({
            id: randomUUID(),
            provider: this.provider,
            changeType: 'version_update',
            title: `Meta Graph API Version Update: ${latestVersion}`,
            description: `New API version ${latestVersion} is available. Current version: ${this.apiVersion}. Please update your API calls to use the new version.`,
            impact: 'medium',
            detectedAt: now.toISOString(),
            status: 'detected',
            autoUpdated: false,
            affectedServices: ['whatsapp', 'meta-integration'],
            metadata: {
              oldVersion: this.apiVersion,
              newVersion: latestVersion,
              changelogUrl: `https://developers.facebook.com/docs/graph-api/changelog/version-${latestVersion.replace('v', '').replace('.', '-')}`,
            },
          });
        }
      }
    } catch (error) {
      this.logger.warn({ err: error }, 'Error checking API version');
    }
  }

  private async checkWebhookChanges(changes: ExternalChange[], now: Date): Promise<void> {
    try {
      // Check Meta's webhook documentation for changes
      const webhookDocsUrl = 'https://developers.facebook.com/docs/graph-api/webhooks';
      
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
      const signatureAlgorithms = ['sha256', 'sha1', 'hmac'];
      const foundAlgorithms = signatureAlgorithms.filter(alg => 
        html.toLowerCase().includes(alg.toLowerCase())
      );

      // If we detect multiple algorithms or changes, log it
      if (foundAlgorithms.length > 1) {
        const exists = await this.changeExists(
          'Meta Webhook Signature Algorithm Update',
          new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        );

        if (!exists) {
          changes.push({
            id: randomUUID(),
            provider: this.provider,
            changeType: 'webhook_change',
            title: 'Meta Webhook Signature Algorithm Update',
            description: `Multiple signature algorithms detected: ${foundAlgorithms.join(', ')}. Please verify your webhook signature verification is using the correct algorithm.`,
            impact: 'high',
            detectedAt: now.toISOString(),
            status: 'detected',
            autoUpdated: false,
            affectedServices: ['whatsapp-webhooks'],
            metadata: {
              algorithms: foundAlgorithms,
              docsUrl: webhookDocsUrl,
            },
          });
        }
      }
    } catch (error) {
      this.logger.warn({ err: error }, 'Error checking webhook changes');
    }
  }

  private async checkRateLimitChanges(changes: ExternalChange[], now: Date): Promise<void> {
    try {
      // Check Meta's rate limiting documentation
      const rateLimitDocsUrl = 'https://developers.facebook.com/docs/graph-api/overview/rate-limiting';
      
      const response = await fetch(rateLimitDocsUrl, {
        headers: {
          'User-Agent': 'OWONA-Monitoring/1.0',
        },
      });

      if (!response.ok) {
        return;
      }

      const html = await response.text();
      
      // Look for rate limit numbers (e.g., "200 calls per hour", "600 calls per 600 seconds")
      const rateLimitPatterns = [
        /(\d+)\s*calls?\s*per\s*(hour|minute|second|day)/gi,
        /rate\s*limit[:\s]+(\d+)/gi,
      ];

      const foundLimits: string[] = [];
      rateLimitPatterns.forEach(pattern => {
        const matches = html.matchAll(pattern);
        for (const match of matches) {
          if (match[1]) {
            foundLimits.push(`${match[1]} ${match[2] || 'calls'}`);
          }
        }
      });

      // If we detect significant changes in rate limits, log it
      // This is a simplified check - in production, you'd compare with stored baseline
      if (foundLimits.length > 0) {
        // Store baseline on first run, compare on subsequent runs
        // For now, we'll just log if we detect rate limit information
        this.logger.debug({ limits: foundLimits }, 'Detected rate limit information');
      }
    } catch (error) {
      this.logger.warn({ err: error }, 'Error checking rate limit changes');
    }
  }

  private async checkDeprecations(changes: ExternalChange[], now: Date): Promise<void> {
    try {
      // Check Meta's deprecation notices
      const deprecationUrl = 'https://developers.facebook.com/docs/graph-api/changelog';
      
      const response = await fetch(deprecationUrl, {
        headers: {
          'User-Agent': 'OWONA-Monitoring/1.0',
        },
      });

      if (!response.ok) {
        return;
      }

      const html = await response.text();
      
      // Look for deprecation keywords
      const deprecationKeywords = [
        /deprecated/gi,
        /sunset/gi,
        /removed/gi,
        /breaking\s+change/gi,
      ];

      const deprecationMatches: string[] = [];
      deprecationKeywords.forEach(keyword => {
        const matches = html.match(keyword);
        if (matches) {
          deprecationMatches.push(...matches);
        }
      });

      // If we detect deprecation mentions, check for specific endpoints we use
      if (deprecationMatches.length > 0) {
        // Check for deprecations of endpoints we use
        const ourEndpoints = [
          '/messages',
          '/phone_numbers',
          '/subscribed_apps',
          '/whatsapp_business_accounts',
        ];

        // Use for...of for async/await
        for (const endpoint of ourEndpoints) {
          const endpointDeprecated = html.toLowerCase().includes(endpoint.toLowerCase()) &&
                                     (html.toLowerCase().includes('deprecated') ||
                                      html.toLowerCase().includes('removed'));

          if (endpointDeprecated) {
            const exists = await this.changeExists(
              `Meta API Deprecation: ${endpoint}`,
              new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
            );

            if (!exists) {
              changes.push({
                id: randomUUID(),
                provider: this.provider,
                changeType: 'deprecation',
                title: `Meta API Deprecation: ${endpoint}`,
                description: `The endpoint ${endpoint} has been deprecated or removed. Please update your integration to use the new endpoint.`,
                impact: 'high',
                detectedAt: now.toISOString(),
                status: 'detected',
                autoUpdated: false,
                affectedServices: ['whatsapp'],
                metadata: {
                  endpoint,
                  changelogUrl: deprecationUrl,
                },
              });
            }
          }
        }
      }
    } catch (error) {
      this.logger.warn({ err: error }, 'Error checking deprecations');
    }
  }

  private async getLatestAPIVersion(): Promise<string | null> {
    try {
      // Strategy 1: Check Meta's API directly by testing common version numbers
      const versionsToTest = ['v19.0', 'v20.0', 'v21.0', 'v22.0'];
      const currentVersionNum = parseFloat(this.apiVersion.replace('v', ''));
      
      for (const version of versionsToTest) {
        try {
          const testResponse = await fetch(`https://graph.facebook.com/${version}/me`, {
            method: 'GET',
            headers: {
              'User-Agent': 'OWONA-Monitoring/1.0',
            },
          });
          
          // If we get a response (even 401/403), the version exists
          // 400 usually means invalid endpoint, 401/403 means auth required but version exists
          if (testResponse.status !== 400 && testResponse.status !== 404) {
            const versionNum = parseFloat(version.replace('v', ''));
            if (versionNum > currentVersionNum) {
              this.logger.info({ detectedVersion: version, currentVersion: this.apiVersion }, 'Detected new Meta API version');
              return version;
            }
          }
        } catch {
          // Ignore errors from test endpoint
          continue;
        }
      }

      // Strategy 2: Check Meta's changelog page
      try {
        const response = await fetch('https://developers.facebook.com/docs/graph-api/changelog', {
          headers: {
            'User-Agent': 'OWONA-Monitoring/1.0',
          },
        });

        if (response.ok) {
          const html = await response.text();
          
          // Look for version patterns: v19.0, version 19.0, etc.
          const versionPatterns = [
            /v(\d+\.\d+)/g,
            /version[:\s]+(\d+\.\d+)/gi,
            /api[_\s]?version[:\s]+(\d+\.\d+)/gi,
          ];

          const foundVersions: string[] = [];
          versionPatterns.forEach(pattern => {
            const matches = html.matchAll(pattern);
            for (const match of matches) {
              if (match[1]) {
                foundVersions.push(`v${match[1]}`);
              }
            }
          });

          if (foundVersions.length > 0) {
            // Get unique versions and sort
            const uniqueVersions = [...new Set(foundVersions)]
              .map(v => ({ version: v, num: parseFloat(v.replace('v', '')) }))
              .sort((a, b) => b.num - a.num);

            const latest = uniqueVersions[0];
            if (latest.num > currentVersionNum) {
              this.logger.info({ detectedVersion: latest.version, currentVersion: this.apiVersion }, 'Detected new Meta API version from changelog');
              return latest.version;
            }
          }
        }
      } catch (error) {
        this.logger.warn({ err: error }, 'Error fetching Meta changelog');
      }

      return null;
    } catch (error) {
      this.logger.warn({ err: error }, 'Error getting latest API version');
      return null;
    }
  }
}

