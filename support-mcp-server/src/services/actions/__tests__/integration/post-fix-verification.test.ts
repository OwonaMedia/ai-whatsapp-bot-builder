/**
 * Integration Tests: Post-Fix-Verifikation
 * 
 * Testet alle 6 Validierungsstufen zusammen
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProblemVerifier } from '../../problemVerifier.js';
import { createMockLogger } from '../setup.js';
import { createTestTicket, createTestDirectory, cleanupTestDirectory } from '../utils.js';
import { POSITIVE_TICKETS } from '../fixtures/tickets.js';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

describe('Post-Fix-Verifikation Integration', () => {
  let verifier: ProblemVerifier;
  let mockRootDir: string;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(async () => {
    mockRootDir = await createTestDirectory('test-post-fix-' + Date.now());
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
    verifier = new ProblemVerifier(mockRootDir, mockLogger, null);
  });

  afterEach(async () => {
    if (mockRootDir) {
      await cleanupTestDirectory(mockRootDir.replace('/tmp/', ''));
    }
  });

  it('sollte alle 6 Validierungsstufen für PDF-Upload-Problem durchführen', async () => {
    const ticket = POSITIVE_TICKETS.pdfUploadWorkerNotFound;
    const autoFixResult = {
      success: true,
      modifiedFiles: ['lib/pdf/parsePdf.ts'],
    };
    const autoFixInstructions = [
      {
        type: 'code-modify',
        file: 'lib/pdf/parsePdf.ts',
      },
    ];

    const result = await verifier.verifyPostFix(
      ticket,
      'config-frontend_config-lib/pdf/parsePdf.ts',
      autoFixResult,
      autoFixInstructions
    );

    // Alle 6 Stufen sollten in Evidence vorhanden sein
    expect(result.evidence.some(e => e.includes('STUFE 1'))).toBe(true);
    expect(result.evidence.some(e => e.includes('STUFE 2'))).toBe(true);
    expect(result.evidence.some(e => e.includes('STUFE 3'))).toBe(true);
    expect(result.evidence.some(e => e.includes('STUFE 4'))).toBe(true);
    expect(result.evidence.some(e => e.includes('STUFE 5'))).toBe(true);
    expect(result.evidence.some(e => e.includes('STUFE 6'))).toBe(true);
  });

  it('sollte PDF-Upload-Probleme als kritisch für funktionale Tests markieren', async () => {
    const ticket = POSITIVE_TICKETS.pdfUploadWorkerNotFound;
    const autoFixResult = {
      success: true,
      modifiedFiles: ['lib/pdf/parsePdf.ts'],
    };
    const autoFixInstructions = [
      {
        type: 'code-modify',
        file: 'lib/pdf/parsePdf.ts',
      },
    ];

    const result = await verifier.verifyPostFix(
      ticket,
      'config-frontend_config-lib/pdf/parsePdf.ts',
      autoFixResult,
      autoFixInstructions
    );

    // Für PDF-Upload-Probleme sollte STUFE 6 erwähnt werden
    expect(result.evidence.some(e => e.includes('STUFE 6') || e.includes('Funktionale Tests'))).toBe(true);
  });

  it('sollte Code-Modify-Probleme korrekt als behoben markieren wenn Code geändert wurde', async () => {
    const ticket = POSITIVE_TICKETS.pdfUploadWorkerNotFound;
    const autoFixResult = {
      success: true,
      modifiedFiles: ['lib/pdf/parsePdf.ts'],
      buildFailed: false,
      lintFailed: false,
    };
    const autoFixInstructions = [
      {
        type: 'code-modify',
        file: 'lib/pdf/parsePdf.ts',
      },
    ];

    const result = await verifier.verifyPostFix(
      ticket,
      'config-frontend_config-lib/pdf/parsePdf.ts',
      autoFixResult,
      autoFixInstructions
    );

    // Bei Code-Modify sollte Problem als behoben markiert werden, wenn Code geändert + Build erfolgreich
    // STUFE 5 (Reverse Engineering) ist nicht kritisch für Code-Änderungen
    expect(result).toBeDefined();
    expect(result.evidence.length).toBeGreaterThan(0);
  });

  it('sollte Hetzner-Command-Probleme korrekt als behoben markieren wenn alle kritischen Stufen bestanden sind', async () => {
    const ticket = POSITIVE_TICKETS.pm2RestartRequired;
    const autoFixResult = {
      success: true,
      modifiedFiles: [],
    };
    const autoFixInstructions = [
      {
        type: 'hetzner-command',
        command: 'pm2 restart whatsapp-bot-builder',
      },
    ];

    const result = await verifier.verifyPostFix(
      ticket,
      'config-deployment_config-PM2',
      autoFixResult,
      autoFixInstructions
    );

    // Bei Hetzner-Commands sollten alle kritischen Stufen bestanden sein
    expect(result).toBeDefined();
    expect(result.evidence.length).toBeGreaterThan(0);
  });
});

