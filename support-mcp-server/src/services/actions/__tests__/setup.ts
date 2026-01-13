/**
 * Test Setup
 * 
 * Initialisiert Test-Environment, Mock-Services und Test-Daten
 */

import { beforeEach, afterEach, vi } from 'vitest';
import type { Logger } from '../../../utils/logger.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { KnowledgeDocument } from '../../../knowledgeBase.js';
import type { LlmClient } from '../../../llmClient.js';

// Mock Logger
export const createMockLogger = (): Logger => {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    child: vi.fn(() => createMockLogger()),
  } as unknown as Logger;
};

// Mock Supabase Client
export const createMockSupabaseClient = (): SupabaseClient => {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    },
  } as unknown as SupabaseClient;
};

// Mock Knowledge Base
export const createMockKnowledgeBase = (docs: KnowledgeDocument[] = []): {
  query: (query: string, limit?: number) => KnowledgeDocument[];
} => {
  return {
    query: vi.fn((query: string, limit?: number) => {
      // Einfache Mock-Implementierung: Filtere Docs basierend auf Query
      const queryLower = query.toLowerCase();
      const filtered = docs.filter(doc => 
        doc.content.toLowerCase().includes(queryLower) ||
        doc.title?.toLowerCase().includes(queryLower)
      );
      return limit ? filtered.slice(0, limit) : filtered;
    }),
  };
};

// Mock LLM Client
export const createMockLlmClient = (): LlmClient => {
  return {
    analyzeTicket: vi.fn(() => Promise.resolve({
      summary: 'Test summary',
      actions: [],
      customerMessage: 'Test message',
    })),
    matchTicketToConfig: vi.fn(() => Promise.resolve(null)),
  } as unknown as LlmClient;
};

// Test Environment Setup
export const setupTestEnvironment = () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup after each test
    vi.restoreAllMocks();
  });
};

// Test Root Directory (für File-System-Tests)
export const TEST_ROOT_DIR = '/tmp/test-support-mcp-server';

