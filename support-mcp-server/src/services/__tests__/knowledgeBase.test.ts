import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KnowledgeBase } from '../knowledgeBase.js';
import type { Logger } from '../../utils/logger.js';
import type { SupportConfig } from '../config.js';
import type { SupportSupabaseClient } from '../supabaseClient.js';
import * as fsModule from 'node:fs';
import * as fgModule from 'fast-glob';

// Mock fs
vi.mock('node:fs', () => ({
  default: {
    readFileSync: vi.fn(),
    existsSync: vi.fn(),
  },
}));

// Mock fast-glob
vi.mock('fast-glob', () => ({
  default: vi.fn(),
}));

describe('KnowledgeBase', () => {
  let knowledgeBase: KnowledgeBase;
  let mockConfig: SupportConfig;
  let mockLogger: Logger;
  let mockSupabase: SupportSupabaseClient;

  beforeEach(() => {
    mockConfig = {
      knowledgeRoot: '/test/knowledge',
      uxGuideRoot: '/test/ux',
    } as SupportConfig;

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      child: vi.fn().mockReturnThis(),
    } as unknown as Logger;

    mockSupabase = {
      from: vi.fn(),
    } as unknown as SupportSupabaseClient;

    knowledgeBase = new KnowledgeBase(mockConfig, mockLogger, mockSupabase);
  });

  it('sollte KnowledgeBase erstellen', () => {
    expect(knowledgeBase).toBeDefined();
  });

  it('sollte Dokumente aus Dateien laden', async () => {
    const mockFiles = ['/test/knowledge/doc1.md', '/test/ux/guide1.md'];
    vi.mocked(fgModule.default).mockResolvedValue(mockFiles as any);
    vi.mocked(fsModule.default.readFileSync).mockReturnValue('# Test Document\n\nContent');

    await knowledgeBase.load();

    expect(fgModule.default).toHaveBeenCalled();
    expect(fsModule.default.readFileSync).toHaveBeenCalled();
  });

  it('sollte Fehler beim Laden von Dateien behandeln', async () => {
    vi.mocked(fgModule.default).mockResolvedValue(['/test/knowledge/doc1.md'] as any);
    vi.mocked(fsModule.default.readFileSync).mockImplementation(() => {
      throw new Error('File read error');
    });

    await knowledgeBase.load();

    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('sollte Dokumente aus Supabase laden wenn verfügbar', async () => {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'doc-1',
            title: 'Test Doc',
            content: '# Test\n\nContent',
            file_path: '/test/doc1.md',
          },
        ],
        error: null,
      }),
    };
    (mockSupabase.from as any).mockReturnValue(mockQuery);

    vi.mocked(fgModule.default).mockResolvedValue([] as any);

    await knowledgeBase.load();

    expect(mockSupabase.from).toHaveBeenCalledWith('support_reverse_engineering');
  });

  it('sollte query-Methode verwenden', async () => {
    const mockFiles = ['/test/knowledge/doc1.md'];
    vi.mocked(fgModule.default).mockResolvedValue(mockFiles as any);
    vi.mocked(fsModule.default.readFileSync).mockReturnValue('# Test Document\n\nContent with keyword');

    await knowledgeBase.load();
    const results = knowledgeBase.query('keyword', 5);

    expect(Array.isArray(results)).toBe(true);
  });

  it('sollte query mit Limit verwenden', async () => {
    const mockFiles = ['/test/knowledge/doc1.md', '/test/knowledge/doc2.md'];
    vi.mocked(fgModule.default).mockResolvedValue(mockFiles as any);
    vi.mocked(fsModule.default.readFileSync).mockReturnValue('# Test Document\n\nContent with keyword');

    await knowledgeBase.load();
    const results = knowledgeBase.query('keyword', 1);

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeLessThanOrEqual(1);
  });
});

