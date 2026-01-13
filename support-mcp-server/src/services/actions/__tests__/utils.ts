/**
 * Test Utilities
 * 
 * Helper-Funktionen für Tests
 */

import { readFile, writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import type { MinimalTicket } from '../autopatchPatterns.js';
import type { ConfigurationItem } from '../reverseEngineeringAnalyzer.js';

/**
 * Erstellt ein Test-Ticket
 */
export function createTestTicket(overrides: Partial<MinimalTicket> = {}): MinimalTicket {
  return {
    id: 'test-ticket-123',
    title: 'Test Ticket',
    description: 'Test Description',
    status: 'new',
    priority: 'medium',
    category: 'technical',
    ...overrides,
  };
}

/**
 * Erstellt eine Test-Konfiguration
 */
export function createTestConfiguration(
  type: ConfigurationItem['type'],
  overrides: Partial<ConfigurationItem> = {}
): ConfigurationItem {
  const baseConfig: ConfigurationItem = {
    type,
    name: `test-${type}`,
    description: `Test ${type} configuration`,
    location: `/test/${type}/config.ts`,
    potentialIssues: ['test issue'],
    fixStrategies: ['test fix strategy'],
  };

  return { ...baseConfig, ...overrides };
}

/**
 * Erstellt temporäres Test-Verzeichnis
 */
export async function createTestDirectory(path: string): Promise<string> {
  const fullPath = join('/tmp', path);
  await mkdir(fullPath, { recursive: true });
  return fullPath;
}

/**
 * Erstellt temporäre Test-Datei
 */
export async function createTestFile(
  dir: string,
  filename: string,
  content: string
): Promise<string> {
  const filePath = join(dir, filename);
  await writeFile(filePath, content, 'utf-8');
  return filePath;
}

/**
 * Liest Test-Datei
 */
export async function readTestFile(filePath: string): Promise<string> {
  return await readFile(filePath, 'utf-8');
}

/**
 * Löscht temporäres Test-Verzeichnis
 */
export async function cleanupTestDirectory(path: string): Promise<void> {
  const fullPath = join('/tmp', path);
  try {
    await rm(fullPath, { recursive: true, force: true });
  } catch (error) {
    // Ignoriere Fehler beim Löschen
  }
}

/**
 * Wartet auf asynchrone Operation
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Assertion-Helper: Prüft ob Problem korrekt erkannt wurde
 */
export function assertProblemDetected(
  result: { problemExists: boolean; evidence: string[] },
  expected: boolean
): void {
  if (result.problemExists !== expected) {
    throw new Error(
      `Problem detection mismatch. Expected: ${expected}, Got: ${result.problemExists}. ` +
      `Evidence: ${result.evidence.join(', ')}`
    );
  }
}

/**
 * Assertion-Helper: Prüft ob Fix-Instructions korrekt generiert wurden
 */
export function assertFixInstructionsGenerated(
  instructions: unknown[],
  expectedTypes: string[]
): void {
  const actualTypes = instructions.map((inst: any) => inst.type);
  const missing = expectedTypes.filter(type => !actualTypes.includes(type));
  
  if (missing.length > 0) {
    throw new Error(
      `Missing fix instruction types. Expected: ${expectedTypes.join(', ')}, ` +
      `Got: ${actualTypes.join(', ')}, Missing: ${missing.join(', ')}`
    );
  }
}

/**
 * Assertion-Helper: Prüft ob Matching korrekt funktioniert
 */
export function assertMatchFound(
  result: { patternId: string; summary: string } | null,
  expectedPatternId?: string
): void {
  if (!result) {
    throw new Error('Expected match to be found, but got null');
  }
  
  if (expectedPatternId && result.patternId !== expectedPatternId) {
    throw new Error(
      `Pattern ID mismatch. Expected: ${expectedPatternId}, Got: ${result.patternId}`
    );
  }
}

