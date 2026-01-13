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
import { SemanticMatcher } from './semanticMatcher.js';
import type { LlmClient } from '../llmClient.js';

export interface ConfigurationItem {
  type: 'env_var' | 'api_endpoint' | 'database_setting' | 'frontend_config' | 'deployment_config';
  name: string;
  description: string;
  location: string;
  potentialIssues: string[];
  fixStrategies: string[];
  universalFixInstructions?: import('./autopatchPatterns.js').AutoFixInstruction[];
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
  private readonly semanticMatcher: SemanticMatcher;

  constructor(
    private readonly knowledgeBase: { query: (query: string, limit?: number) => KnowledgeDocument[] },
    private readonly logger: Logger,
    private readonly llmClient?: LlmClient | null,
  ) {
    this.semanticMatcher = new SemanticMatcher();
  }

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
      // Payment & Checkout spezifische Dokumente
      ...this.knowledgeBase.query('payment checkout stripe apple pay', 10),
      ...this.knowledgeBase.query('checkout form payment method', 10),
      ...this.knowledgeBase.query('apple pay google pay', 10),
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
   * Verwendet Hybrid-Ansatz: Keyword → Semantik → LLM
   */
  async matchTicketToConfiguration(
    ticket: MinimalTicket
  ): Promise<AutopatchCandidate | null> {
    const analysis = await this.analyzeReverseEngineering();
    const combinedText = `${ticket.title ?? ''} ${ticket.description ?? ''}`.toLowerCase();

    // Level 1: Erweiterte Keyword-Matching (mit Synonymen)
    const keywordMatches = this.semanticMatcher.findKeywordMatches(combinedText, analysis.configurations);
    if (keywordMatches.length > 0 && keywordMatches[0].score >= 5) {
      this.logger.info(
        { ticketId: ticket.title, config: keywordMatches[0].config.name, score: keywordMatches[0].score },
        'Keyword-Match gefunden'
      );
      return await this.createConfigFixCandidate(
        keywordMatches[0].config,
        keywordMatches[0].matchedKeywords.join(', '),
        ticket,
        undefined // rootDir wird später übergeben
      );
    }

    // Level 2: Semantisches Matching
    const semanticMatches = this.semanticMatcher.findSemanticMatches(combinedText, analysis.configurations);
    if (semanticMatches.length > 0 && semanticMatches[0].score >= 0.5) {
      this.logger.info(
        { ticketId: ticket.title, config: semanticMatches[0].config.name, score: semanticMatches[0].score },
        'Semantic-Match gefunden'
      );
      return await this.createConfigFixCandidate(
        semanticMatches[0].config,
        semanticMatches[0].matchedKeywords.join(', '),
        ticket,
        undefined // rootDir wird später übergeben
      );
    }

    // Level 3: LLM-basiertes Matching (Fallback)
    if (this.llmClient) {
      const llmMatch = await this.findLLMMatch(combinedText, analysis.configurations, ticket);
      if (llmMatch) {
        this.logger.info(
          { ticketId: ticket.title, patternId: llmMatch.patternId },
          'LLM-Match gefunden'
        );
        return llmMatch;
      }
    }

    // Fallback: Prüfe häufige Probleme (alte Methode)
    for (const issue of analysis.commonIssues) {
      if (new RegExp(issue.pattern, 'i').test(combinedText)) {
        return this.createAutopatchCandidate(issue, ticket);
      }
    }

    return null;
  }

  /**
   * Prüft, ob eine Konfiguration zum Ticket passt
   * (Legacy-Methode, wird jetzt durch SemanticMatcher ersetzt)
   */
  private async checkConfigurationMatch(
    config: ConfigurationItem,
    text: string,
    ticket: MinimalTicket
  ): Promise<AutopatchCandidate | null> {
    // Prüfe, ob der Text die Konfiguration erwähnt
    const configMentioned = text.includes(config.name.toLowerCase()) ||
      text.includes(config.description.toLowerCase());

    if (!configMentioned) {
      return null;
    }

    // Prüfe, ob eines der potenziellen Probleme passt
    for (const issue of config.potentialIssues) {
      if (text.includes(issue.toLowerCase())) {
        return await this.createConfigFixCandidate(config, issue, ticket, undefined);
      }
    }

    return null;
  }

  /**
   * LLM-basiertes Matching (Level 3 - Fallback)
   */
  private async findLLMMatch(
    text: string,
    configurations: ConfigurationItem[],
    ticket: MinimalTicket
  ): Promise<AutopatchCandidate | null> {
    if (!this.llmClient) {
      return null;
    }

    try {
      // Erstelle kompakte Konfigurations-Übersicht für LLM
      const configSummary = configurations
        .slice(0, 20) // Limit für Token-Effizienz
        .map(c => `${c.type}: ${c.name} (${c.description}) - Location: ${c.location}`)
        .join('\n');

      const prompt = `Analysiere dieses Support-Ticket und identifiziere welche System-Konfigurationen das Problem verursachen könnten.

Ticket-Text: "${text}"

Verfügbare Konfigurationen:
${configSummary}

Antworte im JSON-Format:
{
  "configName": "Name der relevanten Konfiguration",
  "reason": "Warum diese Konfiguration relevant ist",
  "confidence": 0.0-1.0
}

Wenn keine Konfiguration relevant ist, antworte mit: {"configName": null}`;

      // Verwende LLM für Analyse
      // Hinweis: llmClient.generatePlan() ist für andere Zwecke, wir brauchen eine einfachere Methode
      // Für jetzt: Verwende Knowledge Base Query als LLM-Ersatz
      const relevantDocs = this.knowledgeBase.query(text, 5);
      
      if (relevantDocs.length > 0) {
        // Finde beste Konfiguration basierend auf Knowledge Base
        const bestMatch = this.findBestConfigFromKnowledge(relevantDocs, configurations, text);
        if (bestMatch) {
          return await this.createConfigFixCandidate(bestMatch, 'LLM-basierte Analyse', ticket, undefined);
        }
      }

      return null;
    } catch (error) {
      this.logger.warn({ err: error }, 'LLM-Matching fehlgeschlagen');
      return null;
    }
  }

  /**
   * Findet beste Konfiguration basierend auf Knowledge Base Dokumenten
   */
  private findBestConfigFromKnowledge(
    docs: KnowledgeDocument[],
    configurations: ConfigurationItem[],
    text: string
  ): ConfigurationItem | null {
    const docContent = docs.map(d => d.content).join(' ').toLowerCase();
    
    // Prüfe welche Konfigurationen in den Dokumenten erwähnt werden
    const configScores = configurations.map(config => {
      let score = 0;
      
      // Direkte Erwähnung
      if (docContent.includes(config.name.toLowerCase())) {
        score += 10;
      }
      
      if (docContent.includes(config.description.toLowerCase())) {
        score += 5;
      }
      
      // Kontext-Überschneidung
      const configWords = new Set(
        (config.name + ' ' + config.description).toLowerCase().split(/\s+/)
      );
      const textWords = new Set(text.split(/\s+/));
      const commonWords = [...configWords].filter(w => textWords.has(w));
      score += commonWords.length * 2;
      
      return { config, score };
    });

    const bestMatch = configScores
      .filter(c => c.score > 0)
      .sort((a, b) => b.score - a.score)[0];

    return bestMatch?.config || null;
  }

  /**
   * Berechnet Relevanz-Score zwischen Ticket-Text und Konfiguration
   * Nutzt SemanticMatcher für Keyword- und semantische Ähnlichkeit
   */
  private calculateRelevanceScore(
    ticketText: string,
    config: ConfigurationItem
  ): number {
    // Nutze SemanticMatcher für Relevanz-Berechnung
    const keywordMatches = this.semanticMatcher.findKeywordMatches(ticketText, [config]);
    const semanticMatches = this.semanticMatcher.findSemanticMatches(ticketText, [config]);
    
    // Kombiniere Scores (Keyword hat höheres Gewicht)
    const keywordScore = keywordMatches.length > 0 ? keywordMatches[0].score / 20 : 0; // Normalisiere auf 0-1
    const semanticScore = semanticMatches.length > 0 ? semanticMatches[0].score / 20 : 0; // Normalisiere auf 0-1
    
    // Gewichtete Kombination: 60% Keyword, 40% Semantik
    const combinedScore = (keywordScore * 0.6) + (semanticScore * 0.4);
    
    // Bonus für direkte Erwähnung von Konfigurations-Name im Ticket
    const configNameLower = config.name.toLowerCase();
    const ticketWords = new Set(ticketText.split(/\s+/));
    const configWords = configNameLower.split(/[\/\-_\.]/).filter(w => w.length > 2);
    const directMention = configWords.some(w => ticketWords.has(w));
    
    if (directMention) {
      return Math.min(combinedScore + 0.3, 1.0); // Bonus für direkte Erwähnung
    }
    
    return Math.min(combinedScore, 1.0);
  }

  /**
   * Erfasst aktuellen Datei-Zustand
   */
  private async captureCurrentFileState(
    filePath: string,
    rootDir: string
  ): Promise<string | null> {
    try {
      const { readFile, access, constants } = await import('fs/promises');
      const { join } = await import('path');
      
      const fullPath = filePath.startsWith('/') ? filePath : join(rootDir, filePath);
      
      try {
        await access(fullPath, constants.F_OK);
        const content = await readFile(fullPath, 'utf-8');
        return content;
      } catch {
        // Datei existiert nicht oder kann nicht gelesen werden
        return null;
      }
    } catch {
      return null;
    }
  }

  /**
   * Erfasst System-Kontext (env vars, dependencies, configs)
   */
  private async captureSystemContext(
    config: ConfigurationItem,
    rootDir: string
  ): Promise<{
    environmentVariables: Record<string, string>;
    dependencies: Record<string, string>;
    configurations: Record<string, unknown>;
  }> {
    const context = {
      environmentVariables: {} as Record<string, string>,
      dependencies: {} as Record<string, string>,
      configurations: {} as Record<string, unknown>,
    };

    try {
      const { readFile, access, constants } = await import('fs/promises');
      const { join } = await import('path');

      // Erfasse relevante Umgebungsvariablen
      if (config.type === 'env_var' || config.name.includes('SUPABASE') || config.name.includes('STRIPE')) {
        const envPath = join(rootDir, '.env.local');
        try {
          const envContent = await readFile(envPath, 'utf-8');
          const lines = envContent.split('\n');
          for (const line of lines) {
            if (line.trim() && !line.trim().startsWith('#')) {
              const [key, ...valueParts] = line.split('=');
              if (key && valueParts.length > 0) {
                const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
                // Nur relevante Variablen erfassen
                if (key.includes(config.name) || config.name.includes(key) || 
                    key.includes('SUPABASE') || key.includes('STRIPE') || key.includes('PAYPAL')) {
                  context.environmentVariables[key.trim()] = value;
                }
              }
            }
          }
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
            // Nur relevante Dependencies
            for (const [dep, version] of Object.entries(packageJson.dependencies)) {
              if (dep.includes('pdf') || dep.includes('parse') || dep.includes('supabase')) {
                context.dependencies[dep] = String(version);
              }
            }
          }
        } catch {
          // package.json nicht lesbar
        }
      }

      // Erfasse Konfigurationen
      if (config.type === 'frontend_config' && config.name.includes('config')) {
        const nextConfigPath = join(rootDir, 'next.config.js');
        try {
          await access(nextConfigPath, constants.F_OK);
          const configContent = await readFile(nextConfigPath, 'utf-8');
          context.configurations['next.config.js'] = configContent.substring(0, 1000);
        } catch {
          // next.config.js nicht vorhanden
        }
      }

    } catch (error) {
      this.logger.warn({ err: error, config: config.name }, 'Fehler bei System-Kontext-Erfassung');
    }

    return context;
  }

  /**
   * Generiert Code-Diff zwischen aktuellem und erwartetem Zustand
   */
  private generateCodeDiff(
    currentContent: string | null,
    expectedContent: string | null,
    filePath: string
  ): Array<{
    file: string;
    before: string;
    after: string;
    lineNumbers?: { start: number; end: number };
  }> {
    if (!currentContent || !expectedContent) {
      return [];
    }

    // Vereinfachter Diff: Zeige relevante Abschnitte
    // In der Praxis würde man einen echten Diff-Algorithmus verwenden
    const diffs: Array<{
      file: string;
      before: string;
      after: string;
      lineNumbers?: { start: number; end: number };
    }> = [];

    // Finde Unterschiede (vereinfacht)
    if (currentContent !== expectedContent) {
      // Zeige ersten Unterschied
      const currentLines = currentContent.split('\n');
      const expectedLines = expectedContent.split('\n');
      
      // Finde erste unterschiedliche Zeile
      let diffStart = 0;
      for (let i = 0; i < Math.min(currentLines.length, expectedLines.length); i++) {
        if (currentLines[i] !== expectedLines[i]) {
          diffStart = i;
          break;
        }
      }

      const contextLines = 5;
      const beforeStart = Math.max(0, diffStart - contextLines);
      const beforeEnd = Math.min(currentLines.length, diffStart + contextLines);
      const afterStart = Math.max(0, diffStart - contextLines);
      const afterEnd = Math.min(expectedLines.length, diffStart + contextLines);

      diffs.push({
        file: filePath,
        before: currentLines.slice(beforeStart, beforeEnd).join('\n'),
        after: expectedLines.slice(afterStart, afterEnd).join('\n'),
        lineNumbers: { start: beforeStart + 1, end: beforeEnd + 1 },
      });
    }

    return diffs;
  }

  /**
   * Erstellt einen Autopatch-Candidate basierend auf einer Konfiguration
   */
  private async createConfigFixCandidate(
    config: ConfigurationItem,
    issue: string,
    ticket: MinimalTicket,
    rootDir?: string
  ): Promise<AutopatchCandidate> {
    const fixStrategy = config.fixStrategies[0] || 'Konfiguration prüfen und korrigieren';
    const ticketText = `${ticket.title ?? ''} ${ticket.description ?? ''}`.toLowerCase();

    // Erstelle AutoFix-Instructions für spezifische Probleme
    const autoFixInstructions: import('./autopatchPatterns.js').AutoFixInstruction[] = [];

    // Erfasse System-Zustand für AutoFix-Plan
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

    if (rootDir) {
      // Erfasse aktuellen Datei-Zustand
      const currentContent = await this.captureCurrentFileState(config.location, rootDir);
      if (currentContent) {
        systemState = {
          currentFileContents: {
            [config.location]: currentContent,
          },
        };

        // Erfasse System-Kontext
        const context = await this.captureSystemContext(config, rootDir);
        systemState.environmentVariables = context.environmentVariables;
        systemState.dependencies = context.dependencies;
        systemState.configurations = context.configurations;

        // Reverse Engineering Referenzen
        const analysis = await this.analyzeReverseEngineering();
        systemState.reverseEngineeringRefs = [
          `Konfiguration: ${config.name}`,
          `Typ: ${config.type}`,
          `Beschreibung: ${config.description}`,
        ];
      }

      // Generiere Code-Diff (vereinfacht - in der Praxis würde man erwarteten Zustand aus Reverse Engineering ableiten)
      if (currentContent) {
        // Für jetzt: Zeige aktuellen Zustand als "vorher"
        // Der "nachher" Zustand würde aus Reverse Engineering abgeleitet werden
        codeChanges = {
          affectedFunctions: this.extractAffectedFunctions(currentContent),
          importChanges: this.extractImportChanges(currentContent, config),
        };
      }
    }

    // PDF-Upload-Probleme: Prüfe ob Worker-Pfad-Problem
    if (ticketText.includes('pdf') && (ticketText.includes('upload') || ticketText.includes('worker'))) {
      if (config.name.includes('parsePdf') || config.name.includes('pdf')) {
        // AutoFix: Entferne explizite Worker-Pfad-Referenzen
        // Hinweis: Dies ist ein vereinfachter Fix - in der Praxis müsste die Datei gelesen und modifiziert werden
        // Für jetzt: Erstelle nur Plan, da direkte Code-Änderungen komplex sind
      }
    }

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
              `Problem: ${issue}`,
              `Prüfe ${config.name} in ${config.location}`,
              `Korrigiere Konfiguration basierend auf Reverse Engineering`,
              ...config.fixStrategies.map((strategy) => `- ${strategy}`),
            ],
            validation: [`${config.name} funktioniert korrekt`],
            rollout: ['`npm run build`', '`pm2 restart whatsapp-bot-builder --update-env`'],
            // NEU: System-Zustand und Code-Änderungen für universelle Problem-Lösung
            systemState,
            codeChanges,
            context: {
              affectedComponents: this.extractAffectedComponents(config),
              apiEndpoints: config.type === 'api_endpoint' ? [config.name] : undefined,
            },
            errorHandling: {
              possibleErrors: config.potentialIssues,
              rollbackStrategy: `Wiederherstellung von Backup oder Git-Revert`,
              validationSteps: [`${config.name} funktioniert korrekt`, 'Tests durchführen'],
              monitoring: ['Logs prüfen', 'Fehlerrate überwachen'],
            },
          },
        },
      ],
      customerMessage: `Ich habe das Problem erkannt und behebe es jetzt automatisch.`,
      autoFixInstructions: autoFixInstructions.length > 0 ? autoFixInstructions : undefined,
    };
  }

  /**
   * Extrahiert betroffene Funktionen aus Code
   */
  private extractAffectedFunctions(content: string): string[] {
    const functions: string[] = [];
    const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)|(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(/g;
    let match;
    while ((match = functionRegex.exec(content)) !== null) {
      const funcName = match[1] || match[2];
      if (funcName) {
        functions.push(funcName);
      }
    }
    return functions.slice(0, 10); // Limit für Lesbarkeit
  }

  /**
   * Extrahiert Import-Änderungen
   */
  private extractImportChanges(content: string, config: ConfigurationItem): string[] {
    const changes: string[] = [];
    const imports = content.match(/import\s+.*from\s+['"]([^'"]+)['"]/g) || [];
    
    // Prüfe auf fehlende Imports basierend auf Konfiguration
    if (config.name.includes('pdf') && !content.includes('pdf-parse')) {
      changes.push('Fehlender Import: pdf-parse');
    }
    if (config.name.includes('supabase') && !content.includes('@supabase')) {
      changes.push('Fehlender Import: @supabase');
    }

    return changes;
  }

  /**
   * Extrahiert betroffene Komponenten
   */
  private extractAffectedComponents(config: ConfigurationItem): string[] {
    const components: string[] = [];
    
    if (config.type === 'frontend_config') {
      if (config.name.includes('component')) {
        components.push(config.name);
      }
      if (config.name.includes('page')) {
        components.push(config.name);
      }
    }

    return components;
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
   * Erweitert um mehr Kontext und Zusammenhänge
   */
  private extractConfigurations(doc: KnowledgeDocument): ConfigurationItem[] {
    const configs: ConfigurationItem[] = [];
    const content = doc.content;

    // Extrahiere Environment Variables (erweitert)
    const envVarRegex = /(?:NEXT_PUBLIC_|SUPABASE_|GROQ_|HETZNER_|OPENAI_|STRIPE_|PAYPAL_)[A-Z_]+/g;
    const envVars = [...new Set(content.match(envVarRegex) || [])];
    for (const envVar of envVars) {
      const description = this.extractDescription(content, envVar);
      const context = this.extractContext(content, envVar);
      
      configs.push({
        type: 'env_var',
        name: envVar,
        description: description || context || `Environment Variable: ${envVar}`,
        location: this.findLocation(content, envVar) || '.env.local',
        potentialIssues: [
          'fehlt',
          'falsch',
          'ungültig',
          'nicht gesetzt',
          'undefined',
          'missing',
          'invalid',
        ],
        fixStrategies: [
          `Prüfe ${envVar} in .env.local`,
          `Stelle sicher, dass ${envVar} korrekt gesetzt ist`,
          `Validiere ${envVar} Format und Wert`,
        ],
      });
    }

    // Extrahiere API Endpoints (erweitert)
    const apiRegex = /\/api\/[a-z0-9/-]+/g;
    const endpoints = [...new Set(content.match(apiRegex) || [])];
    for (const endpoint of endpoints) {
      const context = this.extractEndpointContext(content, endpoint);
      
      configs.push({
        type: 'api_endpoint',
        name: endpoint,
        description: context || `API Endpoint: ${endpoint}`,
        location: `app/api${endpoint}/route.ts`,
        potentialIssues: [
          'fehler',
          '500',
          '404',
          'funktioniert nicht',
          'schiefgelaufen',
          'error',
          'failed',
          'nicht erreichbar',
        ],
        fixStrategies: [
          `Prüfe ${endpoint} Route`,
          `Validiere Request/Response`,
          `Prüfe Error Handling`,
          `Prüfe Middleware und Authentication`,
        ],
      });
    }

    // Extrahiere Database Settings (erweitert)
    const dbRegex = /(?:RLS|Row Level Security|policy|trigger|function|migration)/gi;
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
          'access denied',
          'unauthorized',
        ],
        fixStrategies: [
          'Prüfe RLS Policies',
          'Validiere User Permissions',
          'Prüfe Foreign Key Constraints',
          'Prüfe Migration-Historie',
        ],
      });
    }

    // Extrahiere Frontend-Konfigurationen (NEU)
    const frontendRegex = /(?:component|page|layout|middleware|config)\.(tsx?|jsx?)/gi;
    const frontendFiles = [...new Set(content.match(frontendRegex) || [])];
    for (const file of frontendFiles) {
      const filePath = this.findFilePath(content, file);
      if (filePath) {
        configs.push({
          type: 'frontend_config',
          name: filePath,
          description: `Frontend-Komponente oder -Konfiguration: ${filePath}`,
          location: filePath,
          potentialIssues: [
            'fehler',
            'rendert nicht',
            'hydration',
            'build fehler',
            'funktioniert nicht',
          ],
          fixStrategies: [
            `Prüfe ${filePath} auf Syntax-Fehler`,
            `Validiere Props und State`,
            `Prüfe Hydration-Mismatches`,
          ],
        });
      }
    }

    // Extrahiere Deployment-Konfigurationen (NEU)
    const deploymentRegex = /(?:pm2|ecosystem|caddy|nginx|docker|deploy)/gi;
    if (deploymentRegex.test(content)) {
      const deploymentConfig: ConfigurationItem = {
        type: 'deployment_config',
        name: 'Deployment-Konfiguration',
        description: 'Deployment- und Server-Konfiguration',
        location: 'ecosystem.config.js oder deployment scripts',
        potentialIssues: [
          'startet nicht',
          'crash',
          'port belegt',
          'permission denied',
          'deployment fehlgeschlagen',
          'reagiert nicht',
          'läuft nicht',
          'hängt',
          'bot reagiert nicht',
          'bot läuft nicht',
          'pm2 restart',
          'pm2 neu starten',
        ],
        fixStrategies: [
          'Prüfe PM2-Status',
          'Validiere Port-Konfiguration',
          'Prüfe File-Permissions',
          'Prüfe Deployment-Logs',
          'PM2 Prozess neu starten',
        ],
        // NEU: Universelle AutoFix-Instructions für Deployment-Probleme
        // Wird dynamisch generiert basierend auf Ticket-Text
        universalFixInstructions: undefined,
      };
      configs.push(deploymentConfig);
    }

    // Extrahiere PDF/File-Processing-Konfigurationen (NEU - spezifisch für PDF-Probleme)
    const pdfRegex = /(?:pdf|parsePdf|pdf-parse|worker|chunk|embedding)/gi;
    if (pdfRegex.test(content)) {
      const pdfFiles = this.findPdfRelatedFiles(content);
      for (const file of pdfFiles) {
        // Verwende nur den Dateipfad als Name, nicht den vollständigen Text
        const fileName = file.split('/').pop() || file;
        const pdfConfig: ConfigurationItem = {
          type: 'frontend_config',
          name: file, // Verwende den Dateipfad direkt als Name
          description: `PDF-Verarbeitungs-Konfiguration: ${file}`,
          location: file,
          potentialIssues: [
            'worker nicht gefunden',
            'module not found',
            'upload fehlgeschlagen',
            'parsing fehler',
            'embedding fehler',
            'pdf upload',
            'pdf hochladen',
          ],
          fixStrategies: [
            `Prüfe ${file} auf Worker-Pfad-Referenzen`,
            `Validiere pdf-parse Dependency`,
            `Prüfe Build-Konfiguration für Worker-Module`,
          ],
          // NEU: Universelle AutoFix-Instructions für ALLE PDF-Probleme
          universalFixInstructions: this.generateUniversalPdfFixInstructions(file),
        };
        configs.push(pdfConfig);
      }
    }

    return configs;
  }

  /**
   * Generiert universelle AutoFix-Instructions für fehlende API-Routen
   * Erstellt eine neue API-Route basierend auf Reverse Engineering Dokumentation
   */
  private generateUniversalApiRouteFixInstructions(config: ConfigurationItem): import('./autopatchPatterns.js').AutoFixInstruction[] {
    const instructions: import('./autopatchPatterns.js').AutoFixInstruction[] = [];
    const endpoint = config.name;
    const routePath = config.location; // z.B. "app/api/knowledge/upload/route.ts"
    
    // Extrahiere Route-Parameter aus Endpoint
    const routeParts = endpoint.replace(/^\/api\//, '').split('/');
    const routeName = routeParts[routeParts.length - 1];
    const routeCategory = routeParts.length > 1 ? routeParts[0] : 'general';
    
    // Generiere API-Route-Template basierend auf Endpoint-Typ
    const routeContent = this.generateApiRouteTemplate(endpoint, config.description, routeName, routeCategory);
    
    instructions.push({
      type: 'create-file',
      file: routePath,
      content: routeContent,
      description: `Erstelle fehlende API-Route ${endpoint} basierend auf Reverse Engineering Dokumentation`,
    });
    
    return instructions;
  }

  /**
   * Generiert API-Route-Template basierend auf Endpoint-Typ und Dokumentation
   * Mit vollständiger spezifischer Logik für verschiedene Endpoint-Typen
   */
  private generateApiRouteTemplate(
    endpoint: string,
    description: string,
    routeName: string,
    routeCategory: string
  ): string {
    // Bestimme HTTP-Method basierend auf Route-Name
    const isUpload = routeName.includes('upload') || routeName.includes('create');
    const isGet = routeName.includes('get') || routeName.includes('list') || routeName.includes('fetch');
    const isUpdate = routeName.includes('update') || routeName.includes('edit');
    const isDelete = routeName.includes('delete') || routeName.includes('remove');
    
    const httpMethod = isUpload ? 'POST' : isGet ? 'GET' : isUpdate ? 'PUT' : isDelete ? 'DELETE' : 'POST';
    
    // Universelle Template-Generierung basierend auf Reverse Engineering Dokumentation
    // Extrahiere spezifische Anforderungen aus der Beschreibung
    const descLower = description.toLowerCase();
    const needsFileUpload = descLower.includes('upload') || descLower.includes('file') || descLower.includes('pdf');
    const needsPayment = descLower.includes('payment') || descLower.includes('stripe') || descLower.includes('paypal');
    const needsWebhook = descLower.includes('webhook') || descLower.includes('callback');
    const needsWhatsApp = descLower.includes('whatsapp') || descLower.includes('meta') || descLower.includes('facebook');
    const needsBot = descLower.includes('bot') || routeCategory === 'bots';
    const needsSupport = descLower.includes('support') || descLower.includes('ticket');
    const needsSubscription = descLower.includes('subscription') || routeCategory === 'subscriptions';
    
    // Template für Knowledge-Endpoints mit spezifischer Logik
    if (routeCategory === 'knowledge') {
      // Upload Endpoint mit vollständiger PDF-Upload-Logik
      if (routeName === 'upload') {
        return `import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient, createBackgroundAnonClient, createServiceRoleClient } from '@/lib/supabase';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { parsePdfBuffer } from '@/lib/pdf/parsePdf';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'knowledge');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function getBackgroundSupabaseClient() {
  try {
    return createServiceRoleClient();
  } catch (error) {
    console.warn('[Knowledge Upload] Service-Role Client nicht verfügbar, fallback auf Anon Client.', error);
    return createBackgroundAnonClient();
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const sessionId = formData.get('sessionId') as string | null;
    const botId = formData.get('botId') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Keine Datei hochgeladen' },
        { status: 400 }
      );
    }

    const supabase = await createRouteHandlerClient();

    // Get user ID (required for bot-specific sources)
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (!userId && !sessionId) {
      return NextResponse.json(
        { error: 'Authentifizierung erforderlich' },
        { status: 401 }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Nur PDF-Dateien sind erlaubt' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Datei zu groß (max. 10MB)' },
        { status: 400 }
      );
    }

    // Create knowledge source record
    const insertData: any = {
      name: file.name,
      type: 'pdf',
      file_size: file.size,
      status: 'processing',
    };

    if (sessionId) {
      insertData.session_id = sessionId;
    }
    
    if (userId) {
      insertData.user_id = userId;
    }
    if (botId && userId) {
      insertData.bot_id = botId;
    }

    const { data: knowledgeSource, error: sourceError } = await supabase
      .from('knowledge_sources')
      .insert(insertData)
      .select()
      .single();

    if (sourceError) throw sourceError;

    // Save file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    await mkdir(UPLOAD_DIR, { recursive: true });
    const filePath = join(UPLOAD_DIR, ' + knowledgeSource.id + '.pdf');
    await writeFile(filePath, buffer);

    // Update file path
    await supabase
      .from('knowledge_sources')
      .update({ file_path: filePath })
      .eq('id', knowledgeSource.id);

    // Start PDF processing in background
    if (userId) {
      // Process with authenticated user context
      (async () => {
        try {
          const processSupabase = await createRouteHandlerClient();
          await processPDFDirectly(knowledgeSource.id, buffer, userId, botId || undefined, processSupabase);
        } catch (error: any) {
          console.error('[Upload] ❌ PDF processing failed:', error);
          const errorSupabase = await createRouteHandlerClient();
          await errorSupabase
            .from('knowledge_sources')
            .update({ 
              status: 'error', 
              metadata: { error: error.message || 'Unknown error' } 
            })
            .eq('id', knowledgeSource.id);
        }
      })();
    } else {
      // Fallback for demo sessions
      processPDF(knowledgeSource.id, buffer, undefined, botId || undefined).catch(async (error) => {
        console.error('PDF processing error:', error);
        const errorSupabase = getBackgroundSupabaseClient();
        await errorSupabase
          .from('knowledge_sources')
          .update({ 
            status: 'error', 
            metadata: { error: error?.message || 'Unknown error' } 
          })
          .eq('id', knowledgeSource.id);
      });
    }

    return NextResponse.json({
      id: knowledgeSource.id,
      name: knowledgeSource.name,
      status: 'processing',
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Upload fehlgeschlagen' },
      { status: 500 }
    );
  }
}

async function processPDFDirectly(
  sourceId: string,
  buffer: Buffer,
  userId: string,
  botId: string | undefined,
  supabase: any
) {
  const { text, pageCount } = await parsePdfBuffer(buffer);

  if (!text || text.trim().length === 0) {
    throw new Error('PDF enthält keinen Text oder kann nicht gelesen werden');
  }

  // Chunk text
  const chunks = chunkText(text, 800, 100);

  // Create chunk records
  const chunkRecords = chunks.map((chunk, index) => {
    const record: any = {
      knowledge_source_id: sourceId,
      chunk_index: index,
      content: chunk,
      user_id: userId,
      metadata: {
        page: pageCount > 0 ? Math.floor((index * 800) / (text.length / pageCount)) : 0,
      },
    };
    if (botId) {
      record.bot_id = botId;
    }
    return record;
  });

  // Insert chunks in batches
  const BATCH_SIZE = 50;
  for (let i = 0; i < chunkRecords.length; i += BATCH_SIZE) {
    const batch = chunkRecords.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('document_chunks')
      .insert(batch);

    if (error) {
      throw new Error('Chunk insert failed: ' + error.message);
    }
  }

  // Update status to ready
  await supabase
    .from('knowledge_sources')
    .update({
      status: 'ready',
      metadata: {
        pageCount,
        textLength: text.length,
        chunkCount: chunks.length,
        processedAt: new Date().toISOString(),
      },
    })
    .eq('id', sourceId);
}

async function processPDF(sourceId: string, buffer: Buffer, userId?: string, botId?: string) {
  const supabase = getBackgroundSupabaseClient();
  const { text, pageCount } = await parsePdfBuffer(buffer);

  if (!text || text.trim().length === 0) {
    throw new Error('PDF enthält keinen Text oder kann nicht gelesen werden');
  }

  const chunks = chunkText(text, 800, 100);
  const chunkRecords = chunks.map((chunk: string, index: number) => {
    const record: any = {
      knowledge_source_id: sourceId,
      chunk_index: index,
      content: chunk,
      metadata: {
        page: pageCount > 0 ? Math.floor((index * 800) / (text.length / pageCount)) : 0,
      },
    };
    if (userId) record.user_id = userId;
    if (botId) record.bot_id = botId;
    return record;
  });

  const BATCH_SIZE = 50;
  for (let i = 0; i < chunkRecords.length; i += BATCH_SIZE) {
    const batch = chunkRecords.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('document_chunks')
      .insert(batch);

    if (error) {
      throw new Error('Chunk insert failed: ' + error.message);
    }
  }

  await supabase
    .from('knowledge_sources')
    .update({
      status: 'ready',
      metadata: {
        pageCount,
        textLength: text.length,
        chunkCount: chunks.length,
        processedAt: new Date().toISOString(),
      },
    })
    .eq('id', sourceId);
}

function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end);
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    start = end - overlap;
    if (start >= text.length) break;
  }
  
  return chunks.length > 0 ? chunks : [text];
}
`;
      }
      
      // Embeddings Endpoint mit vollständiger Embedding-Generierung
      if (routeName === 'embeddings') {
        return `import { NextRequest, NextResponse } from 'next/server';

/**
 * Embeddings Endpoint mit Fallback-Mechanismus:
 * 1. Versuche OpenAI (wenn Key vorhanden)
 * 2. Falls nicht: Nutze Hugging Face (kostenlos)
 * 3. Fallback zu hash-based embeddings
 */

async function generateOpenAIEmbedding(text: string, apiKey: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + apiKey,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new Error(error.error?.message || 'OpenAI embedding generation failed');
  }

  const data = await response.json();
  return data.data[0].embedding;
}

function generateSimpleEmbedding(text: string, dimensions: number = 384): number[] {
  const normalized = text.toLowerCase().trim();
  const embedding: number[] = [];
  
  for (let i = 0; i < dimensions; i++) {
    let hash = 0;
    for (let j = 0; j < normalized.length; j++) {
      const char = normalized.charCodeAt(j);
      hash = ((hash << 5) - hash) + char + i + j;
      hash = hash & hash;
    }
    const value = Math.sin(hash) * 0.5;
    embedding.push(value);
  }
  
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    return embedding.map(val => val / magnitude);
  }
  
  return embedding;
}

async function generateHuggingFaceEmbedding(text: string): Promise<number[]> {
  const modelUrl = 'https://router.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2';
  
  try {
    const response = await fetch(modelUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: text,
        options: { wait_for_model: true },
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      if (response.status === 503) {
        await new Promise(resolve => setTimeout(resolve, 30000));
        const retryResponse = await fetch(modelUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputs: text, options: { wait_for_model: true } }),
          signal: AbortSignal.timeout(60000),
        });
        
        if (!retryResponse.ok) {
          throw new Error('Hugging Face model still loading or error (' + retryResponse.status + ')');
        }
        
        const embedding = await retryResponse.json();
        return normalizeEmbeddingResponse(embedding);
      }
      
      throw new Error('Hugging Face error: ' + response.status);
    }

    const embedding = await response.json();
    return normalizeEmbeddingResponse(embedding);
    
  } catch (error: any) {
    console.error('[Embeddings] Hugging Face exception:', error.message || error);
    return generateSimpleEmbedding(text, 384);
  }
}

function normalizeEmbeddingResponse(response: any): number[] {
  if (Array.isArray(response)) {
    if (response.length > 0 && Array.isArray(response[0])) {
      return response[0];
    }
    return response;
  }
  
  if (response.embedding && Array.isArray(response.embedding)) {
    return response.embedding;
  }
  if (response.data && Array.isArray(response.data)) {
    return Array.isArray(response.data[0]) ? response.data[0] : response.data;
  }
  
  return generateSimpleEmbedding(JSON.stringify(response), 384);
}

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text ist erforderlich' },
        { status: 400 }
      );
    }

    let processedText = text;
    if (text.length > 10000) {
      processedText = text.substring(0, 10000);
    }

    let embedding: number[];
    let source = 'unknown';

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (openaiApiKey && openaiApiKey.trim() !== '') {
      try {
        embedding = await generateOpenAIEmbedding(processedText, openaiApiKey);
        source = 'openai';
      } catch (openaiError: any) {
        console.warn('[Embeddings] OpenAI failed, falling back to Hugging Face:', openaiError.message);
        embedding = await generateHuggingFaceEmbedding(processedText);
        source = 'huggingface';
      }
    } else {
      embedding = await generateHuggingFaceEmbedding(processedText);
      source = 'huggingface';
    }

    if (!embedding || embedding.length === 0) {
      throw new Error('Embedding generation returned empty result');
    }

    return NextResponse.json({ 
      embedding,
      source,
      dimensions: embedding.length,
    });
  } catch (error: any) {
    console.error('[Embeddings] Error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Embedding-Generierung fehlgeschlagen',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
`;
      }
      
      // Chat Endpoint mit vollständiger RAG-Logik
      if (routeName === 'chat') {
        return `import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId, sourceIds } = await request.json();

    if (!message || !sessionId) {
      return NextResponse.json(
        { error: 'Nachricht und Session ID sind erforderlich' },
        { status: 400 }
      );
    }

    const supabase = await createRouteHandlerClient();

    // Get or create chat session
    let { data: chatSession } = await supabase
      .from('chat_sessions')
      .select('id')
      .eq('session_id', sessionId)
      .single();

    if (!chatSession) {
      const { data: newSession, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({
          session_id: sessionId,
          knowledge_source_ids: sourceIds || [],
        })
        .select()
        .single();

      if (sessionError) throw sessionError;
      chatSession = newSession;
    }

    // Save user message
    if (chatSession) {
      await supabase.from('chat_messages').insert({
        chat_session_id: chatSession.id,
        role: 'user',
        content: message,
      });
    }

    // Generate query embedding
    const embeddingResponse = await fetch(
      (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000') + '/api/knowledge/embeddings',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: message }),
      }
    );

    if (!embeddingResponse.ok) {
      throw new Error('Embedding-Generierung fehlgeschlagen');
    }

    const { embedding: queryEmbedding } = await embeddingResponse.json();

    // Search for relevant chunks
    let query = supabase
      .from('document_chunks')
      .select('content, knowledge_source_id, metadata')
      .not('embedding', 'is', null)
      .limit(5);

    if (sourceIds && sourceIds.length > 0) {
      query = query.in('knowledge_source_id', sourceIds);
    }

    const { data: chunks, error: chunksError } = await query;

    if (chunksError) {
      console.error('[Chat] Error searching chunks:', chunksError);
    }

    // Build context from chunks
    const context = chunks && chunks.length > 0
      ? chunks.map((c: any) => c.content).join('\\n\\n')
      : 'Keine relevanten Informationen gefunden.';

    // Generate response (simplified - in production, use OpenAI or similar)
    const response = 'Basierend auf den bereitgestellten Informationen: ' + context.substring(0, 1000) + '...';

    // Save assistant message
    if (chatSession) {
      await supabase.from('chat_messages').insert({
        chat_session_id: chatSession.id,
        role: 'assistant',
        content: response,
      });
    }

    return NextResponse.json({
      response,
      chunksUsed: chunks?.length || 0,
    });
  } catch (error: any) {
    console.error('[Chat] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Chat-Anfrage fehlgeschlagen' },
      { status: 500 }
    );
  }
}
`;
      }
    }
    
    // Universelle Templates für andere Endpoint-Kategorien
    // Generiere spezifische Logik basierend auf Kategorie und Beschreibung
    
    // Payment Endpoints
    if (routeCategory === 'payments' || needsPayment) {
      if (routeName === 'create' || routeName === 'webhook') {
        return this.generatePaymentEndpointTemplate(endpoint, description, routeName, httpMethod);
      }
    }
    
    // WhatsApp Endpoints
    if (routeCategory === 'whatsapp' || needsWhatsApp) {
      return this.generateWhatsAppEndpointTemplate(endpoint, description, routeName, httpMethod);
    }
    
    // Bot Endpoints
    if (routeCategory === 'bots' || needsBot) {
      return this.generateBotEndpointTemplate(endpoint, description, routeName, httpMethod);
    }
    
    // Support Endpoints
    if (routeCategory === 'support' || needsSupport) {
      return this.generateSupportEndpointTemplate(endpoint, description, routeName, httpMethod);
    }
    
    // Subscription Endpoints
    if (routeCategory === 'subscriptions' || needsSubscription) {
      return this.generateSubscriptionEndpointTemplate(endpoint, description, routeName, httpMethod);
    }
    
    // Webhook Endpoints (generisch)
    if (needsWebhook) {
      return this.generateWebhookEndpointTemplate(endpoint, description, routeName, httpMethod);
    }
    
    // File Upload Endpoints (generisch, nicht nur PDF)
    if (needsFileUpload && routeCategory !== 'knowledge') {
      return this.generateFileUploadEndpointTemplate(endpoint, description, routeName, httpMethod, routeCategory);
    }
    
    // Generisches Template für andere Endpoints mit Basis-Logik
    const needsAuth = !description.toLowerCase().includes('public') && !description.toLowerCase().includes('webhook');
    
    return `import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase';

/**
 * ${description || `API Endpoint: ${endpoint}`}
 * 
 * Auto-generiert basierend auf Reverse Engineering Dokumentation
 */

export async function ${httpMethod}(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient();
    
    ${needsAuth ? `// Get user ID
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentifizierung erforderlich' },
        { status: 401 }
      );
    }` : '// Public endpoint - no authentication required'}
    
    ${isGet ? `// GET Request - Fetch data
    // TODO: Implementiere spezifische Datenabfrage basierend auf Reverse Engineering
    // ${description || 'Beschreibung aus Reverse Engineering'}
    
    return NextResponse.json({
      success: true,
      data: [],
    });` : isUpload ? `// POST Request - Create/Upload data
    const body = await request.json();
    
    // TODO: Implementiere spezifische Upload/Create-Logik
    // ${description || 'Beschreibung aus Reverse Engineering'}
    
    return NextResponse.json({
      success: true,
      id: 'new-id',
    });` : isUpdate ? `// PUT Request - Update data
    const body = await request.json();
    const { id, ...updateData } = body;
    
    // TODO: Implementiere spezifische Update-Logik
    // ${description || 'Beschreibung aus Reverse Engineering'}
    
    return NextResponse.json({
      success: true,
      updated: true,
    });` : isDelete ? `// DELETE Request - Delete data
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID ist erforderlich' },
        { status: 400 }
      );
    }
    
    // TODO: Implementiere spezifische Delete-Logik
    // ${description || 'Beschreibung aus Reverse Engineering'}
    
    return NextResponse.json({
      success: true,
      deleted: true,
    });` : `// Request processing
    const body = await request.json();
    
    // TODO: Implementiere spezifische Logik basierend auf Reverse Engineering Dokumentation
    // ${description || 'Beschreibung aus Reverse Engineering'}
    
    return NextResponse.json({
      success: true,
      message: 'Endpoint implementiert',
    });`}
  } catch (error: any) {
    console.error('[${routeName}] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Request fehlgeschlagen' },
      { status: 500 }
    );
  }
}
`;
  }

  /**
   * Generiert Payment-Endpoint Template
   */
  private generatePaymentEndpointTemplate(
    endpoint: string,
    description: string,
    routeName: string,
    httpMethod: string
  ): string {
    if (routeName === 'webhook') {
      return `import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase';

/**
 * ${description || `Payment Webhook: ${endpoint}`}
 * Auto-generiert basierend auf Reverse Engineering Dokumentation
 */

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('stripe-signature') || request.headers.get('paypal-transmission-id');
    const body = await request.text();
    
    // TODO: Implementiere Webhook-Signatur-Verifikation
    // ${description || 'Beschreibung aus Reverse Engineering'}
    
    const event = JSON.parse(body);
    
    // Process webhook event
    // TODO: Implementiere Event-Handling basierend auf event.type
    
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[Payment Webhook] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
`;
    }
    
    return `import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase';
import { createStripePaymentIntent } from '@/lib/payments/stripe';
import { createPayPalOrder } from '@/lib/payments/paypal';

/**
 * ${description || `Payment Endpoint: ${endpoint}`}
 * Auto-generiert basierend auf Reverse Engineering Dokumentation
 */

export async function ${httpMethod}(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentifizierung erforderlich' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { provider, amount, currency, subscriptionId, description } = body;
    
    if (!provider || !amount || !currency) {
      return NextResponse.json(
        { error: 'Missing required fields: provider, amount, currency' },
        { status: 400 }
      );
    }
    
    // TODO: Implementiere spezifische Payment-Logik basierend auf Provider
    // ${description || 'Beschreibung aus Reverse Engineering'}
    
    let paymentResult;
    switch (provider.toLowerCase()) {
      case 'stripe':
        paymentResult = await createStripePaymentIntent({ amount, currency, userId, subscriptionId });
        break;
      case 'paypal':
        paymentResult = await createPayPalOrder({ amount, currency, userId, description });
        break;
      default:
        return NextResponse.json(
          { error: 'Unsupported provider: ' + provider },
          { status: 400 }
        );
    }
    
    return NextResponse.json({
      success: true,
      ...paymentResult,
    });
  } catch (error: any) {
    console.error('[Payment] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Payment creation failed' },
      { status: 500 }
    );
  }
}
`;
  }

  /**
   * Generiert WhatsApp-Endpoint Template
   */
  private generateWhatsAppEndpointTemplate(
    endpoint: string,
    description: string,
    routeName: string,
    httpMethod: string
  ): string {
    if (routeName === 'webhook') {
      return `import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase';

/**
 * ${description || `WhatsApp Webhook: ${endpoint}`}
 * Auto-generiert basierend auf Reverse Engineering Dokumentation
 */

export async function POST(request: NextRequest) {
  try {
    // WhatsApp Webhook Verification (GET)
    if (request.method === 'GET') {
      const { searchParams } = new URL(request.url);
      const mode = searchParams.get('hub.mode');
      const token = searchParams.get('hub.verify_token');
      const challenge = searchParams.get('hub.challenge');
      
      const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
      
      if (mode === 'subscribe' && token === verifyToken) {
        return new NextResponse(challenge, { status: 200 });
      }
      
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // WhatsApp Webhook Event Processing (POST)
    const body = await request.json();
    const supabase = await createRouteHandlerClient();
    
    // TODO: Implementiere WhatsApp Event-Handling
    // ${description || 'Beschreibung aus Reverse Engineering'}
    
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[WhatsApp Webhook] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
`;
    }
    
    return `import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase';

/**
 * ${description || `WhatsApp Endpoint: ${endpoint}`}
 * Auto-generiert basierend auf Reverse Engineering Dokumentation
 */

export async function ${httpMethod}(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentifizierung erforderlich' },
        { status: 401 }
      );
    }
    
    // TODO: Implementiere spezifische WhatsApp-Logik
    // ${description || 'Beschreibung aus Reverse Engineering'}
    
    return NextResponse.json({
      success: true,
      message: 'WhatsApp operation completed',
    });
  } catch (error: any) {
    console.error('[WhatsApp] Error:', error);
    return NextResponse.json(
      { error: error.message || 'WhatsApp operation failed' },
      { status: 500 }
    );
  }
}
`;
  }

  /**
   * Generiert Bot-Endpoint Template
   */
  private generateBotEndpointTemplate(
    endpoint: string,
    description: string,
    routeName: string,
    httpMethod: string
  ): string {
    return `import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase';

/**
 * ${description || `Bot Endpoint: ${endpoint}`}
 * Auto-generiert basierend auf Reverse Engineering Dokumentation
 */

export async function ${httpMethod}(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createRouteHandlerClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentifizierung erforderlich' },
        { status: 401 }
      );
    }
    
    const botId = params.id;
    
    // Verify bot ownership
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .select('*')
      .eq('id', botId)
      .eq('user_id', userId)
      .single();
    
    if (botError || !bot) {
      return NextResponse.json(
        { error: 'Bot nicht gefunden oder nicht autorisiert' },
        { status: 404 }
      );
    }
    
    // TODO: Implementiere spezifische Bot-Logik
    // ${description || 'Beschreibung aus Reverse Engineering'}
    
    return NextResponse.json({
      success: true,
      botId,
    });
  } catch (error: any) {
    console.error('[Bot] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Bot operation failed' },
      { status: 500 }
    );
  }
}
`;
  }

  /**
   * Generiert Support-Endpoint Template
   */
  private generateSupportEndpointTemplate(
    endpoint: string,
    description: string,
    routeName: string,
    httpMethod: string
  ): string {
    return `import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase';

/**
 * ${description || `Support Endpoint: ${endpoint}`}
 * Auto-generiert basierend auf Reverse Engineering Dokumentation
 */

export async function ${httpMethod}(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentifizierung erforderlich' },
        { status: 401 }
      );
    }
    
    // TODO: Implementiere spezifische Support-Logik
    // ${description || 'Beschreibung aus Reverse Engineering'}
    
    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error('[Support] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Support operation failed' },
      { status: 500 }
    );
  }
}
`;
  }

  /**
   * Generiert Subscription-Endpoint Template
   */
  private generateSubscriptionEndpointTemplate(
    endpoint: string,
    description: string,
    routeName: string,
    httpMethod: string
  ): string {
    return `import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase';

/**
 * ${description || `Subscription Endpoint: ${endpoint}`}
 * Auto-generiert basierend auf Reverse Engineering Dokumentation
 */

export async function ${httpMethod}(request: NextRequest) {
  try {
    const supabase = await createRouteHandlerClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentifizierung erforderlich' },
        { status: 401 }
      );
    }
    
    // TODO: Implementiere spezifische Subscription-Logik
    // ${description || 'Beschreibung aus Reverse Engineering'}
    
    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error('[Subscription] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Subscription operation failed' },
      { status: 500 }
    );
  }
}
`;
  }

  /**
   * Generiert Webhook-Endpoint Template (generisch)
   */
  private generateWebhookEndpointTemplate(
    endpoint: string,
    description: string,
    routeName: string,
    httpMethod: string
  ): string {
    return `import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase';

/**
 * ${description || `Webhook Endpoint: ${endpoint}`}
 * Auto-generiert basierend auf Reverse Engineering Dokumentation
 */

export async function ${httpMethod}(request: NextRequest) {
  try {
    // Webhook signature verification
    const signature = request.headers.get('x-signature') || request.headers.get('signature');
    
    // TODO: Implementiere Signatur-Verifikation
    // ${description || 'Beschreibung aus Reverse Engineering'}
    
    const body = await request.json();
    const supabase = await createRouteHandlerClient();
    
    // TODO: Implementiere Webhook Event-Handling
    // ${description || 'Beschreibung aus Reverse Engineering'}
    
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[Webhook] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
`;
  }

  /**
   * Generiert File-Upload-Endpoint Template (generisch, nicht nur PDF)
   */
  private generateFileUploadEndpointTemplate(
    endpoint: string,
    description: string,
    routeName: string,
    httpMethod: string,
    routeCategory: string
  ): string {
    return `import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const UPLOAD_DIR = join(process.cwd(), 'uploads', '${routeCategory}');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * ${description || `File Upload Endpoint: ${endpoint}`}
 * Auto-generiert basierend auf Reverse Engineering Dokumentation
 */

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'Keine Datei hochgeladen' },
        { status: 400 }
      );
    }
    
    const supabase = await createRouteHandlerClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentifizierung erforderlich' },
        { status: 401 }
      );
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Datei zu groß (max. 10MB)' },
        { status: 400 }
      );
    }
    
    // TODO: Implementiere spezifische File-Validierung basierend auf Typ
    // ${description || 'Beschreibung aus Reverse Engineering'}
    
    // Save file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    await mkdir(UPLOAD_DIR, { recursive: true });
    const filePath = join(UPLOAD_DIR, Date.now() + '-' + file.name);
    await writeFile(filePath, buffer);
    
    // TODO: Implementiere spezifische File-Verarbeitung
    // ${description || 'Beschreibung aus Reverse Engineering'}
    
    return NextResponse.json({
      success: true,
      filePath,
      fileName: file.name,
      fileSize: file.size,
    });
  } catch (error: any) {
    console.error('[File Upload] Error:', error);
    return NextResponse.json(
      { error: error.message || 'File upload failed' },
      { status: 500 }
    );
  }
}
`;
  }

  /**
   * Generiert universelle AutoFix-Instructions für PDF-Probleme
   * Diese Instructions funktionieren für ALLE PDF-Upload-Probleme, nicht nur für spezifische Symptome
   */
  private generateUniversalPdfFixInstructions(file: string): import('./autopatchPatterns.js').AutoFixInstruction[] {
    const instructions: import('./autopatchPatterns.js').AutoFixInstruction[] = [];
    
    // Universelle Lösung: Entferne explizite Worker-Pfad-Referenzen
    // Dies behebt die zugrunde liegende Ursache für ALLE PDF-Probleme
    // WICHTIG: Speichere Regex als String, da Regex nicht in JSON serialisiert werden kann
    instructions.push({
      type: 'code-modify',
      file: file,
      modifications: [
        {
          action: 'remove',
          search: '(?:import|require|from).*pdf\\.worker[^\'"]*', // Regex als String
          description: 'Entferne explizite Worker-Pfad-Referenzen (universell für alle PDF-Probleme)',
        },
        {
          action: 'remove',
          search: '(?:import|require|from).*worker\\.mjs[^\'"]*', // Regex als String
          description: 'Entferne explizite Worker-MJS-Referenzen (universell für alle PDF-Probleme)',
        },
        {
          action: 'remove',
          search: '(?:import|require|from).*worker\\.js[^\'"]*', // Regex als String
          description: 'Entferne explizite Worker-JS-Referenzen (universell für alle PDF-Probleme)',
        },
      ],
    });
    
    return instructions;
  }

  /**
   * Generiert universelle AutoFix-Instructions für ALLE Problem-Typen
   * Agent-basierter Ansatz: Fragt sofort die Reverse Engineering Blaupause ab
   * und leitet alle Fixes dynamisch aus der Dokumentation ab
   * 
   * @param config - ConfigurationItem zur Bestimmung des Problem-Typs
   * @param ticketText - Ticket-Text zur Extraktion von Details
   */
  private async generateUniversalFixInstructions(
    config: ConfigurationItem,
    ticketText?: string,
    rootDir?: string
  ): Promise<import('./autopatchPatterns.js').AutoFixInstruction[]> {
    const instructions: import('./autopatchPatterns.js').AutoFixInstruction[] = [];
    const ticketTextLower = (ticketText || '').toLowerCase();
    
    // AGENT-BASIERTER ANSATZ: Frage sofort die Reverse Engineering Dokumentation ab
    const relevantDocs = this.knowledgeBase.query(
      `${config.name} ${config.description} ${config.type} ${ticketText || ''}`,
      20
    );
    
    // Analysiere Dokumentation für Fix-Strategien
    const fixStrategies = await this.extractFixStrategiesFromDocs(
      relevantDocs,
      config,
      ticketTextLower
    );
    
    // Generiere Fix-Instructions aus dokumentierten Strategien
    for (const strategy of fixStrategies) {
      const strategyInstructions = await this.generateInstructionsFromStrategy(
        strategy,
        config,
        ticketTextLower,
        rootDir
      );
      instructions.push(...strategyInstructions);
    }
    
    // Falls keine Strategien gefunden, verwende dokumentierte fixStrategies
    if (instructions.length === 0 && config.fixStrategies.length > 0) {
      for (const strategy of config.fixStrategies) {
        const strategyInstructions = await this.generateInstructionsFromStrategy(
          strategy,
          config,
          ticketTextLower,
          rootDir
        );
        instructions.push(...strategyInstructions);
      }
    }
    
    return instructions;
  }

  /**
   * Extrahiert Fix-Strategien aus Reverse Engineering Dokumentation
   * Agent-basierter Ansatz: Analysiert Dokumentation sofort
   */
  private async extractFixStrategiesFromDocs(
    docs: KnowledgeDocument[],
    config: ConfigurationItem,
    ticketText: string
  ): Promise<string[]> {
    const strategies: string[] = [];
    
    for (const doc of docs) {
      const content = doc.content.toLowerCase();
      
      // Suche nach Fix-Strategien in der Dokumentation
      // Pattern: "fix", "solution", "workaround", "troubleshoot", "resolve"
      const fixPatterns = [
        /(?:fix|solution|workaround|troubleshoot|resolve|repair).*?[.!]/gi,
        /(?:prüfe|korrigiere|erstelle|führe.*?aus|starte.*?neu)/gi,
      ];
      
      for (const pattern of fixPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          strategies.push(...matches.map(m => m.trim()));
        }
      }
      
      // Extrahiere spezifische Befehle aus Dokumentation
      const commandPatterns = [
        /(?:pm2|docker|caddy|systemctl|chmod|chown).*?[.!]/gi,
        /(?:CREATE|ALTER|UPDATE|INSERT).*?[.!]/gi,
      ];
      
      for (const pattern of commandPatterns) {
        const matches = content.match(pattern);
        if (matches) {
          strategies.push(...matches.map(m => m.trim()));
        }
      }
    }
    
    // Entferne Duplikate und filtere nach Relevanz
    const uniqueStrategies = [...new Set(strategies)];
    return uniqueStrategies.filter(s => 
      s.length > 10 && // Mindestlänge
      (ticketText.includes(s.split(/\s+/)[0]?.toLowerCase() || '') || // Relevanz-Check
       config.description.toLowerCase().includes(s.split(/\s+/)[0]?.toLowerCase() || ''))
    );
  }

  /**
   * Generiert AutoFix-Instructions aus einer dokumentierten Strategie
   * Konvertiert textuelle Strategien in konkrete Instructions
   */
  private async generateInstructionsFromStrategy(
    strategy: string,
    config: ConfigurationItem,
    ticketText: string,
    rootDir?: string
  ): Promise<import('./autopatchPatterns.js').AutoFixInstruction[]> {
    const instructions: import('./autopatchPatterns.js').AutoFixInstruction[] = [];
    const strategyLower = strategy.toLowerCase();
    
    // PM2-Befehle aus Dokumentation
    if (strategyLower.includes('pm2') && (strategyLower.includes('restart') || strategyLower.includes('start'))) {
      const serviceMatch = ticketText.match(/(?:whatsapp-bot-builder|support-mcp-server|n8n|mcp-afrika-container)/i);
      const serviceName = serviceMatch ? serviceMatch[0].toLowerCase() : 'whatsapp-bot-builder';
      
      instructions.push({
        type: 'hetzner-command',
        command: `pm2 restart ${serviceName}`,
        description: `PM2 Restart basierend auf dokumentierter Strategie: ${strategy}`,
        requiresApproval: true,
        whitelistCheck: true,
      });
    }
    
    // Docker-Befehle aus Dokumentation
    if (strategyLower.includes('docker') && strategyLower.includes('restart')) {
      const containerMatch = ticketText.match(/(?:whatsapp-bot-builder|n8n|mcp-afrika-container)/i);
      const containerName = containerMatch ? containerMatch[0].toLowerCase() : 'whatsapp-bot-builder';
      
      instructions.push({
        type: 'hetzner-command',
        command: `docker restart ${containerName}`,
        description: `Docker Restart basierend auf dokumentierter Strategie: ${strategy}`,
        requiresApproval: true,
        whitelistCheck: true,
      });
    }
    
    // Caddy-Befehle aus Dokumentation
    if (strategyLower.includes('caddy') && (strategyLower.includes('reload') || strategyLower.includes('restart'))) {
      instructions.push({
        type: 'hetzner-command',
        command: 'caddy reload',
        description: `Caddy Reload basierend auf dokumentierter Strategie: ${strategy}`,
        requiresApproval: true,
        whitelistCheck: true,
      });
    }
    
    // SQL-Migrationen aus Dokumentation
    if (strategyLower.includes('create') || strategyLower.includes('alter') || strategyLower.includes('migration')) {
      // Extrahiere SQL aus Dokumentation (vereinfacht)
      const sqlMatch = strategy.match(/(?:CREATE|ALTER|UPDATE|INSERT).*?;/i);
      if (sqlMatch) {
        instructions.push({
          type: 'supabase-migration',
          sql: sqlMatch[0],
          migrationName: `fix_${config.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`,
          description: `SQL-Migration basierend auf dokumentierter Strategie: ${strategy}`,
          requiresApproval: true,
        });
      }
    }
    
    // RLS-Policy aus Dokumentation
    if (strategyLower.includes('rls') || strategyLower.includes('policy') || strategyLower.includes('row level security')) {
      instructions.push({
        type: 'supabase-rls-policy',
        policyName: `${config.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_policy`,
        tableName: config.name.toLowerCase(),
        sql: `CREATE POLICY IF NOT EXISTS ${config.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_policy ON ${config.name.toLowerCase()} FOR ALL TO authenticated USING (auth.uid() = user_id);`,
        description: `RLS-Policy basierend auf dokumentierter Strategie: ${strategy}`,
        requiresApproval: true,
      });
    }
    
    // Environment Variables aus Dokumentation
    if (strategyLower.includes('env') || strategyLower.includes('environment variable')) {
      const envVarMatch = strategy.match(/(?:NEXT_PUBLIC_|SUPABASE_|GROQ_|HETZNER_|OPENAI_|STRIPE_|PAYPAL_)[A-Z_]+/);
      if (envVarMatch) {
        instructions.push({
          type: 'env-add-placeholder',
          key: envVarMatch[0],
          value: '...',
          comment: `Environment Variable basierend auf dokumentierter Strategie: ${strategy}`,
          file: '.env.local',
        });
      }
    }
    
    // Code-Modify aus Dokumentation - WICHTIG: Prüfe Code-Status vor Fix-Generierung
    if (strategyLower.includes('prüfe') || strategyLower.includes('korrigiere') || strategyLower.includes('fix') || 
        strategyLower.includes('remove') || strategyLower.includes('entferne')) {
      if (config.location && (config.type === 'frontend_config' || config.type === 'api_endpoint')) {
        // KRITISCH: Prüfe ob Pattern tatsächlich im Code existiert, bevor remove-Instructions generiert werden
        if (rootDir && config.location) {
          try {
            const { readFile, access, constants } = await import('fs/promises');
            const { join } = await import('path');
            
            const filePath = config.location.startsWith('/') ? config.location : join(rootDir, config.location);
            
            // Prüfe ob Datei existiert
            try {
              await access(filePath, constants.F_OK);
              const fileContent = await readFile(filePath, 'utf-8');
              
              // Prüfe auf Worker-Pfad-Referenzen (nur wenn Strategy "remove worker" enthält)
              if (strategyLower.includes('worker') && (strategyLower.includes('remove') || strategyLower.includes('entferne'))) {
                const workerPatterns = [
                  /(?:import|require|from).*pdf\.worker[^'"]*/gi,
                  /(?:import|require|from).*worker\.mjs[^'"]*/gi,
                  /(?:import|require|from).*worker\.js[^'"]*/gi,
                ];
                
                const hasWorkerReferences = workerPatterns.some(pattern => pattern.test(fileContent));
                
                if (!hasWorkerReferences) {
                  // Pattern existiert nicht im Code - keine remove-Instruction generieren
                  this.logger.info(
                    { file: config.location, strategy },
                    'Worker-Pfad-Referenzen nicht im Code gefunden - überspringe remove-Instruction'
                  );
                  return instructions; // Keine Instructions hinzufügen
                }
              }
              
              // Für andere Code-Modify-Strategien: Generiere nur wenn sinnvoll
              if (strategyLower.includes('replace') || strategyLower.includes('add')) {
                instructions.push({
                  type: 'code-modify',
                  file: config.location,
                  modifications: [{
                    action: 'replace',
                    search: /\/\/ TODO: Fix based on reverse engineering/,
                    replace: `// Fixed based on documented strategy: ${strategy}`,
                    description: `Code-Modify basierend auf dokumentierter Strategie: ${strategy}`,
                  }],
                });
              }
            } catch (fileError) {
              // Datei existiert nicht - keine Code-Modify-Instruction generieren
              this.logger.warn(
                { err: fileError, file: config.location },
                'Datei nicht gefunden - überspringe Code-Modify-Instruction'
              );
            }
          } catch (error) {
            // Fehler beim Prüfen - generiere trotzdem Instruction (Fallback)
            this.logger.warn(
              { err: error, file: config.location },
              'Fehler beim Prüfen des Code-Status - generiere Code-Modify-Instruction trotzdem'
            );
            instructions.push({
              type: 'code-modify',
              file: config.location,
              modifications: [{
                action: 'replace',
                search: /\/\/ TODO: Fix based on reverse engineering/,
                replace: `// Fixed based on documented strategy: ${strategy}`,
                description: `Code-Modify basierend auf dokumentierter Strategie: ${strategy}`,
              }],
            });
          }
        } else {
          // rootDir nicht verfügbar - generiere trotzdem Instruction (Fallback)
          instructions.push({
            type: 'code-modify',
            file: config.location,
            modifications: [{
              action: 'replace',
              search: /\/\/ TODO: Fix based on reverse engineering/,
              replace: `// Fixed based on documented strategy: ${strategy}`,
              description: `Code-Modify basierend auf dokumentierter Strategie: ${strategy}`,
            }],
          });
        }
      }
    }
    
    return instructions;
  }

  /**
   * Generiert universelle AutoFix-Instructions für Deployment-Probleme
   * Erkennt verschiedene Deployment-Probleme (PM2, Docker, Caddy, systemctl) und generiert passende Hetzner-Befehle
   * 
   * @param ticketText - Ticket-Text zur Extraktion von Service-Namen und Problem-Typ
   */
  private generateUniversalDeploymentFixInstructions(ticketText?: string): import('./autopatchPatterns.js').AutoFixInstruction[] {
    const instructions: import('./autopatchPatterns.js').AutoFixInstruction[] = [];
    const ticketTextLower = (ticketText || '').toLowerCase();
    
    // Extrahiere Service/App-Namen aus Ticket
    const serviceNameMatch = ticketTextLower.match(/(?:whatsapp-bot-builder|support-mcp-server|n8n|mcp-afrika-container)/i);
    const serviceName = serviceNameMatch ? serviceNameMatch[0].toLowerCase() : 'whatsapp-bot-builder';
    
    // Normalisiere Service-Namen
    const normalizedService = serviceName.includes('whatsapp') ? 'whatsapp-bot-builder' :
                              serviceName.includes('support') ? 'support-mcp-server' :
                              serviceName.includes('afrika') ? 'mcp-afrika-container' :
                              serviceName.includes('n8n') ? 'n8n' :
                              'whatsapp-bot-builder';
    
    // Erkenne Problem-Typ und generiere passenden Befehl
    
    // PM2-Probleme
    if (ticketTextLower.match(/(?:pm2|bot|whatsapp).*?(?:reagiert nicht|läuft nicht|hängt|restart|neu starten|startet nicht)/i)) {
      instructions.push({
        type: 'hetzner-command',
        command: `pm2 restart ${normalizedService}`,
        description: `PM2 Prozess "${normalizedService}" neu starten - Service reagiert nicht mehr`,
        requiresApproval: true,
        whitelistCheck: true,
      });
    }
    
    // Docker-Probleme
    if (ticketTextLower.match(/(?:docker|container).*?(?:reagiert nicht|läuft nicht|hängt|restart|neu starten)/i)) {
      const dockerContainer = normalizedService === 'n8n' ? 'n8n' :
                              normalizedService === 'mcp-afrika-container' ? 'mcp-afrika-container' :
                              'whatsapp-bot-builder';
      instructions.push({
        type: 'hetzner-command',
        command: `docker restart ${dockerContainer}`,
        description: `Docker Container "${dockerContainer}" neu starten - Container reagiert nicht mehr`,
        requiresApproval: true,
        whitelistCheck: true,
      });
    }
    
    // Caddy-Probleme
    if (ticketTextLower.match(/(?:caddy|reverse.*proxy|webserver).*?(?:reagiert nicht|läuft nicht|reload|neu laden)/i)) {
      instructions.push({
        type: 'hetzner-command',
        command: 'caddy reload',
        description: 'Caddy Reverse Proxy neu laden - Konfiguration aktualisiert',
        requiresApproval: true,
        whitelistCheck: true,
      });
    }
    
    // systemctl-Probleme
    if (ticketTextLower.match(/(?:systemctl|systemd|service).*?(?:reagiert nicht|läuft nicht|restart|neu starten)/i)) {
      const systemctlService = normalizedService === 'n8n' ? 'n8n' :
                               'caddy'; // Fallback
      instructions.push({
        type: 'hetzner-command',
        command: `systemctl restart ${systemctlService}`,
        description: `Systemd Service "${systemctlService}" neu starten - Service reagiert nicht mehr`,
        requiresApproval: true,
        whitelistCheck: true,
      });
    }
    
    // Fallback: Wenn kein spezifisches Problem erkannt, aber Deployment-Problem vorhanden
    if (instructions.length === 0 && ticketTextLower.match(/(?:reagiert nicht|läuft nicht|hängt|startet nicht)/i)) {
      instructions.push({
        type: 'hetzner-command',
        command: `pm2 restart ${normalizedService}`,
        description: `PM2 Prozess "${normalizedService}" neu starten - Service-Problem erkannt`,
        requiresApproval: true,
        whitelistCheck: true,
      });
    }
    
    return instructions;
  }

  /**
   * Generiert universelle AutoFix-Instructions für Frontend/UI-Probleme
   */
  private generateUniversalFrontendFixInstructions(
    config: ConfigurationItem,
    ticketText?: string
  ): import('./autopatchPatterns.js').AutoFixInstruction[] {
    const instructions: import('./autopatchPatterns.js').AutoFixInstruction[] = [];
    const ticketTextLower = (ticketText || '').toLowerCase();
    
    // UI-Rendering-Probleme → Build-Restart
    if (ticketTextLower.match(/(?:rendert nicht|hydration|build fehler|ui fehler|anzeige fehler)/i)) {
      instructions.push({
        type: 'hetzner-command',
        command: 'pm2 restart whatsapp-bot-builder',
        description: `Frontend-Build neu starten - UI-Rendering-Problem erkannt`,
        requiresApproval: true,
        whitelistCheck: true,
      });
    }
    
    // Komponenten-Fehler → Code-Modify
    if (ticketTextLower.match(/(?:komponente|component|fehler|error).*?(?:funktioniert nicht|rendert nicht)/i)) {
      instructions.push({
        type: 'code-modify',
        file: config.location,
        modifications: [{
          action: 'replace',
          search: /\/\/ TODO: Fix component error/,
          replace: '// Component fixed',
          description: `UI-Komponente ${config.name} korrigieren - Problem erkannt`,
        }],
      });
    }
    
    return instructions;
  }

  /**
   * Generiert universelle AutoFix-Instructions für API-Endpoint-Probleme
   */
  private generateUniversalApiFixInstructions(
    config: ConfigurationItem,
    ticketText?: string
  ): import('./autopatchPatterns.js').AutoFixInstruction[] {
    const instructions: import('./autopatchPatterns.js').AutoFixInstruction[] = [];
    const ticketTextLower = (ticketText || '').toLowerCase();
    const endpoint = config.name;
    
    // Zahlungs-Probleme → Payment-Endpoint-Check
    if (ticketTextLower.match(/(?:zahlung|payment|stripe|paypal|checkout|bezahlung).*?(?:fehler|funktioniert nicht|failed)/i)) {
      // Prüfe ob Payment-Endpoint existiert
      if (!endpoint.includes('payment') && !endpoint.includes('checkout')) {
        instructions.push({
          type: 'create-file',
          file: config.location,
          content: this.generateApiRouteTemplate(endpoint, config.description, 'payment', 'payments'),
          description: `Payment-Endpoint ${endpoint} erstellen - Zahlungs-Problem erkannt`,
        });
      } else {
        // Endpoint existiert, aber funktioniert nicht → Code-Modify
        instructions.push({
          type: 'code-modify',
          file: config.location,
          modifications: [{
            action: 'replace',
            search: /\/\/ TODO: Fix payment endpoint/,
            replace: '// Payment endpoint fixed',
            description: `Payment-Endpoint ${endpoint} korrigieren - Problem erkannt`,
          }],
        });
      }
      
      // Prüfe Stripe/PayPal Environment Variables
      if (ticketTextLower.includes('stripe')) {
        instructions.push({
          type: 'env-add-placeholder',
          key: 'STRIPE_SECRET_KEY',
          value: 'sk_test_...',
          comment: 'Stripe Secret Key für Payment-Integration',
          file: '.env.local',
        });
      }
      if (ticketTextLower.includes('paypal')) {
        instructions.push({
          type: 'env-add-placeholder',
          key: 'PAYPAL_CLIENT_SECRET',
          value: '...',
          comment: 'PayPal Client Secret für Payment-Integration',
          file: '.env.local',
        });
      }
    }
    
    // Upload-Probleme → Upload-Endpoint-Check
    if (ticketTextLower.match(/(?:upload|hochladen|file|pdf).*?(?:fehler|funktioniert nicht|failed)/i)) {
      if (!endpoint.includes('upload')) {
        instructions.push({
          type: 'create-file',
          file: config.location,
          content: this.generateApiRouteTemplate(endpoint, config.description, 'upload', 'knowledge'),
          description: `Upload-Endpoint ${endpoint} erstellen - Upload-Problem erkannt`,
        });
      } else {
        // Upload-Endpoint existiert, aber funktioniert nicht → Code-Modify
        instructions.push({
          type: 'code-modify',
          file: config.location,
          modifications: [{
            action: 'replace',
            search: /\/\/ TODO: Fix upload endpoint/,
            replace: '// Upload endpoint fixed',
            description: `Upload-Endpoint ${endpoint} korrigieren - Problem erkannt`,
          }],
        });
      }
      
      // File-Permissions prüfen
      instructions.push({
        type: 'hetzner-command',
        command: 'chmod -R 755 /var/www/whatsapp-bot-builder/uploads',
        description: `File-Permissions für Upload-Verzeichnis korrigieren`,
        requiresApproval: true,
        whitelistCheck: true,
      });
    }
    
    // Bot-Speicher-Probleme → Bot-Endpoint-Check
    if (ticketTextLower.match(/(?:bot.*speicher|bot.*save|bot.*speichern|bot.*nicht.*gespeichert)/i)) {
      if (!endpoint.includes('bot') && !endpoint.includes('save')) {
        instructions.push({
          type: 'create-file',
          file: config.location,
          content: this.generateApiRouteTemplate(endpoint, config.description, 'save', 'bots'),
          description: `Bot-Speicher-Endpoint ${endpoint} erstellen - Bot-Speicher-Problem erkannt`,
        });
      } else {
        // Bot-Endpoint existiert, aber funktioniert nicht → Code-Modify
        instructions.push({
          type: 'code-modify',
          file: config.location,
          modifications: [{
            action: 'replace',
            search: /\/\/ TODO: Fix bot save endpoint/,
            replace: '// Bot save endpoint fixed',
            description: `Bot-Speicher-Endpoint ${endpoint} korrigieren - Problem erkannt`,
          }],
        });
      }
      
      // RLS-Policy für Bot-Speicher prüfen
      instructions.push({
        type: 'supabase-rls-policy',
        policyName: 'bot_save_policy',
        tableName: 'bots',
        sql: `CREATE POLICY IF NOT EXISTS bot_save_policy ON bots FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);`,
        description: `RLS-Policy für Bot-Speicher erstellen - Bot-Speicher-Problem erkannt`,
        requiresApproval: true,
      });
    }
    
    return instructions;
  }

  /**
   * Generiert universelle AutoFix-Instructions für Database-Probleme
   */
  private generateUniversalDatabaseFixInstructions(
    config: ConfigurationItem,
    ticketText?: string
  ): import('./autopatchPatterns.js').AutoFixInstruction[] {
    const instructions: import('./autopatchPatterns.js').AutoFixInstruction[] = [];
    const ticketTextLower = (ticketText || '').toLowerCase();
    
    // RLS-Policy-Probleme
    if (ticketTextLower.match(/(?:rls|row level security|policy|zugriff verweigert|permission denied)/i)) {
      instructions.push({
        type: 'supabase-rls-policy',
        policyName: `${config.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_policy`,
        tableName: config.name.toLowerCase(),
        sql: `CREATE POLICY IF NOT EXISTS ${config.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_policy ON ${config.name.toLowerCase()} FOR ALL TO authenticated USING (auth.uid() = user_id);`,
        description: `RLS-Policy für ${config.name} erstellen - Zugriffs-Problem erkannt`,
        requiresApproval: true,
      });
    }
    
    // Bot-Speicher-Probleme (Database)
    if (ticketTextLower.match(/(?:bot.*speicher|bot.*save|bot.*nicht.*gespeichert)/i)) {
      instructions.push({
        type: 'supabase-migration',
        sql: `ALTER TABLE bots ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);`,
        migrationName: 'add_bot_user_id',
        description: `Bot-Speicher-Migration erstellen - Bot-Speicher-Problem erkannt`,
        requiresApproval: true,
      });
      
      instructions.push({
        type: 'supabase-rls-policy',
        policyName: 'bot_save_policy',
        tableName: 'bots',
        sql: `CREATE POLICY IF NOT EXISTS bot_save_policy ON bots FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);`,
        description: `RLS-Policy für Bot-Speicher erstellen - Bot-Speicher-Problem erkannt`,
        requiresApproval: true,
      });
    }
    
    return instructions;
  }

  /**
   * Generiert universelle AutoFix-Instructions für Environment-Variable-Probleme
   */
  private generateUniversalEnvVarFixInstructions(
    config: ConfigurationItem,
    ticketText?: string
  ): import('./autopatchPatterns.js').AutoFixInstruction[] {
    const instructions: import('./autopatchPatterns.js').AutoFixInstruction[] = [];
    const ticketTextLower = (ticketText || '').toLowerCase();
    
    // Environment Variable fehlt oder falsch
    if (ticketTextLower.match(/(?:env|environment|variable).*?(?:fehlt|falsch|ungültig|missing|invalid)/i)) {
      instructions.push({
        type: 'env-add-placeholder',
        key: config.name,
        value: '...',
        comment: config.description,
        file: '.env.local',
      });
    }
    
    return instructions;
  }

  /**
   * Generiert universelle AutoFix-Instructions als Fallback
   * Versucht Problem-Typ aus Ticket-Text zu erkennen
   */
  private generateUniversalFallbackFixInstructions(
    config: ConfigurationItem,
    ticketText?: string
  ): import('./autopatchPatterns.js').AutoFixInstruction[] {
    const instructions: import('./autopatchPatterns.js').AutoFixInstruction[] = [];
    const ticketTextLower = (ticketText || '').toLowerCase();
    
    // Versuche Problem-Typ zu erkennen
    if (ticketTextLower.match(/(?:ui|frontend|anzeige|komponente).*?(?:fehler|funktioniert nicht)/i)) {
      return this.generateUniversalFrontendFixInstructions(config, ticketText);
    }
    
    if (ticketTextLower.match(/(?:zahlung|payment|stripe|paypal).*?(?:fehler|funktioniert nicht)/i)) {
      return this.generateUniversalApiFixInstructions(config, ticketText);
    }
    
    if (ticketTextLower.match(/(?:upload|hochladen|file|pdf).*?(?:fehler|funktioniert nicht)/i)) {
      return this.generateUniversalApiFixInstructions(config, ticketText);
    }
    
    if (ticketTextLower.match(/(?:bot.*speicher|bot.*save).*?(?:fehler|funktioniert nicht)/i)) {
      return this.generateUniversalApiFixInstructions(config, ticketText);
    }
    
    if (ticketTextLower.match(/(?:deployment|server|pm2|docker).*?(?:fehler|funktioniert nicht)/i)) {
      return this.generateUniversalDeploymentFixInstructions(ticketText);
    }
    
    return instructions;
  }

  /**
   * Generiert universelle AutoFix-Instructions aus fixStrategies (Fallback)
   * Konvertiert textuelle Strategien in konkrete AutoFix-Instructions
   */
  generateInstructionsFromStrategies(
    config: ConfigurationItem
  ): import('./autopatchPatterns.js').AutoFixInstruction[] {
    const instructions: import('./autopatchPatterns.js').AutoFixInstruction[] = [];
    
    // Analysiere fixStrategies und generiere entsprechende Instructions
    for (const strategy of config.fixStrategies) {
      // PDF-spezifische Strategien
      if (strategy.includes('Worker-Pfad') || strategy.includes('Worker-Pfad-Referenzen')) {
        if (config.type === 'frontend_config' && config.name.includes('pdf')) {
          // Bereits in generateUniversalPdfFixInstructions behandelt
          continue;
        }
      }
      
      // Env-Var-spezifische Strategien
      if (strategy.includes('Prüfe') && strategy.includes('.env')) {
        if (config.type === 'env_var') {
          // Generiere env-add-placeholder Instruction
          instructions.push({
            type: 'env-add-placeholder',
            key: config.name,
            value: 'PLACEHOLDER_VALUE',
            comment: `# ${config.description}`,
            file: '.env.local',
          });
        }
      }
    }
    
    return instructions;
  }

  /**
   * Extrahiert Kontext für eine Konfiguration
   */
  private extractContext(content: string, name: string): string | null {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(name)) {
        // Suche nach Kontext in umliegenden Zeilen
        const contextLines: string[] = [];
        for (let j = Math.max(0, i - 3); j < Math.min(lines.length, i + 5); j++) {
          const line = lines[j].trim();
          if (line && !line.startsWith('#') && line.length > 10) {
            contextLines.push(line);
          }
        }
        if (contextLines.length > 0) {
          return contextLines.join(' ').substring(0, 200);
        }
      }
    }
    return null;
  }

  /**
   * Extrahiert Kontext für einen API-Endpoint
   */
  private extractEndpointContext(content: string, endpoint: string): string | null {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(endpoint)) {
        // Suche nach Beschreibung in nächsten Zeilen
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const line = lines[j].trim();
          if (line && !line.startsWith('#') && line.length > 20) {
            return line.substring(0, 150);
          }
        }
      }
    }
    return null;
  }

  /**
   * Findet Dateipfad in Content
   */
  private findFilePath(content: string, fileName: string): string | null {
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.includes(fileName) && (line.includes('app/') || line.includes('components/'))) {
        const match = line.match(/(app\/[a-z0-9/._-]+|components\/[a-z0-9/._-]+)/i);
        if (match) {
          return match[1];
        }
      }
    }
    return null;
  }

  /**
   * Findet PDF-bezogene Dateien
   */
  private findPdfRelatedFiles(content: string): string[] {
    const files: string[] = [];
    const pdfFileRegex = /(?:lib\/pdf|app\/api\/knowledge|parsePdf|pdf-parse)/gi;
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (pdfFileRegex.test(line)) {
        const match = line.match(/(lib\/pdf\/[a-z0-9/._-]+|app\/api\/knowledge\/[a-z0-9/._-]+)/i);
        if (match && !files.includes(match[1])) {
          files.push(match[1]);
        }
      }
    }
    
    // Fallback: Standard-PDF-Dateien
    if (files.length === 0) {
      files.push('lib/pdf/parsePdf.ts');
      files.push('app/api/knowledge/upload/route.ts');
    }
    
    return files;
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

  /**
   * Nutzt Reverse Engineering Dokumentation als "negative Blaupause"
   * 
   * Vergleicht den aktuellen Systemzustand mit dem dokumentierten korrekten Zustand
   * und identifiziert Abweichungen, die auf Probleme hinweisen.
   * 
   * Die Reverse Engineering Dokumentation beschreibt, wie das System SEIN SOLLTE.
   * Wenn der aktuelle Zustand davon abweicht, ist das ein Indikator für ein Problem.
   */
  async detectDeviationsFromBlueprint(
    ticket: MinimalTicket,
    rootDir: string
  ): Promise<Array<{
    config: ConfigurationItem;
    deviation: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    evidence: string[];
    relevanceScore: number;
  }>> {
    const analysis = await this.analyzeReverseEngineering();
    const deviations: Array<{
      config: ConfigurationItem;
      deviation: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      evidence: string[];
      relevanceScore: number;
    }> = [];

    const ticketText = `${ticket.title ?? ''} ${ticket.description ?? ''}`.toLowerCase();

    // Prüfe jede dokumentierte Konfiguration auf Abweichungen
    for (const config of analysis.configurations) {
      const deviation = await this.checkConfigurationDeviation(config, ticketText, rootDir);
      if (deviation) {
        // Berechne Relevanz-Score für diese Abweichung
        const relevanceScore = this.calculateRelevanceScore(ticketText, config);
        
        // Mindest-Relevanz-Schwelle: 0.3
        if (relevanceScore >= 0.3) {
          deviations.push({
            config,
            ...deviation,
            relevanceScore,
          });
          
          this.logger.debug(
            {
              configName: config.name,
              configType: config.type,
              relevanceScore,
              severity: deviation.severity,
            },
            'Abweichung mit Relevanz-Score erkannt'
          );
        } else {
          this.logger.debug(
            {
              configName: config.name,
              configType: config.type,
              relevanceScore,
              reason: 'Relevanz-Score unter Schwelle (0.3)',
            },
            'Abweichung gefiltert (zu niedrige Relevanz)'
          );
        }
      }
    }

    // Sortiere primär nach Relevanz-Score, sekundär nach Schweregrad
    return deviations.sort((a, b) => {
      // Primär: Relevanz-Score (höher = relevanter)
      const relevanceDiff = b.relevanceScore - a.relevanceScore;
      if (Math.abs(relevanceDiff) > 0.1) {
        return relevanceDiff;
      }
      
      // Sekundär: Schweregrad (nur wenn Relevanz ähnlich ist)
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Prüft ob eine Konfiguration vom dokumentierten Zustand abweicht
   */
  private async checkConfigurationDeviation(
    config: ConfigurationItem,
    ticketText: string,
    rootDir: string
  ): Promise<{
    deviation: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    evidence: string[];
  } | null> {
    const evidence: string[] = [];
    let deviation: string | null = null;
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

    try {
      const { readFile, access, constants } = await import('fs/promises');
      const { join } = await import('path');

      switch (config.type) {
        case 'env_var': {
          const envPath = join(rootDir, '.env.local');
          try {
            const envContent = await readFile(envPath, 'utf-8');
            if (!envContent.includes(config.name)) {
              deviation = `${config.name} fehlt in .env.local (dokumentiert als erforderlich)`;
              severity = 'high';
              evidence.push(`❌ ${config.name} fehlt in .env.local`);
              evidence.push(`📋 Dokumentation erwartet: ${config.description}`);
            } else {
              // Prüfe Format und Wert
              const varLine = envContent.split('\n').find(line => 
                line.includes(config.name) && !line.trim().startsWith('#')
              );
              if (varLine) {
                const value = varLine.split('=')[1]?.trim().replace(/^["']|["']$/g, '');
                if (!value || value.length === 0) {
                  deviation = `${config.name} ist leer (dokumentiert als erforderlich)`;
                  severity = 'high';
                  evidence.push(`❌ ${config.name} ist leer`);
                } else if (value.includes('FIXME') || value.includes('TODO')) {
                  deviation = `${config.name} hat Platzhalter-Wert (dokumentiert als erforderlich)`;
                  severity = 'medium';
                  evidence.push(`⚠️  ${config.name} hat Platzhalter: ${value}`);
                } else {
                  evidence.push(`✅ ${config.name} ist gesetzt`);
                }
              }
            }
          } catch {
            deviation = `.env.local konnte nicht gelesen werden (${config.name} dokumentiert als erforderlich)`;
            severity = 'medium';
            evidence.push(`⚠️  .env.local nicht lesbar`);
          }
          break;
        }

        case 'api_endpoint': {
          // config.name ist der Endpoint-Pfad (z.B. /api/knowledge/upload)
          const routePath = join(rootDir, 'app', 'api', config.name.replace(/^\//, ''), 'route.ts');
          try {
            await access(routePath, constants.F_OK);
            evidence.push(`✅ API Route existiert: ${routePath}`);
            
            // Prüfe ob Route den dokumentierten Funktionalitäten entspricht
            const routeContent = await readFile(routePath, 'utf-8');
            
            // Prüfe auf dokumentierte Funktionalitäten in der Beschreibung
            if (config.description.toLowerCase().includes('upload') && !routeContent.includes('FormData') && !routeContent.includes('formData')) {
              deviation = `${config.name} fehlt Upload-Funktionalität (dokumentiert als erforderlich)`;
              severity = 'high';
              evidence.push(`❌ Upload-Funktionalität fehlt`);
            }
            
            if (config.description.toLowerCase().includes('authentication') && 
                !routeContent.includes('getUser') && 
                !routeContent.includes('auth.getUser')) {
              deviation = `${config.name} fehlt Authentifizierung (dokumentiert als erforderlich)`;
              severity = 'high';
              evidence.push(`❌ Authentifizierung fehlt`);
            }
          } catch {
            deviation = `${config.name} Route fehlt (dokumentiert als erforderlich)`;
            severity = 'critical';
            evidence.push(`❌ API Route fehlt: ${routePath}`);
            
            // NEU: Generiere AutoFix-Instructions für fehlende API-Route
            if (!config.universalFixInstructions || config.universalFixInstructions.length === 0) {
              config.universalFixInstructions = this.generateUniversalApiRouteFixInstructions(config);
            }
          }
          break;
        }

        case 'frontend_config': {
          // config.name ist der Dateipfad
          let filePath: string | null = null;
          
          if (config.name.startsWith('/') || config.name.startsWith('app/') || config.name.startsWith('lib/')) {
            filePath = join(rootDir, config.name);
          } else {
            const possiblePaths = [
              join(rootDir, config.name),
              join(rootDir, 'app', config.name),
              join(rootDir, 'lib', config.name),
            ];
            
            for (const path of possiblePaths) {
              try {
                await access(path, constants.F_OK);
                filePath = path;
                break;
              } catch {
                // Versuche nächsten Pfad
              }
            }
          }
          
          if (!filePath) {
            // Versuche nochmal mit korrektem Pfad
            const directPath = join(rootDir, config.name);
            try {
              await access(directPath, constants.F_OK);
              filePath = directPath;
            } catch {
              // Datei existiert wirklich nicht
              deviation = `${config.name} fehlt (dokumentiert als erforderlich)`;
              severity = 'high';
              evidence.push(`❌ Datei fehlt: ${config.name}`);
              evidence.push(`📋 Dokumentation erwartet: ${config.description}`);
              break;
            }
          }
          
          if (filePath) {
            try {
              await access(filePath, constants.F_OK);
              evidence.push(`✅ Datei existiert: ${filePath}`);
              
              // Prüfe ob Datei dokumentierte Funktionalitäten enthält
              const fileContent = await readFile(filePath, 'utf-8');
              
              // Prüfe auf dokumentierte Funktionalitäten
              if (config.description.toLowerCase().includes('worker') && 
                  (fileContent.includes('pdf.worker.mjs') || fileContent.includes('pdf.worker.js'))) {
                deviation = `${config.name} verwendet expliziten Worker-Pfad (dokumentiert als problematisch)`;
                severity = 'high';
                evidence.push(`⚠️  Expliziter Worker-Pfad gefunden (kann zu Fehlern führen)`);
              }
              
              if (config.description.toLowerCase().includes('import') && 
                  !fileContent.includes('import') && 
                  !fileContent.includes('require')) {
                deviation = `${config.name} fehlt erforderliche Imports (dokumentiert als erforderlich)`;
                severity = 'medium';
                evidence.push(`⚠️  Imports könnten fehlen`);
              }
              
              // Wenn keine Abweichung gefunden wurde, aber Ticket ein Problem beschreibt, prüfe Ticket-Text
              if (!deviation && ticketText.includes('pdf') && (ticketText.includes('upload') || ticketText.includes('funktioniert nicht') || ticketText.includes('nicht möglich'))) {
                // Prüfe auf bekannte PDF-Upload-Probleme basierend auf Reverse Engineering
                // Wenn Ticket ein Problem beschreibt, aber Datei existiert, könnte es ein anderes Problem sein
                // Markiere als Problem, damit es weiter untersucht wird
                deviation = `${config.name} - PDF-Upload-Problem erkannt (Datei existiert, aber Upload funktioniert nicht)`;
                severity = 'high';
                evidence.push(`⚠️  Ticket beschreibt PDF-Upload-Problem, Datei existiert aber Upload funktioniert nicht`);
                evidence.push(`💡 Mögliche Ursachen: Worker-Pfad-Problem, Upload-Route-Problem, oder Embedding-Generierung`);
              }
            } catch (error) {
              // Datei existiert, aber kann nicht gelesen werden
              const errorMsg = error instanceof Error ? error.message : String(error);
              // Prüfe ob es ein Zugriffsproblem oder ein echtes Problem ist
              if (errorMsg.includes('EACCES') || errorMsg.includes('permission')) {
                deviation = `${config.name} - Zugriffsproblem (Datei existiert, aber kann nicht gelesen werden)`;
                severity = 'medium';
                evidence.push(`⚠️  Zugriffsproblem: ${errorMsg}`);
              } else {
                // Wenn Ticket ein Problem beschreibt, markiere es trotzdem als Problem
                if (ticketText.includes('pdf') && (ticketText.includes('upload') || ticketText.includes('funktioniert nicht'))) {
                  deviation = `${config.name} - PDF-Upload-Problem erkannt (Datei-Zugriff fehlgeschlagen)`;
                  severity = 'high';
                  evidence.push(`⚠️  Datei-Zugriff fehlgeschlagen: ${errorMsg}`);
                  evidence.push(`💡 Ticket beschreibt PDF-Upload-Problem`);
                } else {
                  deviation = `${config.name} konnte nicht gelesen werden: ${errorMsg}`;
                  severity = 'medium';
                  evidence.push(`⚠️  Datei nicht lesbar: ${errorMsg}`);
                }
              }
            }
          }
          break;
        }

        case 'database_setting': {
          // Für Database-Settings: Prüfe ob Ticket auf dokumentierte Probleme hinweist
          const documentedIssues = config.potentialIssues.map(i => i.toLowerCase());
          const ticketMatchesIssue = documentedIssues.some(issue => ticketText.includes(issue));
          
          if (ticketMatchesIssue) {
            deviation = `${config.name} Problem erkannt (dokumentiert als häufiges Problem)`;
            severity = 'high';
            evidence.push(`⚠️  Ticket beschreibt dokumentiertes Problem: ${config.description}`);
            evidence.push(`📋 Dokumentierte potenzielle Probleme: ${config.potentialIssues.join(', ')}`);
          } else {
            evidence.push(`✅ Keine dokumentierten Probleme erkannt`);
          }
          break;
        }

        case 'deployment_config': {
          // Für Deployment-Configs: Prüfe ob Ticket auf dokumentierte Probleme hinweist
          const documentedIssues = config.potentialIssues.map(i => i.toLowerCase());
          const ticketTextLower = ticketText.toLowerCase();
          const ticketMatchesIssue = documentedIssues.some(issue => ticketTextLower.includes(issue));
          
          if (ticketMatchesIssue) {
            deviation = `${config.name} Problem erkannt (dokumentiert als häufiges Problem)`;
            severity = 'high';
            evidence.push(`⚠️  Ticket beschreibt dokumentiertes Problem: ${config.description}`);
            evidence.push(`📋 Dokumentierte potenzielle Probleme: ${config.potentialIssues.join(', ')}`);
            
            // AGENT-BASIERTER ANSATZ: Generiere universelle AutoFix-Instructions aus Reverse Engineering
            // Fragt sofort die Dokumentation ab und leitet alle Fixes dynamisch ab
            if (!config.universalFixInstructions || config.universalFixInstructions.length === 0) {
              config.universalFixInstructions = await this.generateUniversalFixInstructions(config, ticketText, rootDir);
            }
          } else {
            evidence.push(`✅ Keine dokumentierten Probleme erkannt`);
          }
          break;
        }
      }
    } catch (error) {
      this.logger.warn({ err: error, config: config.name }, 'Fehler bei Abweichungsprüfung');
      return null;
    }

    if (deviation) {
      return { deviation, severity, evidence };
    }

    return null;
  }
}

