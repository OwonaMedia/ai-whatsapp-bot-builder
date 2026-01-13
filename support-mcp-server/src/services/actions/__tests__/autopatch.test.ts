import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { persistAutopatchPlan } from '../autopatch.js';
import type { Logger } from '../../../utils/logger.js';
import type { ResolutionAction } from '../../llmClient.js';
import type { AutopatchPlanContext } from '../autopatch.js';

describe('autopatch', () => {
  let mockLogger: Logger;
  let testRootDir: string;
  let autopatchDir: string;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      child: vi.fn().mockReturnThis(),
    } as unknown as Logger;

    // Erstelle temporäres Test-Verzeichnis
    testRootDir = path.join(process.cwd(), 'test-temp');
    autopatchDir = path.join(testRootDir, '../docs/autopatches');
  });

  afterEach(async () => {
    // Cleanup: Lösche Test-Verzeichnis
    try {
      await fs.rm(testRootDir, { recursive: true, force: true });
      await fs.rm(autopatchDir, { recursive: true, force: true });
    } catch (error) {
      // Ignoriere Fehler beim Cleanup
    }
  });

  describe('persistAutopatchPlan', () => {
    it('sollte Autopatch-Plan als Markdown-Datei speichern', async () => {
      const planAction: ResolutionAction = {
        type: 'autopatch',
        payload: {
          fixName: 'Test Fix',
          goal: 'Test Goal',
          targetFiles: ['test.ts'],
          steps: ['Step 1', 'Step 2'],
          validation: ['Test 1'],
          rollout: ['Deploy'],
        },
      };

      const context: AutopatchPlanContext = {
        ticketId: 'ticket-001',
        title: 'Test Ticket',
        description: 'Test Description',
        locale: 'de',
      };

      const filePath = await persistAutopatchPlan(
        testRootDir,
        planAction,
        'Test Summary',
        context,
        mockLogger,
      );

      expect(filePath).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalled();

      // Prüfe ob Datei existiert
      const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);

      // Prüfe Datei-Inhalt
      const content = await fs.readFile(filePath, 'utf8');
      expect(content).toContain('# Autopatch Plan – Test Fix');
      expect(content).toContain('Ticket: `ticket-001`');
      expect(content).toContain('Test Summary');
      expect(content).toContain('test.ts');
      expect(content).toContain('Step 1');
      expect(content).toContain('Step 2');
    });

    it('sollte Slug aus Ticket-ID und Fix-Name generieren', async () => {
      const planAction: ResolutionAction = {
        type: 'autopatch',
        payload: {
          fixName: 'Fix With Special Chars!@#',
        },
      };

      const context: AutopatchPlanContext = {
        ticketId: 'ticket-001',
        title: 'Test',
        description: 'Test',
      };

      const filePath = await persistAutopatchPlan(
        testRootDir,
        planAction,
        'Summary',
        context,
        mockLogger,
      );

      // Prüfe ob Dateiname korrekt generiert wurde (Slug)
      expect(filePath).toContain('ticket-001-fix-with-special-chars');
    });

    it('sollte System-Zustand dokumentieren', async () => {
      const planAction: ResolutionAction = {
        type: 'autopatch',
        payload: {
          systemState: {
            currentFileContents: {
              'test.ts': 'const x = 1;',
            },
            environmentVariables: {
              API_KEY: 'secret123',
              NODE_ENV: 'production',
            },
            dependencies: {
              'express': '4.18.0',
            },
            configurations: {
              'config.json': { port: 3000 },
            },
            reverseEngineeringRefs: ['ref1', 'ref2'],
          },
        },
      };

      const context: AutopatchPlanContext = {
        ticketId: 'ticket-001',
        title: 'Test',
        description: 'Test',
      };

      const filePath = await persistAutopatchPlan(
        testRootDir,
        planAction,
        'Summary',
        context,
        mockLogger,
      );

      const content = await fs.readFile(filePath, 'utf8');
      expect(content).toContain('## System-Zustand');
      expect(content).toContain('### Aktuelle Datei-Inhalte');
      expect(content).toContain('test.ts');
      expect(content).toContain('const x = 1;');
      expect(content).toContain('### Umgebungsvariablen (relevant)');
      expect(content).toContain('API_KEY');
      // Prüfe dass API_KEY maskiert wurde (erste 8 Zeichen + ...)
      // secret123 -> secret12... (8 Zeichen + ...)
      expect(content).toMatch(/API_KEY.*secret12\.\.\./);
      expect(content).toContain('NODE_ENV');
      expect(content).toContain('production');
      expect(content).toContain('### Abhängigkeiten');
      expect(content).toContain('express');
      expect(content).toContain('4.18.0');
      expect(content).toContain('### Konfigurationsdateien');
      expect(content).toContain('config.json');
      expect(content).toContain('### Reverse Engineering Referenzen');
      expect(content).toContain('ref1');
      expect(content).toContain('ref2');
    });

    it('sollte Code-Änderungen (Diffs) dokumentieren', async () => {
      const planAction: ResolutionAction = {
        type: 'autopatch',
        payload: {
          codeChanges: {
            diffs: [
              {
                file: 'test.ts',
                before: 'const old = 1;',
                after: 'const new = 2;',
                lineNumbers: { start: 10, end: 15 },
              },
            ],
            affectedFunctions: ['function1', 'function2'],
            importChanges: ['import { x } from "y"'],
          },
        },
      };

      const context: AutopatchPlanContext = {
        ticketId: 'ticket-001',
        title: 'Test',
        description: 'Test',
      };

      const filePath = await persistAutopatchPlan(
        testRootDir,
        planAction,
        'Summary',
        context,
        mockLogger,
      );

      const content = await fs.readFile(filePath, 'utf8');
      expect(content).toContain('## Code-Änderungen (Diff)');
      expect(content).toContain('### test.ts');
      expect(content).toContain('**Betroffene Zeilen:** 10-15');
      expect(content).toContain('const old = 1;');
      expect(content).toContain('const new = 2;');
      expect(content).toContain('### Betroffene Funktionen');
      expect(content).toContain('function1');
      expect(content).toContain('function2');
      expect(content).toContain('### Import-Änderungen');
      expect(content).toContain('import { x } from "y"');
    });

    it('sollte Kontext & Abhängigkeiten dokumentieren', async () => {
      const planAction: ResolutionAction = {
        type: 'autopatch',
        payload: {
          context: {
            affectedComponents: ['Component1', 'Component2'],
            apiEndpoints: ['/api/test'],
            databaseChanges: ['ALTER TABLE users'],
            frontendBackendDependencies: ['Frontend → Backend'],
          },
        },
      };

      const context: AutopatchPlanContext = {
        ticketId: 'ticket-001',
        title: 'Test',
        description: 'Test',
      };

      const filePath = await persistAutopatchPlan(
        testRootDir,
        planAction,
        'Summary',
        context,
        mockLogger,
      );

      const content = await fs.readFile(filePath, 'utf8');
      expect(content).toContain('## Kontext & Abhängigkeiten');
      expect(content).toContain('### Betroffene Komponenten');
      expect(content).toContain('Component1');
      expect(content).toContain('Component2');
      expect(content).toContain('### API-Endpunkte');
      expect(content).toContain('/api/test');
      expect(content).toContain('### Datenbank-Änderungen');
      expect(content).toContain('ALTER TABLE users');
      expect(content).toContain('### Frontend/Backend-Abhängigkeiten');
      expect(content).toContain('Frontend → Backend');
    });

    it('sollte Fehlerbehandlung & Rollback dokumentieren', async () => {
      const planAction: ResolutionAction = {
        type: 'autopatch',
        payload: {
          errorHandling: {
            possibleErrors: ['Error 1', 'Error 2'],
            rollbackStrategy: 'Rollback to previous version',
            validationSteps: ['Step 1', 'Step 2'],
            monitoring: ['Monitor 1', 'Monitor 2'],
          },
        },
      };

      const context: AutopatchPlanContext = {
        ticketId: 'ticket-001',
        title: 'Test',
        description: 'Test',
      };

      const filePath = await persistAutopatchPlan(
        testRootDir,
        planAction,
        'Summary',
        context,
        mockLogger,
      );

      const content = await fs.readFile(filePath, 'utf8');
      expect(content).toContain('## Fehlerbehandlung & Rollback');
      expect(content).toContain('### Mögliche Fehler');
      expect(content).toContain('Error 1');
      expect(content).toContain('Error 2');
      expect(content).toContain('### Rollback-Strategie');
      expect(content).toContain('Rollback to previous version');
      expect(content).toContain('### Validierungsschritte');
      expect(content).toContain('Step 1');
      expect(content).toContain('Step 2');
      expect(content).toContain('### Monitoring');
      expect(content).toContain('Monitor 1');
      expect(content).toContain('Monitor 2');
    });

    it('sollte Fallback-Werte verwenden wenn payload leer ist', async () => {
      const planAction: ResolutionAction = {
        type: 'autopatch',
        payload: {},
      };

      const context: AutopatchPlanContext = {
        ticketId: 'ticket-001',
        title: 'Test Ticket',
        description: 'Test Description',
      };

      const filePath = await persistAutopatchPlan(
        testRootDir,
        planAction,
        'Test Summary',
        context,
        mockLogger,
      );

      const content = await fs.readFile(filePath, 'utf8');
      expect(content).toContain('# Autopatch Plan – Test Summary');
      expect(content).toContain('(Noch nicht angegeben)');
      expect(content).toContain('Schritte vom Autopatch-Agenten erfragen');
      expect(content).toContain('Tests definieren');
    });

    it('sollte Locale im Plan dokumentieren', async () => {
      const planAction: ResolutionAction = {
        type: 'autopatch',
        payload: {},
      };

      const context: AutopatchPlanContext = {
        ticketId: 'ticket-001',
        title: 'Test',
        description: 'Test',
        locale: 'de',
      };

      const filePath = await persistAutopatchPlan(
        testRootDir,
        planAction,
        'Summary',
        context,
        mockLogger,
      );

      const content = await fs.readFile(filePath, 'utf8');
      expect(content).toContain('- Locale: de');
    });

    it('sollte große Datei-Inhalte kürzen', async () => {
      const largeContent = 'x'.repeat(3000);
      const planAction: ResolutionAction = {
        type: 'autopatch',
        payload: {
          systemState: {
            currentFileContents: {
              'large.ts': largeContent,
            },
          },
        },
      };

      const context: AutopatchPlanContext = {
        ticketId: 'ticket-001',
        title: 'Test',
        description: 'Test',
      };

      const filePath = await persistAutopatchPlan(
        testRootDir,
        planAction,
        'Summary',
        context,
        mockLogger,
      );

      const content = await fs.readFile(filePath, 'utf8');
      expect(content).toContain('... (gekürzt)');
      // Prüfe dass Datei-Inhalt gekürzt wurde (substring(0, 2000) + "... (gekürzt)")
      const fileContentMatch = content.match(/```typescript\n([\s\S]*?)\n```/);
      if (fileContentMatch) {
        // Der Inhalt sollte maximal 2000 Zeichen + "... (gekürzt)" sein
        // Aber durch Zeilenumbrüche kann es etwas mehr sein, daher prüfen wir nur dass es gekürzt wurde
        expect(fileContentMatch[1]).toContain('... (gekürzt)');
        // Prüfe dass der ursprüngliche Inhalt (3000 Zeichen) nicht vollständig enthalten ist
        expect(fileContentMatch[1].length).toBeLessThan(3000);
      }
    });

    it('sollte Kontext aus payload und parameter mergen', async () => {
      const planAction: ResolutionAction = {
        type: 'autopatch',
        payload: {
          systemState: {
            currentFileContents: {
              'from-payload.ts': 'payload content',
            },
          },
        },
      };

      const context: AutopatchPlanContext = {
        ticketId: 'ticket-001',
        title: 'Test',
        description: 'Test',
        systemState: {
          currentFileContents: {
            'from-context.ts': 'context content',
          },
        },
      };

      const filePath = await persistAutopatchPlan(
        testRootDir,
        planAction,
        'Summary',
        context,
        mockLogger,
      );

      const content = await fs.readFile(filePath, 'utf8');
      // Payload hat Priorität
      expect(content).toContain('from-payload.ts');
      expect(content).toContain('payload content');
      // Context-Werte sollten nicht erscheinen wenn payload vorhanden ist
      expect(content).not.toContain('from-context.ts');
    });
  });
});

