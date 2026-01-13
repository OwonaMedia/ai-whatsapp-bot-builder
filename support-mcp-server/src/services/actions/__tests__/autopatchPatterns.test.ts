import { describe, it, expect } from 'vitest';
import { matchAutopatchPattern } from '../autopatchPatterns.js';
import type { MinimalTicket } from '../autopatchPatterns.js';

describe('autopatchPatterns', () => {
  describe('matchAutopatchPattern', () => {
    it('sollte null zurückgeben wenn Ticket leer ist', () => {
      const ticket: MinimalTicket = {
        title: null,
        description: null,
      };

      const result = matchAutopatchPattern(ticket);
      expect(result).toBeNull();
    });

    it('sollte missing-translation Pattern matchen', () => {
      const ticket: MinimalTicket = {
        title: 'Fehler',
        description: 'MISSING_MESSAGE: common.save_button',
      };

      const result = matchAutopatchPattern(ticket);
      expect(result).toBeDefined();
      expect(result?.patternId).toBe('missing-translation');
      expect(result?.summary).toContain('common.save_button');
      expect(result?.actions).toHaveLength(1);
      expect(result?.actions[0].type).toBe('autopatch_plan');
      expect(result?.autoFixInstructions).toBeDefined();
      expect(result?.autoFixInstructions?.[0].type).toBe('i18n-add-key');
    });

    it('sollte type-error-null-guard Pattern matchen', () => {
      const ticket: MinimalTicket = {
        title: 'Fehler',
        description: 'Cannot read properties of null',
      };

      const result = matchAutopatchPattern(ticket);
      expect(result).toBeDefined();
      expect(result?.patternId).toBe('type-error-null-guard');
      expect(result?.summary).toContain('Null-Safety');
    });

    it('sollte reference-error-missing-import Pattern matchen', () => {
      const ticket: MinimalTicket = {
        title: 'Fehler',
        description: 'ReferenceError: myFunction is not defined',
      };

      const result = matchAutopatchPattern(ticket);
      expect(result).toBeDefined();
      expect(result?.patternId).toBe('reference-error-missing-import');
      expect(result?.summary).toContain('myFunction');
    });

    it('sollte network-fetch-failed Pattern matchen', () => {
      const ticket: MinimalTicket = {
        title: 'Fehler',
        description: 'Failed to fetch',
      };

      const result = matchAutopatchPattern(ticket);
      expect(result).toBeDefined();
      expect(result?.patternId).toBe('network-fetch-failed');
    });

    it('sollte network-fetch-failed Pattern mit verschiedenen Netzwerk-Fehlern matchen', () => {
      const networkErrors = [
        'NetworkError',
        'net::ERR_FAILED',
        '502 Bad Gateway',
        '504 Gateway Timeout',
        'ECONNREFUSED',
      ];

      for (const error of networkErrors) {
        const ticket: MinimalTicket = {
          title: 'Fehler',
          description: error,
        };

        const result = matchAutopatchPattern(ticket);
        expect(result).toBeDefined();
        expect(result?.patternId).toBe('network-fetch-failed');
      }
    });

    it('sollte missing-locale-file Pattern matchen', () => {
      const ticket: MinimalTicket = {
        title: 'Fehler',
        description: 'messages/fr.json" not found',
      };

      const result = matchAutopatchPattern(ticket);
      expect(result).toBeDefined();
      expect(result?.patternId).toBe('missing-locale-file');
      expect(result?.summary).toContain('fr');
    });

    it('sollte missing-locale-file Pattern mit "missing locale file" Text matchen', () => {
      const ticket: MinimalTicket = {
        title: 'Fehler',
        description: 'Missing locale file for sw',
      };

      const result = matchAutopatchPattern(ticket);
      expect(result).toBeDefined();
      expect(result?.patternId).toBe('missing-locale-file');
    });

    it('sollte missing-locale-file Pattern nicht matchen für de-Locale', () => {
      const ticket: MinimalTicket = {
        title: 'Fehler',
        description: 'messages/de.json not found',
      };

      const result = matchAutopatchPattern(ticket);
      // de ist Standard-Locale, sollte nicht gematcht werden
      expect(result).toBeNull();
    });

    it('sollte Pattern im Titel matchen', () => {
      const ticket: MinimalTicket = {
        title: 'MISSING_MESSAGE: common.error',
        description: 'Some description',
      };

      const result = matchAutopatchPattern(ticket);
      expect(result).toBeDefined();
      expect(result?.patternId).toBe('missing-translation');
    });

    it('sollte Pattern in latest_message matchen', () => {
      const ticket: MinimalTicket = {
        title: 'Fehler',
        description: 'Some description',
      } as any; // latest_message ist nicht Teil von MinimalTicket, wird als any behandelt

      // Setze latest_message direkt auf das Ticket-Objekt
      (ticket as any).latest_message = 'MISSING_MESSAGE: common.submit';

      const result = matchAutopatchPattern(ticket);
      expect(result).toBeDefined();
      expect(result?.patternId).toBe('missing-translation');
    });

    it('sollte null zurückgeben wenn kein Pattern matched', () => {
      const ticket: MinimalTicket = {
        title: 'Allgemeine Frage',
        description: 'Wie funktioniert das?',
      };

      const result = matchAutopatchPattern(ticket);
      expect(result).toBeNull();
    });

    it('sollte customerMessage für network-fetch-failed mit de-Locale generieren', () => {
      const ticket: MinimalTicket = {
        title: 'Fehler',
        description: 'Failed to fetch',
        source_metadata: {
          locale: 'de',
        },
      };

      const result = matchAutopatchPattern(ticket);
      expect(result).toBeDefined();
      expect(result?.customerMessage).toContain('Danke');
    });

    it('sollte customerMessage für network-fetch-failed mit en-Locale generieren', () => {
      const ticket: MinimalTicket = {
        title: 'Error',
        description: 'Failed to fetch',
        source_metadata: {
          locale: 'en',
        },
      };

      const result = matchAutopatchPattern(ticket);
      expect(result).toBeDefined();
      expect(result?.customerMessage).toContain('Thank you');
    });

    it('sollte autoFixInstructions für missing-translation enthalten', () => {
      const ticket: MinimalTicket = {
        title: 'Fehler',
        description: 'MISSING_MESSAGE: common.test_key',
      };

      const result = matchAutopatchPattern(ticket);
      expect(result).toBeDefined();
      expect(result?.autoFixInstructions).toBeDefined();
      expect(result?.autoFixInstructions?.length).toBeGreaterThan(0);
      
      const instruction = result?.autoFixInstructions?.[0];
      expect(instruction?.type).toBe('i18n-add-key');
      if (instruction?.type === 'i18n-add-key') {
        expect(instruction.key).toBe('common.test_key');
        expect(instruction.translations).toBeDefined();
        expect(instruction.translations.de).toBeDefined();
        expect(instruction.translations.en).toBeDefined();
      }
    });

    it('sollte mehrere Patterns nacheinander prüfen', () => {
      // Teste dass das erste passende Pattern zurückgegeben wird
      const ticket: MinimalTicket = {
        title: 'MISSING_MESSAGE: test',
        description: 'Cannot read properties of null',
      };

      const result = matchAutopatchPattern(ticket);
      // missing-translation sollte zuerst matchen
      expect(result?.patternId).toBe('missing-translation');
    });
  });
});

