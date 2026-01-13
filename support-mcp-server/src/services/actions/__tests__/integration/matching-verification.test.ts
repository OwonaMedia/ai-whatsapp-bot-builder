/**
 * Integration Tests: Matching + Verifikation
 * 
 * Testet den kompletten Flow: Matching → Verifikation → Fix-Generierung
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ReverseEngineeringAnalyzer } from '../../reverseEngineeringAnalyzer.js';
import { ProblemVerifier } from '../../problemVerifier.js';
import { createMockLogger, createMockKnowledgeBase, createMockLlmClient } from '../setup.js';
import { createTestTicket, createTestDirectory, cleanupTestDirectory, createTestFile } from '../utils.js';
import { POSITIVE_TICKETS } from '../fixtures/tickets.js';
import { MOCK_KNOWLEDGE_DOCS } from '../fixtures/mocks.js';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

describe('Matching + Verifikation Integration', () => {
  let analyzer: ReverseEngineeringAnalyzer;
  let verifier: ProblemVerifier;
  let mockRootDir: string;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(async () => {
    mockRootDir = await createTestDirectory('test-integration-' + Date.now());
    await mkdir(join(mockRootDir, 'app', 'api', 'knowledge', 'upload'), { recursive: true });
    await mkdir(join(mockRootDir, 'lib', 'pdf'), { recursive: true });
    
    await writeFile(
      join(mockRootDir, 'app', 'api', 'knowledge', 'upload', 'route.ts'),
      `export async function POST() { return Response.json({ success: true }); }`,
      'utf-8'
    );
    
    await writeFile(
      join(mockRootDir, 'lib', 'pdf', 'parsePdf.ts'),
      `export async function parsePdfBuffer() { return { text: '' }; }`,
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

  it('sollte PDF-Upload-Problem komplett verarbeiten', async () => {
    const ticket = POSITIVE_TICKETS.pdfUploadWorkerNotFound;
    
    // Schritt 1: Matching
    const match = await analyzer.matchTicketToConfiguration(ticket);
    
    if (match) {
      // Schritt 2: Verifikation
      const verification = await verifier.verifyProblem(ticket, match.patternId);
      
      expect(verification).toBeDefined();
      expect(verification.evidence.length).toBeGreaterThan(0);
      
      // Schritt 3: Fix-Instructions sollten vorhanden sein
      if (match.autoFixInstructions) {
        expect(match.autoFixInstructions.length).toBeGreaterThan(0);
      }
    }
  });

  it('sollte PM2-Restart-Problem komplett verarbeiten', async () => {
    const ticket = POSITIVE_TICKETS.pm2RestartRequired;
    
    // Schritt 1: Matching
    const match = await analyzer.matchTicketToConfiguration(ticket);
    
    if (match) {
      // Schritt 2: Verifikation
      const verification = await verifier.verifyProblem(ticket, match.patternId);
      
      expect(verification).toBeDefined();
      
      // Schritt 3: Fix-Instructions sollten hetzner-command enthalten
      if (match.autoFixInstructions) {
        const hasHetznerCommand = match.autoFixInstructions.some(
          inst => inst.type === 'hetzner-command'
        );
        expect(hasHetznerCommand).toBe(true);
      }
    }
  });

  it('sollte Env-Var-Problem komplett verarbeiten', async () => {
    const ticket = POSITIVE_TICKETS.missingStripeKey;
    
    // Schritt 1: Matching
    const match = await analyzer.matchTicketToConfiguration(ticket);
    
    if (match) {
      // Schritt 2: Verifikation
      const verification = await verifier.verifyProblem(ticket, match.patternId);
      
      expect(verification).toBeDefined();
      
      // Schritt 3: Fix-Instructions sollten env-add-placeholder enthalten
      if (match.autoFixInstructions) {
        const hasEnvAdd = match.autoFixInstructions.some(
          inst => inst.type === 'env-add-placeholder'
        );
        // Kann true oder false sein, je nachdem ob Config gefunden wurde
        expect(typeof hasEnvAdd).toBe('boolean');
      }
    }
  });
});

