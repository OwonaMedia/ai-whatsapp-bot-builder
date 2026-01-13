import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { applyRagPlaygroundScrollFix } from '../uxFixes.js';
import type { Logger } from '../../utils/logger.js';

// Mock fs
vi.mock('node:fs', () => ({
  promises: {
    access: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
  },
}));

// Mock path
vi.mock('node:path', () => ({
  default: {
    resolve: vi.fn((...args) => args.join('/')),
    join: vi.fn((...args) => args.join('/')),
  },
}));

// Mock child_process exec
vi.mock('node:child_process', () => ({
  exec: vi.fn((command, options, callback) => {
    if (callback) {
      callback(null, { stdout: '', stderr: '' });
    }
    return { stdout: '', stderr: '' };
  }),
}));

// Mock util promisify
vi.mock('node:util', () => ({
  promisify: vi.fn((fn) => {
    return vi.fn().mockResolvedValue({ stdout: '', stderr: '' });
  }),
}));

describe('uxFixes', () => {
  let mockLogger: Logger;
  const mockFs = fs as any;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      child: vi.fn().mockReturnThis(),
    } as unknown as Logger;

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('applyRagPlaygroundScrollFix', () => {
    it('sollte Fix anwenden wenn frontend/package.json existiert', async () => {
      const rootDir = '/test/root';
      const frontendPath = '/test/root/../frontend';
      const ragDemoPath = '/test/root/../frontend/components/demo/RAGDemo.tsx';

      // Mock path.resolve und path.join
      (path.resolve as any).mockImplementation((...args: string[]) => args.join('/'));
      (path.join as any).mockImplementation((...args: string[]) => args.join('/'));

      // Mock: frontend/package.json existiert (erster access-Call)
      let accessCallCount = 0;
      mockFs.access.mockImplementation((filePath: string) => {
        accessCallCount++;
        if (accessCallCount === 1 && filePath.includes('package.json')) {
          return Promise.resolve();
        }
        // Für RAGDemo.tsx (wird nicht geprüft, nur gelesen)
        return Promise.resolve();
      });

      // Mock: Datei existiert, aber Fix noch nicht angewendet
      mockFs.readFile.mockResolvedValue('// Original content without fix');

      const result = await applyRagPlaygroundScrollFix(rootDir, mockLogger);

      expect(result).toBe(true);
      expect(mockFs.writeFile).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ filePath: expect.stringContaining('RAGDemo.tsx') }),
        'RAG playground scroll fix applied'
      );
    });

    it('sollte Fix nicht anwenden wenn bereits vorhanden', async () => {
      const rootDir = '/test/root';
      const frontendPath = '/test/root/../frontend';
      const ragDemoPath = '/test/root/../frontend/components/demo/RAGDemo.tsx';

      (path.resolve as any).mockImplementation((...args) => args.join('/'));
      (path.join as any).mockImplementation((...args) => args.join('/'));

      // Mock: frontend/package.json existiert
      mockFs.access.mockImplementation((filePath: string) => {
        if (filePath.includes('package.json')) {
          return Promise.resolve();
        }
        return Promise.reject(new Error('File not found'));
      });

      // Mock: Fix bereits vorhanden
      mockFs.readFile.mockResolvedValue('/* rag-scroll-layout-fix */\n// Already patched');

      const result = await applyRagPlaygroundScrollFix(rootDir, mockLogger);

      expect(result).toBe(false);
      expect(mockFs.writeFile).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        { filePath: ragDemoPath },
        'RAG playground scroll fix already applied'
      );
    });

    it('sollte Fix anwenden wenn frontend/package.json nicht existiert (repository root)', async () => {
      const rootDir = '/test/root';
      const ragDemoPath = '/test/root/../components/demo/RAGDemo.tsx';

      (path.resolve as any).mockImplementation((...args: string[]) => args.join('/'));
      (path.join as any).mockImplementation((...args: string[]) => args.join('/'));

      // Mock: frontend/package.json existiert nicht (erster access-Call schlägt fehl)
      let accessCallCount = 0;
      mockFs.access.mockImplementation((filePath: string) => {
        accessCallCount++;
        if (accessCallCount === 1 && filePath.includes('package.json')) {
          return Promise.reject(new Error('File not found'));
        }
        // Für RAGDemo.tsx (wird nicht geprüft, nur gelesen)
        return Promise.resolve();
      });

      // Mock: Datei existiert, aber Fix noch nicht angewendet
      mockFs.readFile.mockResolvedValue('// Original content without fix');

      const result = await applyRagPlaygroundScrollFix(rootDir, mockLogger);

      expect(result).toBe(true);
      expect(mockFs.writeFile).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ filePath: expect.stringContaining('RAGDemo.tsx') }),
        'RAG playground scroll fix applied'
      );
    });

    it('sollte Fehler behandeln wenn Datei nicht gelesen werden kann', async () => {
      const rootDir = '/test/root';

      (path.resolve as any).mockImplementation((...args: string[]) => args.join('/'));
      (path.join as any).mockImplementation((...args: string[]) => args.join('/'));

      // Mock: frontend/package.json existiert
      let accessCallCount = 0;
      mockFs.access.mockImplementation((filePath: string) => {
        accessCallCount++;
        if (accessCallCount === 1 && filePath.includes('package.json')) {
          return Promise.resolve();
        }
        return Promise.resolve();
      });

      // Mock: Fehler beim Lesen
      mockFs.readFile.mockRejectedValue(new Error('Cannot read file'));

      await expect(applyRagPlaygroundScrollFix(rootDir, mockLogger)).rejects.toThrow();

      expect(mockFs.writeFile).not.toHaveBeenCalled();
    });

    it('sollte Fehler behandeln wenn Datei nicht geschrieben werden kann', async () => {
      const rootDir = '/test/root';

      (path.resolve as any).mockImplementation((...args: string[]) => args.join('/'));
      (path.join as any).mockImplementation((...args: string[]) => args.join('/'));

      // Mock: frontend/package.json existiert
      let accessCallCount = 0;
      mockFs.access.mockImplementation((filePath: string) => {
        accessCallCount++;
        if (accessCallCount === 1 && filePath.includes('package.json')) {
          return Promise.resolve();
        }
        return Promise.resolve();
      });

      // Mock: Datei existiert, aber Fix noch nicht angewendet
      mockFs.readFile.mockResolvedValue('// Original content without fix');
      mockFs.writeFile.mockRejectedValue(new Error('Cannot write file'));

      await expect(applyRagPlaygroundScrollFix(rootDir, mockLogger)).rejects.toThrow();
    });
  });
});

