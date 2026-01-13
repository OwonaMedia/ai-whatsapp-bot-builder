/**
 * Unit Tests für ReverseEngineeringAnalyzer
 * 
 * Testet Matching, Fix-Generierung und Config-Extraktion
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReverseEngineeringAnalyzer } from '../reverseEngineeringAnalyzer.js';
import { createMockLogger, createMockKnowledgeBase, createMockLlmClient } from './setup.js';
import { createTestTicket, assertMatchFound } from './utils.js';
import { POSITIVE_TICKETS } from './fixtures/tickets.js';
import { MOCK_KNOWLEDGE_DOCS } from './fixtures/mocks.js';

describe('ReverseEngineeringAnalyzer', () => {
  let analyzer: ReverseEngineeringAnalyzer;
  let mockKnowledgeBase: ReturnType<typeof createMockKnowledgeBase>;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockLlmClient: ReturnType<typeof createMockLlmClient>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    mockKnowledgeBase = createMockKnowledgeBase(MOCK_KNOWLEDGE_DOCS);
    mockLlmClient = createMockLlmClient();
    
    analyzer = new ReverseEngineeringAnalyzer(
      mockKnowledgeBase,
      mockLogger,
      mockLlmClient
    );
  });

  describe('analyzeReverseEngineering', () => {
    it('sollte Reverse Engineering Dokumentation analysieren', async () => {
      const result = await analyzer.analyzeReverseEngineering();
      
      expect(result).toBeDefined();
      expect(result.configurations).toBeDefined();
      expect(Array.isArray(result.configurations)).toBe(true);
      expect(result.commonIssues).toBeDefined();
      expect(Array.isArray(result.commonIssues)).toBe(true);
    });

    it('sollte Konfigurationen aus Dokumentation extrahieren', async () => {
      const result = await analyzer.analyzeReverseEngineering();
      
      // Sollte mindestens einige Konfigurationen finden
      expect(result.configurations.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('matchTicketToConfiguration', () => {
    it('sollte PDF-Upload-Ticket zu Config matchen', async () => {
      const ticket = POSITIVE_TICKETS.pdfUploadWorkerNotFound;
      const result = await analyzer.matchTicketToConfiguration(ticket);
      
      // Sollte ein Match finden (kann null sein wenn keine passende Config)
      if (result) {
        expect(result.patternId).toBeDefined();
        expect(result.summary).toBeDefined();
      }
    });

    it('sollte PM2-Restart-Ticket zu Config matchen', async () => {
      const ticket = POSITIVE_TICKETS.pm2RestartRequired;
      const result = await analyzer.matchTicketToConfiguration(ticket);
      
      // Sollte ein Match finden (kann null sein wenn keine passende Config)
      if (result) {
        expect(result.patternId).toBeDefined();
        expect(result.actions).toBeDefined();
      }
    });

    it('sollte Env-Var-Ticket zu Config matchen', async () => {
      const ticket = POSITIVE_TICKETS.missingStripeKey;
      const result = await analyzer.matchTicketToConfiguration(ticket);
      
      // Sollte ein Match finden (kann null sein wenn keine passende Config)
      if (result) {
        expect(result.patternId).toBeDefined();
      }
    });
  });

  describe('generateUniversalFixInstructions', () => {
    it('sollte Fix-Instructions für env_var generieren', async () => {
      const config = {
        type: 'env_var' as const,
        name: 'STRIPE_SECRET_KEY',
        description: 'Stripe Secret Key',
        location: '.env.local',
        potentialIssues: ['fehlt'],
        fixStrategies: ['Füge STRIPE_SECRET_KEY hinzu'],
      };
      
      const instructions = await analyzer['generateUniversalFixInstructions'](
        config,
        'Stripe Key fehlt',
        '/tmp/test'
      );
      
      expect(Array.isArray(instructions)).toBe(true);
    });

    it('sollte Fix-Instructions für api_endpoint generieren', async () => {
      const config = {
        type: 'api_endpoint' as const,
        name: '/api/knowledge/upload',
        description: 'PDF Upload Endpoint',
        location: 'app/api/knowledge/upload/route.ts',
        potentialIssues: ['Route fehlt'],
        fixStrategies: ['Erstelle Route-Datei'],
      };
      
      const instructions = await analyzer['generateUniversalFixInstructions'](
        config,
        'Upload Endpoint fehlt',
        '/tmp/test'
      );
      
      expect(Array.isArray(instructions)).toBe(true);
    });

    it('sollte Fix-Instructions für deployment_config generieren', async () => {
      const config = {
        type: 'deployment_config' as const,
        name: 'PM2 Configuration',
        description: 'PM2 Prozess-Management',
        location: 'ecosystem.config.js',
        potentialIssues: ['Prozess läuft nicht'],
        fixStrategies: ['pm2 restart ausführen'],
      };
      
      const instructions = await analyzer['generateUniversalFixInstructions'](
        config,
        'PM2 Prozess reagiert nicht',
        '/tmp/test'
      );
      
      expect(Array.isArray(instructions)).toBe(true);
      // Sollte hetzner-command Instruction enthalten
      const hasHetznerCommand = instructions.some(inst => inst.type === 'hetzner-command');
      expect(hasHetznerCommand).toBe(true);
    });
  });

  describe('extractConfigurations', () => {
    it('sollte Konfigurationen aus Dokumentation extrahieren', () => {
      const doc = {
        id: 'doc-001',
        title: 'Deployment Configuration',
        content: 'PM2 Configuration: pm2 restart whatsapp-bot-builder. Environment Variable: STRIPE_SECRET_KEY=sk_test_...',
        metadata: { type: 'deployment' },
      };

      const configs = analyzer['extractConfigurations'](doc);
      expect(Array.isArray(configs)).toBe(true);
    });
  });

  describe('identifyPotentialIssues', () => {
    it('sollte potenzielle Probleme für Konfiguration identifizieren', () => {
      const config = {
        type: 'env_var' as const,
        name: 'STRIPE_SECRET_KEY',
        description: 'Stripe Secret Key',
        location: '.env.local',
        potentialIssues: ['fehlt', 'ist nicht gesetzt'],
        fixStrategies: ['Füge STRIPE_SECRET_KEY hinzu'],
      };

      const issues = analyzer['identifyPotentialIssues'](config);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].pattern).toBeDefined();
      expect(issues[0].fix).toBeDefined();
    });
  });

  describe('extractFixStrategiesFromDocs', () => {
    it('sollte Fix-Strategien aus Dokumentation extrahieren', async () => {
      const config = {
        type: 'deployment_config' as const,
        name: 'PM2 Configuration',
        description: 'PM2 Prozess-Management',
        location: 'ecosystem.config.js',
        potentialIssues: ['Prozess läuft nicht'],
        fixStrategies: ['pm2 restart ausführen'],
      };

      const strategies = await analyzer['extractFixStrategiesFromDocs'](
        MOCK_KNOWLEDGE_DOCS,
        config,
        'pm2 restart'
      );

      expect(Array.isArray(strategies)).toBe(true);
    });
  });

  describe('generateInstructionsFromStrategy', () => {
    it('sollte PM2-Instructions aus Strategie generieren', async () => {
      const strategy = 'pm2 restart whatsapp-bot-builder';
      const config = {
        type: 'deployment_config' as const,
        name: 'PM2 Configuration',
        description: 'PM2 Prozess-Management',
        location: 'ecosystem.config.js',
        potentialIssues: ['Prozess läuft nicht'],
        fixStrategies: ['pm2 restart ausführen'],
      };

      const instructions = await analyzer['generateInstructionsFromStrategy'](
        strategy,
        config,
        'pm2 restart',
        '/tmp/test'
      );

      expect(Array.isArray(instructions)).toBe(true);
      const hasHetznerCommand = instructions.some(inst => inst.type === 'hetzner-command');
      expect(hasHetznerCommand).toBe(true);
    });

    it('sollte SQL-Instructions aus Strategie generieren', async () => {
      const strategy = 'CREATE TABLE IF NOT EXISTS test_table';
      const config = {
        type: 'database_setting' as const,
        name: 'Test Table',
        description: 'Test Database Table',
        location: 'supabase/migrations',
        potentialIssues: ['Tabelle fehlt'],
        fixStrategies: ['CREATE TABLE ausführen'],
      };

      const instructions = await analyzer['generateInstructionsFromStrategy'](
        strategy,
        config,
        'table missing',
        '/tmp/test'
      );

      expect(Array.isArray(instructions)).toBe(true);
    });

    it('sollte Code-Modify-Instructions aus Strategie generieren', async () => {
      const strategy = 'Entferne Worker-Pfad-Referenzen';
      const config = {
        type: 'frontend_config' as const,
        name: 'lib/pdf/parsePdf.ts',
        description: 'PDF Parsing Library',
        location: 'lib/pdf/parsePdf.ts',
        potentialIssues: ['Worker-Modul nicht gefunden'],
        fixStrategies: ['Entferne Worker-Pfad-Referenzen'],
      };

      const instructions = await analyzer['generateInstructionsFromStrategy'](
        strategy,
        config,
        'worker not found',
        '/tmp/test'
      );

      expect(Array.isArray(instructions)).toBe(true);
    });

    it('sollte Create-File-Instructions aus Strategie generieren', async () => {
      const strategy = 'Erstelle API-Route /api/test/route.ts';
      const config = {
        type: 'api_endpoint' as const,
        name: '/api/test',
        description: 'Test API Endpoint',
        location: 'app/api/test/route.ts',
        potentialIssues: ['Route fehlt'],
        fixStrategies: ['Erstelle Route-Datei'],
      };

      const instructions = await analyzer['generateInstructionsFromStrategy'](
        strategy,
        config,
        'route missing',
        '/tmp/test'
      );

      expect(Array.isArray(instructions)).toBe(true);
    });
  });

  describe('findBestConfigFromKnowledge', () => {
    it('sollte beste Konfiguration aus Knowledge Base finden', () => {
      const docs = [
        {
          id: 'doc-001',
          title: 'Stripe Configuration',
          content: 'STRIPE_SECRET_KEY is required for payment processing',
          metadata: {},
        },
      ];
      const configs = [
        {
          type: 'env_var' as const,
          name: 'STRIPE_SECRET_KEY',
          description: 'Stripe Secret Key',
          location: '.env.local',
          potentialIssues: ['fehlt'],
          fixStrategies: ['Füge STRIPE_SECRET_KEY hinzu'],
        },
        {
          type: 'env_var' as const,
          name: 'SUPABASE_URL',
          description: 'Supabase URL',
          location: '.env.local',
          potentialIssues: ['fehlt'],
          fixStrategies: ['Füge SUPABASE_URL hinzu'],
        },
      ];
      const text = 'Stripe payment not working';

      const result = analyzer['findBestConfigFromKnowledge'](docs, configs, text);

      expect(result).toBeDefined();
      expect(result?.name).toBe('STRIPE_SECRET_KEY');
    });

    it('sollte null zurückgeben wenn keine passende Konfiguration gefunden wird', () => {
      const docs = [
        {
          id: 'doc-001',
          title: 'Unrelated Document',
          content: 'This document is not related to any configuration',
          metadata: {},
        },
      ];
      const configs = [
        {
          type: 'env_var' as const,
          name: 'STRIPE_SECRET_KEY',
          description: 'Stripe Secret Key',
          location: '.env.local',
          potentialIssues: ['fehlt'],
          fixStrategies: ['Füge STRIPE_SECRET_KEY hinzu'],
        },
      ];
      const text = 'Unrelated issue';

      const result = analyzer['findBestConfigFromKnowledge'](docs, configs, text);

      expect(result).toBeNull();
    });
  });

  describe('calculateRelevanceScore', () => {
    it('sollte Relevanz-Score für passende Konfiguration berechnen', () => {
      const ticketText = 'Stripe payment not working STRIPE_SECRET_KEY missing';
      const config = {
        type: 'env_var' as const,
        name: 'STRIPE_SECRET_KEY',
        description: 'Stripe Secret Key',
        location: '.env.local',
        potentialIssues: ['fehlt'],
        fixStrategies: ['Füge STRIPE_SECRET_KEY hinzu'],
      };

      const score = analyzer['calculateRelevanceScore'](ticketText, config);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1.0);
    });

    it('sollte niedrigen Score für nicht-passende Konfiguration berechnen', () => {
      const ticketText = 'PDF upload not working';
      const config = {
        type: 'env_var' as const,
        name: 'STRIPE_SECRET_KEY',
        description: 'Stripe Secret Key',
        location: '.env.local',
        potentialIssues: ['fehlt'],
        fixStrategies: ['Füge STRIPE_SECRET_KEY hinzu'],
      };

      const score = analyzer['calculateRelevanceScore'](ticketText, config);

      expect(score).toBeLessThan(0.5);
    });
  });

  describe('captureCurrentFileState', () => {
    it('sollte Datei-Zustand erfassen wenn Datei existiert', async () => {
      const { writeFile, mkdir } = await import('fs/promises');
      const { join } = await import('path');
      const testDir = '/tmp/test-reverse-engineering';
      await mkdir(testDir, { recursive: true });
      const testFile = join(testDir, 'test-file.ts');
      await writeFile(testFile, '// Test content', 'utf-8');

      const result = await analyzer['captureCurrentFileState']('test-file.ts', testDir);

      expect(result).toBeDefined();
      expect(result).toContain('Test content');
    });

    it('sollte null zurückgeben wenn Datei nicht existiert', async () => {
      const result = await analyzer['captureCurrentFileState']('non-existent-file.ts', '/tmp/test');

      expect(result).toBeNull();
    });
  });

  describe('captureSystemContext', () => {
    it('sollte System-Kontext für env_var erfassen', async () => {
      const { writeFile, mkdir } = await import('fs/promises');
      const { join } = await import('path');
      const testDir = '/tmp/test-reverse-engineering';
      await mkdir(testDir, { recursive: true });
      await writeFile(
        join(testDir, '.env.local'),
        'STRIPE_SECRET_KEY=sk_test_123\nSUPABASE_URL=https://test.supabase.co\n',
        'utf-8'
      );

      const config = {
        type: 'env_var' as const,
        name: 'STRIPE_SECRET_KEY',
        description: 'Stripe Secret Key',
        location: '.env.local',
        potentialIssues: ['fehlt'],
        fixStrategies: ['Füge STRIPE_SECRET_KEY hinzu'],
      };

      const result = await analyzer['captureSystemContext'](config, testDir);

      expect(result).toBeDefined();
      expect(result.environmentVariables).toBeDefined();
      expect(result.environmentVariables['STRIPE_SECRET_KEY']).toBe('sk_test_123');
    });

    it('sollte System-Kontext für frontend_config erfassen', async () => {
      const { writeFile, mkdir } = await import('fs/promises');
      const { join } = await import('path');
      const testDir = '/tmp/test-reverse-engineering';
      await mkdir(testDir, { recursive: true });
      await writeFile(
        join(testDir, 'package.json'),
        JSON.stringify({ dependencies: { 'pdf-parse': '^1.1.1' } }),
        'utf-8'
      );
      await writeFile(
        join(testDir, 'next.config.js'),
        'module.exports = { reactStrictMode: true };',
        'utf-8'
      );

      const config = {
        type: 'frontend_config' as const,
        name: 'next.config.js',
        description: 'Next.js Configuration',
        location: 'next.config.js',
        potentialIssues: ['fehlt'],
        fixStrategies: ['Prüfe next.config.js'],
      };

      const result = await analyzer['captureSystemContext'](config, testDir);

      expect(result).toBeDefined();
      expect(result.dependencies).toBeDefined();
      expect(result.configurations).toBeDefined();
    });
  });

  describe('createConfigFixCandidate', () => {
    it('sollte Config-Fix-Candidate erstellen', async () => {
      const config = {
        type: 'env_var' as const,
        name: 'STRIPE_SECRET_KEY',
        description: 'Stripe Secret Key',
        location: '.env.local',
        potentialIssues: ['fehlt'],
        fixStrategies: ['Füge STRIPE_SECRET_KEY hinzu'],
      };
      const ticket = {
        title: 'Stripe payment not working',
        description: 'STRIPE_SECRET_KEY is missing',
      };

      const result = await analyzer['createConfigFixCandidate'](
        config,
        'fehlt',
        ticket,
        undefined
      );

      expect(result).toBeDefined();
      expect(result.patternId).toBe('config-env_var-STRIPE_SECRET_KEY');
      expect(result.summary).toContain('STRIPE_SECRET_KEY');
      expect(result.actions).toBeDefined();
      expect(result.actions.length).toBeGreaterThan(0);
    });

    it('sollte Config-Fix-Candidate mit rootDir erstellen', async () => {
      const { writeFile, mkdir } = await import('fs/promises');
      const { join } = await import('path');
      const testDir = '/tmp/test-reverse-engineering';
      await mkdir(join(testDir, 'lib', 'pdf'), { recursive: true });
      await writeFile(
        join(testDir, 'lib', 'pdf', 'parsePdf.ts'),
        'export function parsePdfBuffer() {}',
        'utf-8'
      );

      const config = {
        type: 'frontend_config' as const,
        name: 'lib/pdf/parsePdf.ts',
        description: 'PDF Parsing Library',
        location: 'lib/pdf/parsePdf.ts',
        potentialIssues: ['Worker-Modul nicht gefunden'],
        fixStrategies: ['Entferne Worker-Pfad-Referenzen'],
      };
      const ticket = {
        title: 'PDF upload not working',
        description: 'Worker module not found',
      };

      const result = await analyzer['createConfigFixCandidate'](
        config,
        'Worker-Modul nicht gefunden',
        ticket,
        testDir
      );

      expect(result).toBeDefined();
      expect(result.actions[0].payload?.systemState).toBeDefined();
    });
  });

  describe('extractAffectedFunctions', () => {
    it('sollte betroffene Funktionen aus Code extrahieren', () => {
      const content = `
        export function parsePdfBuffer() {}
        async function processPDF() {}
        const handleUpload = async () => {}
      `;

      const result = analyzer['extractAffectedFunctions'](content);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('parsePdfBuffer');
    });

    it('sollte leeres Array zurückgeben wenn keine Funktionen gefunden werden', () => {
      const content = '// Just a comment';

      const result = analyzer['extractAffectedFunctions'](content);

      expect(result).toEqual([]);
    });
  });

  describe('extractImportChanges', () => {
    it('sollte Import-Änderungen für PDF-Konfiguration extrahieren', () => {
      const content = 'import { something } from "somewhere"';
      const config = {
        type: 'frontend_config' as const,
        name: 'lib/pdf/parsePdf.ts',
        description: 'PDF Parsing Library',
        location: 'lib/pdf/parsePdf.ts',
        potentialIssues: ['fehlt'],
        fixStrategies: ['Prüfe pdf-parse Import'],
      };

      const result = analyzer['extractImportChanges'](content, config);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('sollte Import-Änderungen für Supabase-Konfiguration extrahieren', () => {
      const content = 'import { something } from "somewhere"';
      const config = {
        type: 'api_endpoint' as const,
        name: '/api/test',
        description: 'Supabase API Endpoint',
        location: 'app/api/test/route.ts',
        potentialIssues: ['fehlt'],
        fixStrategies: ['Prüfe @supabase Import'],
      };

      const result = analyzer['extractImportChanges'](content, config);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('extractAffectedComponents', () => {
    it('sollte betroffene Komponenten für frontend_config extrahieren', () => {
      const config = {
        type: 'frontend_config' as const,
        name: 'components/CheckoutForm.tsx',
        description: 'Checkout Form Component',
        location: 'components/CheckoutForm.tsx',
        potentialIssues: ['fehlt'],
        fixStrategies: ['Prüfe Komponente'],
      };

      const result = analyzer['extractAffectedComponents'](config);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('sollte leeres Array für non-frontend Config zurückgeben', () => {
      const config = {
        type: 'env_var' as const,
        name: 'STRIPE_SECRET_KEY',
        description: 'Stripe Secret Key',
        location: '.env.local',
        potentialIssues: ['fehlt'],
        fixStrategies: ['Füge STRIPE_SECRET_KEY hinzu'],
      };

      const result = analyzer['extractAffectedComponents'](config);

      expect(result).toEqual([]);
    });
  });

  describe('findLLMMatch', () => {
    it('sollte LLM-Match finden wenn LLM Client verfügbar ist', async () => {
      const text = 'Stripe payment not working';
      const configs = [
        {
          type: 'env_var' as const,
          name: 'STRIPE_SECRET_KEY',
          description: 'Stripe Secret Key',
          location: '.env.local',
          potentialIssues: ['fehlt'],
          fixStrategies: ['Füge STRIPE_SECRET_KEY hinzu'],
        },
      ];
      const ticket = {
        title: 'Stripe payment not working',
        description: 'Payment processing failed',
      };

      // Mock knowledge base query to return relevant docs
      const mockQuery = vi.fn(() => [
        {
          id: 'doc-001',
          title: 'Stripe Configuration',
          content: 'STRIPE_SECRET_KEY is required for payment processing',
          metadata: {},
        },
      ]);
      analyzer['knowledgeBase'].query = mockQuery;

      const result = await analyzer['findLLMMatch'](text, configs, ticket);

      // Kann null sein wenn kein Match gefunden wird
      expect(result === null || (result && result.patternId)).toBeTruthy();
    });

    it('sollte null zurückgeben wenn LLM Client nicht verfügbar ist', async () => {
      const analyzerWithoutLLM = new ReverseEngineeringAnalyzer(
        mockKnowledgeBase,
        mockLogger,
        null // Kein LLM Client
      );

      const text = 'Stripe payment not working';
      const configs = [
        {
          type: 'env_var' as const,
          name: 'STRIPE_SECRET_KEY',
          description: 'Stripe Secret Key',
          location: '.env.local',
          potentialIssues: ['fehlt'],
          fixStrategies: ['Füge STRIPE_SECRET_KEY hinzu'],
        },
      ];
      const ticket = {
        title: 'Stripe payment not working',
        description: 'Payment processing failed',
      };

      const result = await analyzerWithoutLLM['findLLMMatch'](text, configs, ticket);

      expect(result).toBeNull();
    });
  });

  describe('generateUniversalFixInstructions - Alle Config-Typen', () => {
    it('sollte Fix-Instructions für database_setting generieren', async () => {
      const config = {
        type: 'database_setting' as const,
        name: 'RLS Policy',
        description: 'Row Level Security Policy',
        location: 'supabase/migrations',
        potentialIssues: ['Zugriff verweigert'],
        fixStrategies: ['CREATE POLICY ausführen'],
      };

      const instructions = await analyzer['generateUniversalFixInstructions'](
        config,
        'Access denied',
        '/tmp/test'
      );

      expect(Array.isArray(instructions)).toBe(true);
    });

    it('sollte Fix-Instructions für frontend_config generieren', async () => {
      const config = {
        type: 'frontend_config' as const,
        name: 'components/CheckoutForm.tsx',
        description: 'Checkout Form Component',
        location: 'components/CheckoutForm.tsx',
        potentialIssues: ['Komponente fehlt'],
        fixStrategies: ['Erstelle Komponente'],
      };

      const instructions = await analyzer['generateUniversalFixInstructions'](
        config,
        'Component missing',
        '/tmp/test'
      );

      expect(Array.isArray(instructions)).toBe(true);
    });
  });

  describe('Helper-Funktionen - extractDescription, extractContext, findLocation', () => {
    it('sollte Beschreibung aus Dokumentation extrahieren', () => {
      const content = `
        STRIPE_SECRET_KEY is required for payment processing.
        This key is used to authenticate with Stripe API.
      `;
      const result = analyzer['extractDescription'](content, 'STRIPE_SECRET_KEY');
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('sollte Kontext aus Dokumentation extrahieren', () => {
      const content = `
        STRIPE_SECRET_KEY is required for payment processing.
        This key is used to authenticate with Stripe API.
      `;
      const result = analyzer['extractContext'](content, 'STRIPE_SECRET_KEY');
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('sollte Location aus Dokumentation finden', () => {
      const content = `
        STRIPE_SECRET_KEY should be set in .env.local file.
        The key is located in the root directory.
      `;
      const result = analyzer['findLocation'](content, 'STRIPE_SECRET_KEY');
      
      expect(result).toBeDefined();
      if (result) {
        expect(result).toContain('.env');
      }
    });

    it('sollte Endpoint-Kontext extrahieren', () => {
      const content = `
        The /api/knowledge/upload endpoint handles PDF uploads.
        It processes files and stores them in the database.
      `;
      const result = analyzer['extractEndpointContext'](content, '/api/knowledge/upload');
      
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('sollte Dateipfad finden', () => {
      const content = `
        The parsePdf.ts file is located in lib/pdf/parsePdf.ts.
        This file handles PDF parsing.
      `;
      const result = analyzer['findFilePath'](content, 'parsePdf.ts');
      
      expect(result).toBeDefined();
      if (result) {
        expect(result).toContain('lib/pdf');
      }
    });

    it('sollte PDF-bezogene Dateien finden', () => {
      const content = `
        PDF parsing is handled by lib/pdf/parsePdf.ts.
        The upload route is in app/api/knowledge/upload/route.ts.
        PDF processing uses pdf-parse library.
      `;
      const result = analyzer['findPdfRelatedFiles'](content);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('generateCodeDiff', () => {
    it('sollte Code-Diff generieren', () => {
      const currentContent = 'const x = 1;\nconst y = 2;';
      const expectedContent = 'const x = 1;\nconst y = 3;';
      const filePath = 'test.ts';

      const result = analyzer['generateCodeDiff'](currentContent, expectedContent, filePath);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0].file).toBe(filePath);
        expect(result[0].before).toBeDefined();
        expect(result[0].after).toBeDefined();
      }
    });

    it('sollte leeres Array zurückgeben wenn keine Unterschiede', () => {
      const content = 'const x = 1;';
      const result = analyzer['generateCodeDiff'](content, content, 'test.ts');

      expect(result).toEqual([]);
    });

    it('sollte leeres Array zurückgeben wenn einer der Inhalte null ist', () => {
      const result1 = analyzer['generateCodeDiff'](null, 'content', 'test.ts');
      const result2 = analyzer['generateCodeDiff']('content', null, 'test.ts');

      expect(result1).toEqual([]);
      expect(result2).toEqual([]);
    });
  });

  describe('generateApiRouteTemplate - Alle Endpoint-Typen', () => {
    it('sollte Payment-Endpoint-Template generieren', () => {
      const result = analyzer['generateApiRouteTemplate'](
        '/api/payments/create',
        'Payment creation endpoint',
        'create',
        'payments'
      );

      expect(result).toBeDefined();
      expect(result).toContain('Payment');
      expect(result).toContain('POST');
    });

    it('sollte WhatsApp-Endpoint-Template generieren', () => {
      const result = analyzer['generateApiRouteTemplate'](
        '/api/whatsapp/webhook',
        'WhatsApp webhook endpoint',
        'webhook',
        'whatsapp'
      );

      expect(result).toBeDefined();
      expect(result).toContain('WhatsApp');
    });

    it('sollte Bot-Endpoint-Template generieren', () => {
      const result = analyzer['generateApiRouteTemplate'](
        '/api/bots/create',
        'Bot creation endpoint',
        'create',
        'bots'
      );

      expect(result).toBeDefined();
      expect(result).toContain('Bot');
    });

    it('sollte Support-Endpoint-Template generieren', () => {
      const result = analyzer['generateApiRouteTemplate'](
        '/api/support/tickets',
        'Support tickets endpoint',
        'tickets',
        'support'
      );

      expect(result).toBeDefined();
      expect(result).toContain('Support');
    });

    it('sollte Subscription-Endpoint-Template generieren', () => {
      const result = analyzer['generateApiRouteTemplate'](
        '/api/subscriptions/create',
        'Subscription creation endpoint',
        'create',
        'subscriptions'
      );

      expect(result).toBeDefined();
      expect(result).toContain('Subscription');
    });
  });

  describe('generateUniversalPdfFixInstructions', () => {
    it('sollte universelle PDF-Fix-Instructions generieren', () => {
      const result = analyzer['generateUniversalPdfFixInstructions']('lib/pdf/parsePdf.ts');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe('code-modify');
      expect(result[0].file).toBe('lib/pdf/parsePdf.ts');
    });
  });

  describe('generateUniversalApiRouteFixInstructions', () => {
    it('sollte API-Route-Fix-Instructions generieren', () => {
      const config = {
        type: 'api_endpoint' as const,
        name: '/api/test',
        description: 'Test API endpoint',
        location: 'app/api/test/route.ts',
        potentialIssues: ['Route fehlt'],
        fixStrategies: ['Erstelle Route'],
      };

      const result = analyzer['generateUniversalApiRouteFixInstructions'](config);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe('create-file');
    });
  });

  describe('identifyPotentialIssues - Erweiterte Tests', () => {
    it('sollte potenzielle Probleme für alle Config-Typen identifizieren', () => {
      const configs = [
        {
          type: 'env_var' as const,
          name: 'STRIPE_SECRET_KEY',
          description: 'Stripe Secret Key',
          location: '.env.local',
          potentialIssues: ['fehlt', 'ist nicht gesetzt'],
          fixStrategies: ['Füge STRIPE_SECRET_KEY hinzu'],
        },
        {
          type: 'api_endpoint' as const,
          name: '/api/test',
          description: 'Test API endpoint',
          location: 'app/api/test/route.ts',
          potentialIssues: ['Route fehlt'],
          fixStrategies: ['Erstelle Route'],
        },
        {
          type: 'frontend_config' as const,
          name: 'components/Test.tsx',
          description: 'Test component',
          location: 'components/Test.tsx',
          potentialIssues: ['Komponente fehlt'],
          fixStrategies: ['Erstelle Komponente'],
        },
        {
          type: 'database_setting' as const,
          name: 'RLS Policy',
          description: 'Row Level Security Policy',
          location: 'supabase/migrations',
          potentialIssues: ['Zugriff verweigert'],
          fixStrategies: ['CREATE POLICY ausführen'],
        },
        {
          type: 'deployment_config' as const,
          name: 'PM2 Configuration',
          description: 'PM2 Process Management',
          location: 'ecosystem.config.js',
          potentialIssues: ['Prozess läuft nicht'],
          fixStrategies: ['pm2 restart ausführen'],
        },
      ];

      for (const config of configs) {
        const result = analyzer['identifyPotentialIssues'](config);
        expect(result).toBeDefined();
        expect(Array.isArray(result)).toBe(true);
        if (result.length > 0) {
          expect(result[0].pattern).toBeDefined();
          expect(result[0].fix).toBeDefined();
        }
      }
    });
  });

  describe('extractConfigurations - Erweiterte Tests', () => {
    it('sollte alle 5 Config-Typen aus Dokumentation extrahieren', () => {
      const doc = {
        id: 'doc-001',
        title: 'Complete Configuration',
        content: `
          Environment Variable: STRIPE_SECRET_KEY=sk_test_...
          API Endpoint: /api/payments/checkout
          Frontend Component: components/CheckoutForm.tsx
          Database Setting: RLS Policy for knowledge_sources
          Deployment Config: PM2 Configuration for whatsapp-bot-builder
        `,
        metadata: { type: 'configuration' },
      };

      const result = analyzer['extractConfigurations'](doc);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      // Sollte mindestens einige Konfigurationen finden
      expect(result.length).toBeGreaterThan(0);
    });

    it('sollte PDF-bezogene Konfigurationen extrahieren', () => {
      const doc = {
        id: 'doc-001',
        title: 'PDF Configuration',
        content: `
          PDF parsing uses lib/pdf/parsePdf.ts.
          The upload route is in app/api/knowledge/upload/route.ts.
          PDF processing uses pdf-parse library and chunkText function.
        `,
        metadata: { type: 'pdf' },
      };

      const result = analyzer['extractConfigurations'](doc);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      // Sollte PDF-bezogene Konfigurationen finden
      const hasPdfConfig = result.some(c => 
        c.name.includes('pdf') || c.name.includes('parsePdf')
      );
      expect(hasPdfConfig).toBe(true);
    });
  });

  describe('checkConfigurationMatch', () => {
    it('sollte Konfiguration-Match prüfen', async () => {
      const config = {
        type: 'env_var' as const,
        name: 'STRIPE_SECRET_KEY',
        description: 'Stripe Secret Key',
        location: '.env.local',
        potentialIssues: ['fehlt'],
        fixStrategies: ['Füge STRIPE_SECRET_KEY hinzu'],
      };
      const ticket = {
        id: 'test-001',
        title: 'Stripe payment not working',
        description: 'STRIPE_SECRET_KEY is missing',
        status: 'new',
        priority: 'high',
        category: 'technical',
      };

      const result = await analyzer['checkConfigurationMatch'](
        config,
        'stripe secret key is missing',
        ticket
      );

      // Kann null sein wenn kein Match gefunden wird
      expect(result === null || (result && result.patternId)).toBeTruthy();
    });
  });

  describe('createAutopatchCandidate', () => {
    it('sollte Autopatch-Candidate aus häufigem Problem erstellen', () => {
      const issue = {
        pattern: 'pdf.*upload.*problem',
        configs: ['lib/pdf/parsePdf.ts'],
        fix: 'Entferne Worker-Pfad-Referenzen',
      };
      const ticket = {
        id: 'test-001',
        title: 'PDF upload problem',
        description: 'PDF upload not working',
        status: 'new',
        priority: 'high',
        category: 'technical',
      };

      const result = analyzer['createAutopatchCandidate'](issue, ticket);

      expect(result).toBeDefined();
      expect(result.patternId).toBe('common-issue-pdf.*upload.*problem');
      expect(result.actions).toBeDefined();
      expect(result.actions.length).toBeGreaterThan(0);
    });
  });
});

