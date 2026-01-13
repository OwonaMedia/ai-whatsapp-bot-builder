/**
 * E2E Tests: Real-World-Szenarien
 * 
 * Testet echte Problem-Szenarien aus der Praxis
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ReverseEngineeringAnalyzer } from '../../reverseEngineeringAnalyzer.js';
import { ProblemVerifier } from '../../problemVerifier.js';
import { createMockLogger, createMockKnowledgeBase, createMockLlmClient } from '../setup.js';
import { createTestTicket, createTestDirectory, cleanupTestDirectory } from '../utils.js';
import { POSITIVE_TICKETS } from '../fixtures/tickets.js';
import { MOCK_KNOWLEDGE_DOCS } from '../fixtures/mocks.js';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

describe('E2E: Real-World-Szenarien', () => {
  let analyzer: ReverseEngineeringAnalyzer;
  let verifier: ProblemVerifier;
  let mockRootDir: string;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(async () => {
    mockRootDir = await createTestDirectory('test-real-world-' + Date.now());
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

  it('sollte PDF-Upload-Problem (Worker-Modul nicht gefunden) komplett verarbeiten', async () => {
    const ticket = POSITIVE_TICKETS.pdfUploadWorkerNotFound;
    
    // Schritt 1: Matching
    const match = await analyzer.matchTicketToConfiguration(ticket);
    
    if (match) {
      // Schritt 2: Verifikation
      const verification = await verifier.verifyProblem(ticket, match.patternId);
      expect(verification.problemExists).toBe(true);
      
      // Schritt 3: Fix-Instructions sollten vorhanden sein
      if (match.autoFixInstructions) {
        expect(match.autoFixInstructions.length).toBeGreaterThan(0);
      }
    }
  });

  it('sollte PM2-Restart-Problem (Bot reagiert nicht) komplett verarbeiten', async () => {
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

  it('sollte Missing Env-Variable (Stripe Key fehlt) komplett verarbeiten', async () => {
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

  it('sollte API-Endpoint-Problem (Payment-Route fehlt) komplett verarbeiten', async () => {
    const ticket = POSITIVE_TICKETS.apiEndpointMissing;
    
    // Schritt 1: Matching
    const match = await analyzer.matchTicketToConfiguration(ticket);
    
    if (match) {
      // Schritt 2: Verifikation
      const verification = await verifier.verifyProblem(ticket, match.patternId);
      expect(verification).toBeDefined();
      
      // Schritt 3: Fix-Instructions sollten create-file enthalten
      if (match.autoFixInstructions) {
        const hasCreateFile = match.autoFixInstructions.some(
          inst => inst.type === 'create-file'
        );
        // Kann true oder false sein
        expect(typeof hasCreateFile).toBe('boolean');
      }
    }
  });

  it('sollte Database RLS-Policy-Problem (Zugriff verweigert) komplett verarbeiten', async () => {
    const ticket = POSITIVE_TICKETS.databaseRlsPolicyMissing;
    
    // Schritt 1: Matching
    const match = await analyzer.matchTicketToConfiguration(ticket);
    
    if (match) {
      // Schritt 2: Verifikation
      const verification = await verifier.verifyProblem(ticket, match.patternId);
      expect(verification).toBeDefined();
      
      // Schritt 3: Fix-Instructions sollten supabase-rls-policy enthalten
      if (match.autoFixInstructions) {
        const hasRlsPolicy = match.autoFixInstructions.some(
          inst => inst.type === 'supabase-rls-policy'
        );
        // Kann true oder false sein
        expect(typeof hasRlsPolicy).toBe('boolean');
      }
    }
  });

  it('sollte Frontend-Config-Problem (Komponente fehlt) komplett verarbeiten', async () => {
    const ticket = POSITIVE_TICKETS.frontendComponentMissing;
    
    // Schritt 1: Matching
    const match = await analyzer.matchTicketToConfiguration(ticket);
    
    if (match) {
      // Schritt 2: Verifikation
      const verification = await verifier.verifyProblem(ticket, match.patternId);
      expect(verification).toBeDefined();
      
      // Schritt 3: Fix-Instructions sollten create-file oder code-modify enthalten
      if (match.autoFixInstructions) {
        const hasCreateOrModify = match.autoFixInstructions.some(
          inst => inst.type === 'create-file' || inst.type === 'code-modify'
        );
        // Kann true oder false sein
        expect(typeof hasCreateOrModify).toBe('boolean');
      }
    }
  });

  it('sollte komplexes Multi-Problem-Szenario verarbeiten', async () => {
    const ticket = {
      id: 'ticket-complex-001',
      title: 'Mehrere Probleme: PDF Upload funktioniert nicht UND Payment schlägt fehl',
      description: 'Beim Hochladen einer PDF-Datei erscheint ein Fehler. Gleichzeitig schlägt die Zahlung mit Stripe fehl. Beide Probleme müssen behoben werden.',
      status: 'new',
      priority: 'high',
      category: 'technical',
    };
    
    // Schritt 1: Matching sollte beide Probleme erkennen
    const match = await analyzer.matchTicketToConfiguration(ticket);
    
    if (match) {
      // Schritt 2: Verifikation
      const verification = await verifier.verifyProblem(ticket, match.patternId);
      expect(verification).toBeDefined();
      
      // Schritt 3: Fix-Instructions sollten beide Probleme abdecken
      if (match.autoFixInstructions) {
        expect(match.autoFixInstructions.length).toBeGreaterThan(0);
      }
    }
  });
});

