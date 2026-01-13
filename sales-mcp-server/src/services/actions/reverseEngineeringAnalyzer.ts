/**
 * Reverse Engineering Analyzer
 * 
 * Analysiert das Reverse Engineering Dokument, um alle Konfigurationen
 * als potenzielle Fehlerquellen zu identifizieren.
 * 
 * Statt einzelne Patterns zu erstellen, betrachtet dieses System
 * ALLE Konfigurationen als potenzielle Fehlerquellen und prüft,
 * ob eine davon das Problem verursacht.
 */

import type { KnowledgeDocument } from '../knowledgeBase.js';
import type { Logger } from '../../utils/logger.js';
import type { MinimalTicket } from './autopatchPatterns.js';
import type { AutopatchCandidate } from './autopatchPatterns.js';
import type { ResolutionAction } from '../llmClient.js';

interface ConfigurationItem {
  type: 'env_var' | 'api_endpoint' | 'database_setting' | 'frontend_config' | 'deployment_config';
  name: string;
  description: string;
  location: string;
  potentialIssues: string[];
  fixStrategies: string[];
}

interface ReverseEngineeringAnalysis {
  configurations: ConfigurationItem[];
  commonIssues: Array<{
    pattern: string;
    configs: string[];
    fix: string;
  }>;
}

export class ReverseEngineeringAnalyzer {
  private analysis: ReverseEngineeringAnalysis | null = null;

  constructor(
    private readonly knowledgeBase: { query: (query: string, limit?: number) => KnowledgeDocument[] },
    private readonly logger: Logger,
  ) {}

  /**
   * Analysiert das Reverse Engineering und extrahiert alle Konfigurationen
   */
  async analyzeReverseEngineering(): Promise<ReverseEngineeringAnalysis> {
    if (this.analysis) {
      return this.analysis;
    }

    this.logger.info('Analysiere Reverse Engineering Dokumente...');

    // Lade alle relevanten Dokumente
    const docs = [
      ...this.knowledgeBase.query('deployment configuration environment variables', 10),
      ...this.knowledgeBase.query('API endpoints routes', 10),
      ...this.knowledgeBase.query('database schema settings', 10),
      ...this.knowledgeBase.query('frontend configuration', 10),
    ];

    const configurations: ConfigurationItem[] = [];
    const commonIssues: ReverseEngineeringAnalysis['commonIssues'] = [];

    // Extrahiere Konfigurationen aus den Dokumenten
    for (const doc of docs) {
      const extracted = this.extractConfigurations(doc);
      configurations.push(...extracted);
    }

    // Identifiziere häufige Probleme basierend auf Konfigurationen
    for (const config of configurations) {
      const issues = this.identifyPotentialIssues(config);
      if (issues.length > 0) {
        commonIssues.push(...issues);
      }
    }

    this.analysis = {
      configurations,
      commonIssues,
    };

    this.logger.info(
      { configCount: configurations.length, issueCount: commonIssues.length },
      'Reverse Engineering Analyse abgeschlossen'
    );

    return this.analysis;
  }

  /**
   * Prüft, ob ein Ticket zu einer bekannten Konfiguration passt
   */
  async matchTicketToConfiguration(
    ticket: MinimalTicket
  ): Promise<AutopatchCandidate | null> {
    const analysis = await this.analyzeReverseEngineering();
    const combinedText = `${ticket.title ?? ''} ${ticket.description ?? ''}`.toLowerCase();

    // Prüfe jede Konfiguration als potenzielle Fehlerquelle
    for (const config of analysis.configurations) {
      const match = this.checkConfigurationMatch(config, combinedText, ticket);
      if (match) {
        return match;
      }
    }

    // Prüfe häufige Probleme
    for (const issue of analysis.commonIssues) {
      if (new RegExp(issue.pattern, 'i').test(combinedText)) {
        return this.createAutopatchCandidate(issue, ticket);
      }
    }

    return null;
  }

  /**
   * Prüft, ob eine Konfiguration zum Ticket passt
   */
  private checkConfigurationMatch(
    config: ConfigurationItem,
    text: string,
    ticket: MinimalTicket
  ): AutopatchCandidate | null {
    // Prüfe, ob der Text die Konfiguration erwähnt
    const configMentioned = text.includes(config.name.toLowerCase()) ||
      text.includes(config.description.toLowerCase());

    if (!configMentioned) {
      return null;
    }

    // Prüfe, ob eines der potenziellen Probleme passt
    for (const issue of config.potentialIssues) {
      if (text.includes(issue.toLowerCase())) {
        return this.createConfigFixCandidate(config, issue, ticket);
      }
    }

    return null;
  }

  /**
   * Erstellt einen Autopatch-Candidate basierend auf einer Konfiguration
   */
  private createConfigFixCandidate(
    config: ConfigurationItem,
    issue: string,
    ticket: MinimalTicket
  ): AutopatchCandidate {
    const fixStrategy = config.fixStrategies[0] || 'Konfiguration prüfen und korrigieren';

    return {
      patternId: `config-${config.type}-${config.name}`,
      summary: `Autopatch: ${config.name} Konfiguration korrigieren`,
      actions: [
        {
          type: 'autopatch_plan',
          description: `Korrigiere ${config.name} Konfiguration`,
          payload: {
            fixName: `fix-${config.name}`,
            goal: `${config.description} korrigieren`,
            targetFiles: [config.location],
            steps: [
              `Prüfe ${config.name} in ${config.location}`,
              `Korrigiere Konfiguration basierend auf Reverse Engineering`,
              ...config.fixStrategies.map((strategy) => `- ${strategy}`),
            ],
            validation: [`${config.name} funktioniert korrekt`],
            rollout: ['`npm run build`', '`pm2 restart whatsapp-bot-builder --update-env`'],
          },
        },
      ],
      customerMessage: `Wir haben das Problem mit der ${config.name} Konfiguration identifiziert und korrigieren es automatisch.`,
    };
  }

  /**
   * Erstellt einen Autopatch-Candidate basierend auf einem häufigen Problem
   */
  private createAutopatchCandidate(
    issue: ReverseEngineeringAnalysis['commonIssues'][0],
    ticket: MinimalTicket
  ): AutopatchCandidate {
    return {
      patternId: `common-issue-${issue.pattern}`,
      summary: `Autopatch: Häufiges Problem basierend auf Reverse Engineering`,
      actions: [
        {
          type: 'autopatch_plan',
          description: issue.fix,
          payload: {
            fixName: `fix-${issue.pattern}`,
            goal: issue.fix,
            targetFiles: issue.configs,
            steps: [
              `Problem identifiziert: ${issue.pattern}`,
              `Betroffene Konfigurationen: ${issue.configs.join(', ')}`,
              `Fix anwenden: ${issue.fix}`,
            ],
            validation: ['Problem behoben'],
            rollout: ['`npm run build`', '`pm2 restart whatsapp-bot-builder --update-env`'],
          },
        },
      ],
      customerMessage: `Wir haben das Problem identifiziert und wenden automatisch einen Fix an.`,
    };
  }

  /**
   * Extrahiert Konfigurationen aus einem Dokument
   */
  private extractConfigurations(doc: KnowledgeDocument): ConfigurationItem[] {
    const configs: ConfigurationItem[] = [];
    const content = doc.content;

    // Extrahiere Environment Variables
    const envVarRegex = /(?:NEXT_PUBLIC_|SUPABASE_|GROQ_|HETZNER_)[A-Z_]+/g;
    const envVars = [...new Set(content.match(envVarRegex) || [])];
    for (const envVar of envVars) {
      const description = this.extractDescription(content, envVar);
      configs.push({
        type: 'env_var',
        name: envVar,
        description: description || `Environment Variable: ${envVar}`,
        location: this.findLocation(content, envVar) || '.env.local',
        potentialIssues: [
          'fehlt',
          'falsch',
          'ungültig',
          'nicht gesetzt',
          'undefined',
        ],
        fixStrategies: [
          `Prüfe ${envVar} in .env.local`,
          `Stelle sicher, dass ${envVar} korrekt gesetzt ist`,
        ],
      });
    }

    // Extrahiere API Endpoints
    const apiRegex = /\/api\/[a-z0-9/-]+/g;
    const endpoints = [...new Set(content.match(apiRegex) || [])];
    for (const endpoint of endpoints) {
      configs.push({
        type: 'api_endpoint',
        name: endpoint,
        description: `API Endpoint: ${endpoint}`,
        location: `app/api${endpoint}/route.ts`,
        potentialIssues: [
          'fehler',
          '500',
          '404',
          'funktioniert nicht',
          'schiefgelaufen',
        ],
        fixStrategies: [
          `Prüfe ${endpoint} Route`,
          `Validiere Request/Response`,
          `Prüfe Error Handling`,
        ],
      });
    }

    // Extrahiere Database Settings
    const dbRegex = /(?:RLS|Row Level Security|policy|trigger|function)/gi;
    if (dbRegex.test(content)) {
      configs.push({
        type: 'database_setting',
        name: 'Database RLS/Policy',
        description: 'Database Row Level Security oder Policy',
        location: 'supabase/migrations',
        potentialIssues: [
          'zugriff verweigert',
          'permission denied',
          'nicht autorisiert',
          'rls fehler',
        ],
        fixStrategies: [
          'Prüfe RLS Policies',
          'Validiere User Permissions',
          'Prüfe Foreign Key Constraints',
        ],
      });
    }

    return configs;
  }

  /**
   * Extrahiert Beschreibung für eine Konfiguration
   */
  private extractDescription(content: string, name: string): string | null {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(name)) {
        // Versuche nächste Zeile als Beschreibung zu finden
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const line = lines[j].trim();
          if (line && !line.startsWith('#') && line.length > 10) {
            return line;
          }
        }
      }
    }
    return null;
  }

  /**
   * Findet den Ort einer Konfiguration
   */
  private findLocation(content: string, name: string): string | null {
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.includes(name) && (line.includes('.env') || line.includes('config'))) {
        const match = line.match(/([a-z0-9_./-]+\.(env|ts|js|json))/i);
        if (match) {
          return match[1];
        }
      }
    }
    return null;
  }

  /**
   * Identifiziert potenzielle Probleme für eine Konfiguration
   */
  private identifyPotentialIssues(config: ConfigurationItem): Array<{
    pattern: string;
    configs: string[];
    fix: string;
  }> {
    const issues: Array<{ pattern: string; configs: string[]; fix: string }> = [];

    for (const issue of config.potentialIssues) {
      issues.push({
        pattern: `${config.name.toLowerCase()}.*${issue}`,
        configs: [config.location],
        fix: config.fixStrategies[0] || `Korrigiere ${config.name}`,
      });
    }

    return issues;
  }
}

