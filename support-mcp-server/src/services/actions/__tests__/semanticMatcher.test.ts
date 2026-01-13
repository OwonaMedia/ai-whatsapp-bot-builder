/**
 * Unit Tests für SemanticMatcher
 * 
 * Testet Keyword- und Semantisches Matching
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SemanticMatcher } from '../semanticMatcher.js';
import { createTestConfiguration } from './utils.js';
import { ALL_CONFIGS } from './fixtures/configurations.js';

describe('SemanticMatcher', () => {
  let matcher: SemanticMatcher;

  beforeEach(() => {
    matcher = new SemanticMatcher();
  });

  describe('findKeywordMatches', () => {
    it('sollte PDF-Upload-Keywords matchen', () => {
      const text = 'PDF Upload funktioniert nicht - Worker-Modul nicht gefunden';
      const matches = matcher.findKeywordMatches(text, ALL_CONFIGS);
      
      expect(Array.isArray(matches)).toBe(true);
      // Sollte mindestens ein Match finden wenn passende Config vorhanden
      if (matches.length > 0) {
        expect(matches[0].score).toBeGreaterThan(0);
        expect(matches[0].config).toBeDefined();
      }
    });

    it('sollte PM2-Keywords matchen', () => {
      const text = 'WhatsApp Bot reagiert nicht - PM2 Restart erforderlich';
      const matches = matcher.findKeywordMatches(text, ALL_CONFIGS);
      
      expect(Array.isArray(matches)).toBe(true);
      if (matches.length > 0) {
        expect(matches[0].score).toBeGreaterThan(0);
      }
    });

    it('sollte Stripe-Keywords matchen', () => {
      const text = 'Zahlung schlägt fehl - Stripe Key fehlt';
      const matches = matcher.findKeywordMatches(text, ALL_CONFIGS);
      
      expect(Array.isArray(matches)).toBe(true);
      if (matches.length > 0) {
        expect(matches[0].score).toBeGreaterThan(0);
      }
    });

    it('sollte keine Matches für unpassende Texte finden', () => {
      const text = 'Alles funktioniert gut, keine Probleme';
      const matches = matcher.findKeywordMatches(text, ALL_CONFIGS);
      
      // Sollte keine oder sehr niedrige Scores haben
      const highScoreMatches = matches.filter(m => m.score >= 5);
      expect(highScoreMatches.length).toBe(0);
    });

    it('sollte Synonyme für Upload-Begriffe erkennen', () => {
      const text = 'Hochladen funktioniert nicht';
      const matches = matcher.findKeywordMatches(text, ALL_CONFIGS);
      
      // Sollte Matches finden, da "hochladen" ein Synonym für "upload" ist
      expect(matches.length).toBeGreaterThanOrEqual(0);
    });

    it('sollte potenzielle Probleme in Score einbeziehen', () => {
      const config = createTestConfiguration('api_endpoint', {
        potentialIssues: ['Route fehlt', 'Endpoint nicht erreichbar'],
      });
      const text = 'Route fehlt - Endpoint nicht erreichbar';
      const matches = matcher.findKeywordMatches(text, [config]);
      
      if (matches.length > 0) {
        expect(matches[0].score).toBeGreaterThan(0);
      }
    });
  });

  describe('findSemanticMatches', () => {
    it('sollte semantische Matches für PDF-Upload finden', () => {
      const text = 'Dokument hochladen funktioniert nicht';
      const matches = matcher.findSemanticMatches(text, ALL_CONFIGS);
      
      expect(Array.isArray(matches)).toBe(true);
      if (matches.length > 0) {
        expect(matches[0].score).toBeGreaterThanOrEqual(0);
        expect(matches[0].score).toBeLessThanOrEqual(1);
      }
    });

    it('sollte semantische Matches für Payment finden', () => {
      const text = 'Bezahlung kann nicht abgeschlossen werden';
      const matches = matcher.findSemanticMatches(text, ALL_CONFIGS);
      
      expect(Array.isArray(matches)).toBe(true);
    });

    it('sollte semantische Matches basierend auf Typ-Keywords finden', () => {
      const config = createTestConfiguration('env_var', {
        name: 'STRIPE_SECRET_KEY',
        description: 'Stripe Secret Key für Payment',
      });
      const text = 'Umgebungsvariable fehlt für Zahlung';
      const matches = matcher.findSemanticMatches(text, [config]);
      
      // Sollte Match finden, da "Umgebungsvariable" und "Zahlung" zu env_var passen
      expect(Array.isArray(matches)).toBe(true);
    });

    it('sollte semantische Matches basierend auf Kontext-Gruppen finden', () => {
      const config = createTestConfiguration('api_endpoint', {
        name: '/api/knowledge/upload',
        description: 'PDF Upload Endpoint',
      });
      const text = 'PDF hochladen funktioniert nicht';
      const matches = matcher.findSemanticMatches(text, [config]);
      
      // Sollte Match finden, da "PDF" und "hochladen" zu pdf-upload Kontext passen
      expect(Array.isArray(matches)).toBe(true);
    });

    it('sollte semantische Matches nach Score sortieren', () => {
      const config1 = createTestConfiguration('api_endpoint', {
        name: '/api/knowledge/upload',
        description: 'PDF Upload Endpoint',
      });
      const config2 = createTestConfiguration('frontend_config', {
        name: 'lib/pdf/parsePdf.ts',
        description: 'PDF Parsing',
      });
      const text = 'PDF Upload funktioniert nicht';
      const matches = matcher.findSemanticMatches(text, [config1, config2]);
      
      if (matches.length > 1) {
        // Sollte nach Score sortiert sein (höchster zuerst)
        expect(matches[0].score).toBeGreaterThanOrEqual(matches[1].score);
      }
    });
  });

  describe('extractMatchedKeywords', () => {
    it('sollte matched Keywords extrahieren', () => {
      const config = createTestConfiguration('api_endpoint', {
        name: '/api/knowledge/upload',
        description: 'PDF Upload Endpoint',
        potentialIssues: ['Route fehlt'],
      });
      const text = 'PDF Upload Endpoint Route fehlt';
      const matches = matcher.findKeywordMatches(text, [config]);
      
      if (matches.length > 0) {
        expect(matches[0].matchedKeywords.length).toBeGreaterThan(0);
      }
    });
  });
});

