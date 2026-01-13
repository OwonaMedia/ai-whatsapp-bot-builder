import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSupportContext } from '../supportContext.js';
import type { Logger } from '../../utils/logger.js';
import * as configModule from '../config.js';
import * as supabaseClientModule from '../supabaseClient.js';
import { KnowledgeBase } from '../knowledgeBase.js';
import { LlmClient } from '../llmClient.js';

// Mock loadConfig
vi.mock('../config.js', () => ({
  loadConfig: vi.fn(() => ({
    SUPABASE_SERVICE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-key',
    GROQ_API_KEY: 'test-groq-key',
    knowledgeRoot: '/test/knowledge',
    uxGuideRoot: '/test/ux',
  })),
}));

// Mock createSupportSupabase
vi.mock('../supabaseClient.js', () => ({
  createSupportSupabase: vi.fn(() => ({
    from: vi.fn(),
  })),
}));

// Mock KnowledgeBase
const mockLoad = vi.fn().mockResolvedValue(undefined);
vi.mock('../knowledgeBase.js', () => ({
  KnowledgeBase: class MockKnowledgeBase {
    constructor() {}
    load = mockLoad;
  },
}));

// Mock LlmClient
vi.mock('../llmClient.js', () => ({
  LlmClient: class MockLlmClient {
    constructor() {}
  },
}));

describe('createSupportContext', () => {
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      child: vi.fn().mockReturnThis(),
    } as unknown as Logger;
  });

  it('sollte SupportContext erstellen', async () => {
    const context = await createSupportContext(mockLogger);

    expect(context).toBeDefined();
    expect(context.config).toBeDefined();
    expect(context.supabase).toBeDefined();
    expect(context.knowledgeBase).toBeDefined();
    expect(context.llmClient).toBeDefined();
  });

  it('sollte KnowledgeBase laden', async () => {
    const context = await createSupportContext(mockLogger);

    expect(context.knowledgeBase).toBeDefined();
    expect(mockLoad).toHaveBeenCalled();
    expect(context.knowledgeBase.load).toHaveBeenCalled();
  });

  it('sollte Supabase-Client erstellen', async () => {
    const context = await createSupportContext(mockLogger);

    expect(context.supabase).toBeDefined();
    expect(supabaseClientModule.createSupportSupabase).toHaveBeenCalled();
  });

  it('sollte LlmClient erstellen', async () => {
    const context = await createSupportContext(mockLogger);

    expect(context.llmClient).toBeInstanceOf(LlmClient);
  });
});

