/**
 * Performance-Metriken Tests
 * 
 * Misst Performance-Zeiten für Matching, Verifikation und Fix-Generierung
 */

import { describe, it, expect } from 'vitest';
import { ReverseEngineeringAnalyzer } from '../../reverseEngineeringAnalyzer.js';
import { ProblemVerifier } from '../../problemVerifier.js';
import { createMockLogger, createMockKnowledgeBase, createMockLlmClient } from '../setup.js';
import { createTestTicket, createTestDirectory, cleanupTestDirectory } from '../utils.js';
import { POSITIVE_TICKETS } from '../fixtures/tickets.js';
import { MOCK_KNOWLEDGE_DOCS } from '../fixtures/mocks.js';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

describe('Performance-Metriken', () => {
  let analyzer: ReverseEngineeringAnalyzer;
  let verifier: ProblemVerifier;
  let mockRootDir: string;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(async () => {
    mockRootDir = await createTestDirectory('test-performance-' + Date.now());
    await mkdir(join(mockRootDir, 'app', 'api', 'knowledge', 'upload'), { recursive: true });
    await mkdir(join(mockRootDir, 'lib', 'pdf'), { recursive: true });
    
    await writeFile(
      join(mockRootDir, 'app', 'api', 'knowledge', 'upload', 'route.ts'),
      `export async function POST() { return Response.json({ success: true }); }`,
      'utf-8'
    );
    
    mockLogger = createMockLogger();
    const mockKnowledgeBase = createMockKnowledgeBase(MOCK_KNOWLEDGE_DOCS);
    const mockLlmClient = createMockLlmClient();
    
    analyzer = new ReverseEngineeringAnalyzer(mockKnowledgeBase, mockLogger, mockLlmClient);
    verifier = new ProblemVerifier(mockRootDir, mockLogger, analyzer);
  });

  afterEach(async () => {
    if (mockRootDir) {
      await cleanupTestDirectory(mockRootDir.replace('/tmp/', ''));
    }
  });

  it('sollte Matching-Zeit < 1s sein', async () => {
    const ticket = POSITIVE_TICKETS.pdfUploadWorkerNotFound;
    
    const startTime = Date.now();
    const match = await analyzer.matchTicketToConfiguration(ticket);
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(1000); // < 1s
    expect(match).toBeDefined();
  });

  it('sollte Verifikations-Zeit < 2s sein', async () => {
    const ticket = POSITIVE_TICKETS.pdfUploadWorkerNotFound;
    const patternId = 'config-frontend_config-lib/pdf/parsePdf.ts';
    
    const startTime = Date.now();
    const verification = await verifier.verifyProblem(ticket, patternId);
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(2000); // < 2s
    expect(verification).toBeDefined();
  });

  it('sollte Fix-Generierungs-Zeit < 3s sein', async () => {
    const config = {
      type: 'deployment_config' as const,
      name: 'PM2 Configuration',
      description: 'PM2 Prozess-Management',
      location: 'ecosystem.config.js',
      potentialIssues: ['Prozess läuft nicht'],
      fixStrategies: ['pm2 restart ausführen'],
    };
    
    const startTime = Date.now();
    const instructions = await analyzer['generateUniversalFixInstructions'](
      config,
      'PM2 Prozess reagiert nicht',
      mockRootDir
    );
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(3000); // < 3s
    expect(Array.isArray(instructions)).toBe(true);
  });

  it('sollte Gesamt-Ticket-Verarbeitungs-Zeit < 10s sein', async () => {
    const ticket = POSITIVE_TICKETS.pdfUploadWorkerNotFound;
    
    const startTime = Date.now();
    
    // Schritt 1: Matching
    const match = await analyzer.matchTicketToConfiguration(ticket);
    
    if (match) {
      // Schritt 2: Verifikation
      const verification = await verifier.verifyProblem(ticket, match.patternId);
      
      // Schritt 3: Post-Fix-Verifikation (wenn Fix vorhanden)
      if (match.autoFixInstructions && match.autoFixInstructions.length > 0) {
        const autoFixResult = {
          success: true,
          modifiedFiles: ['lib/pdf/parsePdf.ts'],
        };
        await verifier.verifyPostFix(
          ticket,
          match.patternId,
          autoFixResult,
          match.autoFixInstructions
        );
      }
    }
    
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(10000); // < 10s
  });
});

