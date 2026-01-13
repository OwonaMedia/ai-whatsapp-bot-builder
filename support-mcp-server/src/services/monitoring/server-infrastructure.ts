import { ExternalAPIMonitor, type ChangeDetectionResult, type ExternalChange } from './external-apis.js';
import type { SupportSupabaseClient } from '../supabaseClient.js';
import type { Logger } from '../../utils/logger.js';
import { randomUUID } from 'crypto';

/**
 * Monitor for Hetzner API changes
 */
export class HetznerMonitor extends ExternalAPIMonitor {
  constructor(supabase: SupportSupabaseClient, logger: Logger) {
    super(supabase, logger, 'Hetzner');
  }

  async checkForChanges(): Promise<ChangeDetectionResult> {
    const changes: ExternalChange[] = [];
    const now = new Date();

    try {
      // Check Hetzner API changelog
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
      this.logger.error({ err: error, provider: this.provider }, 'Error checking Hetzner API changes');
      return {
        changes: [],
        provider: this.provider,
        lastChecked: now.toISOString(),
      };
    }
  }

  private async checkAPIChangelog(changes: ExternalChange[], now: Date): Promise<void> {
    try {
      // Check Hetzner's API changelog
      const changelogUrl = 'https://docs.hetzner.cloud/';
      
      const response = await fetch(changelogUrl, {
        headers: {
          'User-Agent': 'OWONA-Monitoring/1.0',
        },
      });

      if (!response.ok) {
        return;
      }

      const html = await response.text();
      
      // Look for changelog or release notes
      const changelogPattern = /changelog|release[_\s]?notes|what['\s]?s[_\s]?new/gi;
      const hasChangelog = changelogPattern.test(html);

      if (hasChangelog) {
        // Look for recent dates
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
            const exists = await this.changeExists(
              'Hetzner API Changelog Update',
              new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            );

            if (!exists) {
              changes.push({
                id: randomUUID(),
                provider: this.provider,
                changeType: 'api_update',
                title: 'Hetzner API Changelog Update',
                description: `Recent changes detected in Hetzner API documentation. ${recentDates.length} recent entries found.`,
                impact: 'medium',
                detectedAt: now.toISOString(),
                status: 'detected',
                autoUpdated: false,
                affectedServices: ['infrastructure', 'hetzner'],
                metadata: {
                  recentEntries: recentDates.length,
                  docsUrl: changelogUrl,
                },
              });
            }
          }
        }
      }
    } catch (error) {
      this.logger.warn({ err: error }, 'Error checking Hetzner changelog');
    }
  }
}

/**
 * Monitor for n8n version updates
 */
export class N8nMonitor extends ExternalAPIMonitor {
  constructor(supabase: SupportSupabaseClient, logger: Logger) {
    super(supabase, logger, 'n8n');
  }

  async checkForChanges(): Promise<ChangeDetectionResult> {
    const changes: ExternalChange[] = [];
    const now = new Date();

    try {
      // Check n8n GitHub releases
      await this.checkVersionUpdates(changes, now);

      if (changes.length > 0) {
        await this.saveChanges(changes);
      }

      return {
        changes,
        provider: this.provider,
        lastChecked: now.toISOString(),
      };
    } catch (error) {
      this.logger.error({ err: error, provider: this.provider }, 'Error checking n8n version updates');
      return {
        changes: [],
        provider: this.provider,
        lastChecked: now.toISOString(),
      };
    }
  }

  private async checkVersionUpdates(changes: ExternalChange[], now: Date): Promise<void> {
    try {
      // Check n8n GitHub releases
      const releasesUrl = 'https://api.github.com/repos/n8n-io/n8n/releases/latest';
      
      const response = await fetch(releasesUrl, {
        headers: {
          'User-Agent': 'OWONA-Monitoring/1.0',
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        this.logger.warn({ status: response.status }, 'Failed to fetch n8n releases');
        return;
      }

      const release = await response.json() as {
        tag_name: string;
        published_at: string;
        body: string;
      };

      if (!release || !release.tag_name) {
        return;
      }

      // Extract version number (e.g., "v1.0.0" -> "1.0.0")
      const latestVersion = release.tag_name.replace(/^v/, '');
      const publishedDate = new Date(release.published_at);
      const daysAgo = (now.getTime() - publishedDate.getTime()) / (1000 * 60 * 60 * 24);

      // Only alert if release is recent (within last 30 days)
      if (daysAgo <= 30) {
        const exists = await this.changeExists(
          `n8n Version Update: ${release.tag_name}`,
          new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        );

        if (!exists) {
          // Check if it's a major version update (breaking changes likely)
          const versionParts = latestVersion.split('.').map(Number);
          const isMajorUpdate = versionParts[0] > 0; // Simplified check
          const hasBreakingChanges = release.body.toLowerCase().includes('breaking') ||
                                     release.body.toLowerCase().includes('deprecated');

          changes.push({
            id: randomUUID(),
            provider: this.provider,
            changeType: hasBreakingChanges ? 'breaking_change' : 'version_update',
            title: `n8n Version Update: ${release.tag_name}`,
            description: `New n8n version ${release.tag_name} released ${Math.round(daysAgo)} days ago. ${hasBreakingChanges ? 'Contains breaking changes.' : 'Please review release notes for updates.'}`,
            impact: hasBreakingChanges || isMajorUpdate ? 'high' : 'medium',
            detectedAt: now.toISOString(),
            status: 'detected',
            autoUpdated: false,
            affectedServices: ['n8n', 'automation'],
            metadata: {
              version: release.tag_name,
              publishedAt: release.published_at,
              releaseUrl: `https://github.com/n8n-io/n8n/releases/tag/${release.tag_name}`,
              hasBreakingChanges,
            },
          });
        }
      }
    } catch (error) {
      this.logger.warn({ err: error }, 'Error checking n8n version updates');
    }
  }
}

/**
 * Monitor for Supabase feature updates
 */
export class SupabaseMonitor extends ExternalAPIMonitor {
  constructor(supabase: SupportSupabaseClient, logger: Logger) {
    super(supabase, logger, 'Supabase');
  }

  async checkForChanges(): Promise<ChangeDetectionResult> {
    const changes: ExternalChange[] = [];
    const now = new Date();

    try {
      // Check Supabase changelog
      await this.checkChangelog(changes, now);

      if (changes.length > 0) {
        await this.saveChanges(changes);
      }

      return {
        changes,
        provider: this.provider,
        lastChecked: now.toISOString(),
      };
    } catch (error) {
      this.logger.error({ err: error, provider: this.provider }, 'Error checking Supabase changes');
      return {
        changes: [],
        provider: this.provider,
        lastChecked: now.toISOString(),
      };
    }
  }

  private async checkChangelog(changes: ExternalChange[], now: Date): Promise<void> {
    try {
      // Check Supabase's changelog
      const changelogUrl = 'https://supabase.com/docs/guides/platform/changelog';
      
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
          // Look for breaking changes or important updates
          const breakingChangeKeywords = ['breaking', 'deprecated', 'removed', 'changed', 'migration'];
          const hasBreakingChanges = breakingChangeKeywords.some(keyword =>
            html.toLowerCase().includes(keyword.toLowerCase())
          );

          // Check for specific feature mentions that might affect us
          const relevantFeatures = [
            'realtime',
            'database',
            'auth',
            'storage',
            'edge functions',
            'row level security',
          ];

          const hasRelevantFeatures = relevantFeatures.some(feature =>
            html.toLowerCase().includes(feature.toLowerCase())
          );

          if (hasRelevantFeatures || hasBreakingChanges) {
            const exists = await this.changeExists(
              'Supabase Changelog Update',
              new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            );

            if (!exists) {
              changes.push({
                id: randomUUID(),
                provider: this.provider,
                changeType: hasBreakingChanges ? 'breaking_change' : 'api_update',
                title: 'Supabase Changelog Update',
                description: `Recent changes detected in Supabase changelog. ${recentDates.length} recent entries found. ${hasBreakingChanges ? 'Contains breaking changes.' : 'Please review for updates affecting your integration.'}`,
                impact: hasBreakingChanges ? 'high' : 'medium',
                detectedAt: now.toISOString(),
                status: 'detected',
                autoUpdated: false,
                affectedServices: ['database', 'realtime', 'auth', 'storage'],
                metadata: {
                  recentEntries: recentDates.length,
                  hasBreakingChanges,
                  relevantFeatures: relevantFeatures.filter(f => html.toLowerCase().includes(f.toLowerCase())),
                  changelogUrl,
                },
              });
            }
          }
        }
      }
    } catch (error) {
      this.logger.warn({ err: error }, 'Error checking Supabase changelog');
    }
  }
}

