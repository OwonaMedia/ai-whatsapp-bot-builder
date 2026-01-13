/**
 * E2E Tests: Komplette Ticket-Verarbeitung
 * 
 * Testet den kompletten Flow: Ticket → Matching → Verifikation → Fix → Post-Fix
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ReverseEngineeringAnalyzer } from '../../reverseEngineeringAnalyzer.js';
import { ProblemVerifier } from '../../problemVerifier.js';
import { executeAutoFixInstructions } from '../../autopatchExecutor.js';
import { createMockLogger, createMockKnowledgeBase, createMockLlmClient, createMockSupabaseClient } from '../setup.js';
import { createTestTicket, createTestDirectory, cleanupTestDirectory } from '../utils.js';
import { POSITIVE_TICKETS } from '../fixtures/tickets.js';
import { MOCK_KNOWLEDGE_DOCS } from '../fixtures/mocks.js';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

describe('E2E: Komplette Ticket-Verarbeitung', () => {
  let analyzer: ReverseEngineeringAnalyzer;
  let verifier: ProblemVerifier;
  let mockRootDir: string;
  let mockLogger: ReturnType<typeof createMockLogger>;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(async () => {
    mockRootDir = await createTestDirectory('test-e2e-' + Date.now());
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
    mockSupabase = createMockSupabaseClient();
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

  it('sollte PDF-Upload-Problem komplett verarbeiten (E2E)', async () => {
    const ticket = POSITIVE_TICKETS.pdfUploadWorkerNotFound;
    
    // Schritt 1: Matching
    const match = await analyzer.matchTicketToConfiguration(ticket);
    expect(match).toBeDefined();
    
    if (match) {
      // Schritt 2: Verifikation
      const verification = await verifier.verifyProblem(ticket, match.patternId);
      expect(verification.problemExists).toBe(true);
      
      // Schritt 3: Fix-Generierung (bereits in match enthalten)
      if (match.autoFixInstructions && match.autoFixInstructions.length > 0) {
        // Schritt 4: Fix-Ausführung
        const fixResult = await executeAutoFixInstructions(
          mockRootDir,
          match.autoFixInstructions,
          mockLogger,
          { ticketId: 'test-ticket-123', supabase: mockSupabase }
        );
        expect(fixResult.success).toBe(true);
        
        // Schritt 5: Post-Fix-Verifikation
        const postFixVerification = await verifier.verifyPostFix(
          ticket,
          match.patternId,
          fixResult,
          match.autoFixInstructions
        );
        
        expect(postFixVerification).toBeDefined();
        expect(postFixVerification.evidence.length).toBeGreaterThan(0);
      }
    }
  });

  it('sollte PM2-Restart-Problem komplett verarbeiten (E2E)', async () => {
    const ticket = POSITIVE_TICKETS.pm2RestartRequired;
    
    // Schritt 1: Matching
    const match = await analyzer.matchTicketToConfiguration(ticket);
    
    if (match) {
      // Schritt 2: Verifikation
      const verification = await verifier.verifyProblem(ticket, match.patternId);
      expect(verification).toBeDefined();
      
      // Schritt 3: Fix-Generierung
      if (match.autoFixInstructions && match.autoFixInstructions.length > 0) {
        // Hetzner-Commands erfordern Telegram-Approval, daher wird Execution hier übersprungen
        // Aber wir können prüfen, ob Instructions korrekt generiert wurden
        const hasHetznerCommand = match.autoFixInstructions.some(
          inst => inst.type === 'hetzner-command'
        );
        expect(hasHetznerCommand).toBe(true);
      }
    }
  });
});

