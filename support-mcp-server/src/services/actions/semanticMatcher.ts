/**
 * Semantic Matcher
 * 
 * Erweiterte Matching-Logik für Ticket-Text:
 * - Keyword-Matching mit Synonymen
 * - Semantische Ähnlichkeit
 * - Kontext-bewusstes Matching
 */

import type { ConfigurationItem } from './reverseEngineeringAnalyzer.js';

export interface MatchResult {
  config: ConfigurationItem;
  score: number;
  reason: string;
  matchedKeywords: string[];
}

/**
 * Synonyme-Datenbank für häufige Begriffe
 */
const SYNONYMS: Record<string, string[]> = {
  // Upload/Upload-Probleme
  'upload': ['hochladen', 'einreichen', 'hinzufügen', 'upload', 'übertragen', 'senden'],
  'pdf': ['pdf', 'dokument', 'datei', 'pdf-datei'],
  'fehler': ['fehler', 'error', 'problem', 'schiefgelaufen', 'funktioniert nicht', 'geht nicht'],
  'nicht möglich': ['nicht möglich', 'geht nicht', 'funktioniert nicht', 'fehlgeschlagen', 'schiefgelaufen'],
  
  // API/Endpoint-Probleme
  'api': ['api', 'endpoint', 'route', 'route-handler'],
  'endpoint': ['endpoint', 'api', 'route', 'url'],
  
  // Konfiguration/Environment
  'konfiguration': ['konfiguration', 'config', 'einstellung', 'setting'],
  'umgebungsvariable': ['umgebungsvariable', 'env', 'environment variable', 'env var'],
  
  // Database
  'datenbank': ['datenbank', 'database', 'db', 'supabase'],
  'zugriff': ['zugriff', 'access', 'permission', 'berechtigung'],
  
  // Universelle Begriffe (werden automatisch aus Reverse Engineering Dokumentation erweitert)
};

/**
 * Kontext-bewusste Keyword-Gruppen
 */
const CONTEXT_GROUPS: Record<string, string[]> = {
  'pdf-upload': ['pdf', 'upload', 'hochladen', 'datei', 'dokument', 'wissensquelle', 'knowledge'],
  'api-error': ['api', 'endpoint', 'route', 'fehler', '500', '404', 'error'],
  'config-missing': ['konfiguration', 'env', 'variable', 'fehlt', 'nicht gesetzt', 'undefined'],
  'database-access': ['datenbank', 'zugriff', 'rls', 'policy', 'permission', 'verweigert'],
  // Kontext-Gruppen werden dynamisch aus Reverse Engineering Dokumentation generiert
};

export class SemanticMatcher {
  /**
   * Findet Konfigurationen basierend auf Keyword-Matching (Level 1)
   */
  findKeywordMatches(
    text: string,
    configurations: ConfigurationItem[]
  ): MatchResult[] {
    const results: MatchResult[] = [];
    const normalizedText = text.toLowerCase();

    for (const config of configurations) {
      const score = this.calculateKeywordScore(normalizedText, config);
      if (score > 0) {
        results.push({
          config,
          score,
          reason: 'Keyword-Match',
          matchedKeywords: this.extractMatchedKeywords(normalizedText, config),
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Findet Konfigurationen basierend auf semantischer Ähnlichkeit (Level 2)
   */
  findSemanticMatches(
    text: string,
    configurations: ConfigurationItem[]
  ): MatchResult[] {
    const results: MatchResult[] = [];
    const normalizedText = text.toLowerCase();

    for (const config of configurations) {
      const score = this.calculateSemanticScore(normalizedText, config);
      if (score > 0.3) { // Threshold für semantische Ähnlichkeit
        results.push({
          config,
          score,
          reason: 'Semantic-Match',
          matchedKeywords: this.extractMatchedKeywords(normalizedText, config),
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Berechnet Keyword-Score für eine Konfiguration
   */
  private calculateKeywordScore(text: string, config: ConfigurationItem): number {
    let score = 0;

    // Direkte Erwähnung der Konfiguration
    if (text.includes(config.name.toLowerCase())) {
      score += 10;
    }

    if (text.includes(config.description.toLowerCase())) {
      score += 8;
    }

    // Synonyme für Konfigurations-Name
    const configNameLower = config.name.toLowerCase();
    for (const [key, synonyms] of Object.entries(SYNONYMS)) {
      if (configNameLower.includes(key) || synonyms.some(s => configNameLower.includes(s))) {
        for (const synonym of synonyms) {
          if (text.includes(synonym)) {
            score += 5;
          }
        }
      }
    }

    // Potenzielle Probleme (universell - aus Reverse Engineering Dokumentation)
    // Diese Liste wird automatisch aus der Dokumentation extrahiert
    for (const issue of config.potentialIssues) {
      if (text.includes(issue.toLowerCase())) {
        score += 4; // Höherer Score für explizite Problem-Erwähnung
      }
      
      // Universelle Synonyme für Probleme (nur generische)
      for (const [key, synonyms] of Object.entries(SYNONYMS)) {
        if (issue.toLowerCase().includes(key)) {
          for (const synonym of synonyms) {
            if (text.includes(synonym)) {
              score += 2;
            }
          }
        }
      }
    }

    // Universelle Kontext-Gruppen (dynamisch aus Reverse Engineering Dokumentation)
    // Prüfe ob Konfiguration und Ticket-Text gemeinsame Kontext-Keywords haben
    const configText = `${config.name} ${config.description} ${config.location}`.toLowerCase();
    const configWords = new Set(configText.split(/\s+/).filter(w => w.length > 3));
    const ticketWords = new Set(text.split(/\s+/).filter(w => w.length > 3));
    const commonWords = [...configWords].filter(w => ticketWords.has(w));
    
    // Bonus basierend auf gemeinsamen Wörtern (universell, nicht problem-spezifisch)
    if (commonWords.length >= 2) {
      score += commonWords.length * 3; // Universeller Bonus für Kontext-Überschneidung
    }
    
    // Universelle Kontext-Gruppen (nur generische, nicht problem-spezifische)
    for (const [context, keywords] of Object.entries(CONTEXT_GROUPS)) {
      const contextMatches = keywords.filter(k => text.includes(k)).length;
      if (contextMatches >= 2) {
        const configMatchesContext = this.configMatchesContext(config, context);
        if (configMatchesContext) {
          score += contextMatches * 2; // Universeller Score, keine problem-spezifischen Bonuses
        }
      }
    }

    return score;
  }

  /**
   * Berechnet semantischen Score (erweiterte Ähnlichkeit)
   */
  private calculateSemanticScore(text: string, config: ConfigurationItem): number {
    let score = 0;

    // Kontext-bewusste Gruppierung
    for (const [context, keywords] of Object.entries(CONTEXT_GROUPS)) {
      const textKeywords = keywords.filter(k => text.includes(k));
      const configKeywords = keywords.filter(k => 
        config.name.toLowerCase().includes(k) || 
        config.description.toLowerCase().includes(k) ||
        config.location.toLowerCase().includes(k)
      );

      if (textKeywords.length > 0 && configKeywords.length > 0) {
        // Je mehr gemeinsame Keywords, desto höher der Score
        const commonKeywords = textKeywords.filter(k => configKeywords.includes(k));
        score += (commonKeywords.length / Math.max(textKeywords.length, configKeywords.length)) * 10;
      }
    }

    // Typ-basierte Ähnlichkeit
    const typeKeywords: Record<string, string[]> = {
      'env_var': ['env', 'variable', 'konfiguration', 'setting', 'config'],
      'api_endpoint': ['api', 'endpoint', 'route', 'url', 'request'],
      'database_setting': ['datenbank', 'database', 'db', 'supabase', 'rls', 'policy'],
      'frontend_config': ['frontend', 'ui', 'komponente', 'component', 'seite', 'page'],
      'deployment_config': ['deployment', 'server', 'pm2', 'caddy', 'nginx'],
    };

    const typeKeywordsForConfig = typeKeywords[config.type] || [];
    const textTypeMatches = typeKeywordsForConfig.filter(k => text.includes(k)).length;
    if (textTypeMatches > 0) {
      score += (textTypeMatches / typeKeywordsForConfig.length) * 5;
    }

    // Beschreibungs-Ähnlichkeit (einfache Wort-Überschneidung)
    const configWords = new Set(
      (config.description.toLowerCase() + ' ' + config.name.toLowerCase())
        .split(/\s+/)
        .filter(w => w.length > 3)
    );
    const textWords = new Set(
      text.split(/\s+/).filter(w => w.length > 3)
    );

    const commonWords = [...configWords].filter(w => textWords.has(w));
    if (commonWords.length > 0) {
      score += (commonWords.length / Math.max(configWords.size, textWords.size)) * 8;
    }

    return Math.min(score, 20); // Max Score: 20
  }

  /**
   * Prüft ob Konfiguration zu einem Kontext passt
   */
  private configMatchesContext(config: ConfigurationItem, context: string): boolean {
    const contextKeywords = CONTEXT_GROUPS[context] || [];
    const configText = `${config.name} ${config.description} ${config.location}`.toLowerCase();
    
    return contextKeywords.some(keyword => configText.includes(keyword));
  }

  /**
   * Extrahiert matched Keywords aus Text
   */
  private extractMatchedKeywords(text: string, config: ConfigurationItem): string[] {
    const matched: string[] = [];
    const allKeywords = [
      config.name.toLowerCase(),
      ...config.description.toLowerCase().split(/\s+/),
      ...config.potentialIssues.map((i: string) => i.toLowerCase()),
    ];

    for (const keyword of allKeywords) {
      if (text.includes(keyword) && keyword.length > 2) {
        matched.push(keyword);
      }
    }

    return [...new Set(matched)];
  }
}

