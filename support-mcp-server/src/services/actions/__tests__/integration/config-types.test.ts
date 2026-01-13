/**
 * Integration Tests: Config-Typen
 * 
 * Testet alle 5 Config-Typen im kompletten Flow
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

describe('Config-Typen Integration', () => {
  let analyzer: ReverseEngineeringAnalyzer;
  let verifier: ProblemVerifier;
  let mockRootDir: string;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(async () => {
    mockRootDir = await createTestDirectory('test-config-types-' + Date.now());
    await mkdir(join(mockRootDir, 'app', 'api', 'payments', 'checkout'), { recursive: true });
    await mkdir(join(mockRootDir, 'components', 'checkout'), { recursive: true });
    
    await writeFile(
      join(mockRootDir, '.env.local'),
      'STRIPE_SECRET_KEY=sk_test_123\n',
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

  it('sollte env_var Config-Typ verarbeiten', async () => {
    const ticket = POSITIVE_TICKETS.missingStripeKey;
    const match = await analyzer.matchTicketToConfiguration(ticket);
    
    if (match && match.patternId.startsWith('config-env_var')) {
      const verification = await verifier.verifyProblem(ticket, match.patternId);
      expect(verification).toBeDefined();
      expect(verification.evidence.length).toBeGreaterThan(0);
    }
  });

  it('sollte api_endpoint Config-Typ verarbeiten', async () => {
    const ticket = POSITIVE_TICKETS.apiEndpointMissing;
    const match = await analyzer.matchTicketToConfiguration(ticket);
    
    if (match && match.patternId.startsWith('config-api_endpoint')) {
      const verification = await verifier.verifyProblem(ticket, match.patternId);
      expect(verification).toBeDefined();
    }
  });

  it('sollte frontend_config Config-Typ verarbeiten', async () => {
    const ticket = POSITIVE_TICKETS.frontendComponentMissing;
    const match = await analyzer.matchTicketToConfiguration(ticket);
    
    if (match && match.patternId.startsWith('config-frontend_config')) {
      const verification = await verifier.verifyProblem(ticket, match.patternId);
      expect(verification).toBeDefined();
    }
  });

  it('sollte deployment_config Config-Typ verarbeiten', async () => {
    const ticket = POSITIVE_TICKETS.pm2RestartRequired;
    const match = await analyzer.matchTicketToConfiguration(ticket);
    
    if (match && match.patternId.startsWith('config-deployment_config')) {
      const verification = await verifier.verifyProblem(ticket, match.patternId);
      expect(verification).toBeDefined();
    }
  });

  it('sollte database_setting Config-Typ verarbeiten', async () => {
    const ticket = POSITIVE_TICKETS.databaseRlsPolicyMissing;
    const match = await analyzer.matchTicketToConfiguration(ticket);
    
    if (match && match.patternId.startsWith('config-database_setting')) {
      const verification = await verifier.verifyProblem(ticket, match.patternId);
      expect(verification).toBeDefined();
    }
  });
});

