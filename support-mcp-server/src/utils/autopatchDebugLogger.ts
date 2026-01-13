import fs from 'node:fs/promises';
import path from 'node:path';

import type { AutoFixInstruction } from '../services/actions/autopatchPatterns.js';

const DEBUG_LOG_PATH =
  process.env.AUTOPATCH_DEBUG_LOG ||
  path.resolve(process.cwd(), 'autopatch-debug.log');

const TRACE_DIR =
  process.env.AUTOPATCH_TRACE_DIR ||
  path.resolve(process.cwd(), 'logs', 'autopatch-traces');

function buildLine(label: string, payload?: Record<string, unknown>) {
  const meta = payload ? JSON.stringify(payload) : '';
  return `${new Date().toISOString()} ${label} ${meta}\n`;
}

export async function writeAutopatchDebug(
  label: string,
  payload?: Record<string, unknown>,
) {
  try {
    await fs.appendFile(DEBUG_LOG_PATH, buildLine(label, payload), 'utf8');
  } catch {
    // Logging darf keinen Crash auslösen – Fehler ignorieren
  }
}

export async function persistAutofixInstructions(
  ticketId: string,
  patternId: string,
  instructions: AutoFixInstruction[] = [],
) {
  try {
    await fs.mkdir(TRACE_DIR, { recursive: true });
    const filePath = path.join(TRACE_DIR, `${ticketId}.jsonl`);
    const entry = {
      timestamp: new Date().toISOString(),
      ticketId,
      patternId,
      instructionCount: instructions.length,
      instructions,
    };
    await fs.appendFile(filePath, `${JSON.stringify(entry)}\n`, 'utf8');
  } catch (error) {
    await writeAutopatchDebug('persistAutofixInstructionsFailed', {
      ticketId,
      patternId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

