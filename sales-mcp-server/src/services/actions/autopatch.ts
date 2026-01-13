import path from 'node:path';
import { promises as fs } from 'node:fs';

import type { Logger } from '../../utils/logger.js';
import type { ResolutionAction } from '../llmClient.js';

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function ensureStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string');
}

export interface AutopatchPlanContext {
  ticketId: string;
  title: string;
  description: string;
  locale?: string | null;
}

export async function persistAutopatchPlan(
  rootDir: string,
  planAction: ResolutionAction,
  planSummary: string,
  context: AutopatchPlanContext,
  logger: Logger,
) {
  const payload = planAction.payload ?? {};
  const payloadRecord = payload as Record<string, unknown>;
  const fixName =
    typeof payload.fixName === 'string' && payload.fixName.trim().length > 0 ? payload.fixName : planSummary;

  const targetFiles = ensureStringArray(payloadRecord['targetFiles'] ?? payloadRecord['filePaths']);
  const steps = ensureStringArray(payloadRecord['steps']);
  const tests = ensureStringArray(payloadRecord['validation'] ?? payloadRecord['tests']);
  const rollout = ensureStringArray(payloadRecord['rollout']);

  const autopatchDir = path.resolve(rootDir, '../docs/autopatches');
  await fs.mkdir(autopatchDir, { recursive: true });

  const slug = toSlug(`${context.ticketId}-${fixName}`);
  const filePath = path.join(autopatchDir, `${slug || context.ticketId}.md`);

  const now = new Date().toISOString();
  const lines: string[] = [
    `# Autopatch Plan – ${fixName}`,
    '',
    `- Ticket: \`${context.ticketId}\``,
    `- Erstellt: ${now}`,
    context.locale ? `- Locale: ${context.locale}` : '',
    '',
    '## Kontext',
    planSummary || context.description || '(Keine Zusammenfassung verfügbar)',
    '',
    '### Ausgangssituation',
    context.description || '(Keine Beschreibung im Ticket gefunden)',
    '',
    '## Ziel',
    typeof payload.goal === 'string' ? payload.goal : 'Automatisierte Reparaturroutine bereitstellen.',
    '',
    '## Betroffene Dateien',
  ];

  if (targetFiles.length > 0) {
    for (const file of targetFiles) {
      lines.push(`- ${file}`);
    }
  } else {
    lines.push('- (Noch nicht angegeben)');
  }

  lines.push('', '## Änderungsschritte');

  if (steps.length > 0) {
    steps.forEach((step, index) => {
      lines.push(`${index + 1}. ${step}`);
    });
  } else {
    lines.push('1. Schritte vom Autopatch-Agenten erfragen und ergänzen.');
  }

  lines.push('', '## Tests & Validierung');

  if (tests.length > 0) {
    tests.forEach((test, index) => {
      lines.push(`${index + 1}. ${test}`);
    });
  } else {
    lines.push('1. Tests definieren (z. B. `npm run test` / End-to-End / manuelle QA).');
  }

  lines.push('', '## Rollout/Deployment');

  if (rollout.length > 0) {
    rollout.forEach((item, index) => {
      lines.push(`${index + 1}. ${item}`);
    });
  } else {
    lines.push('1. Änderungen anwenden, `npm run build`, `pm2 restart whatsapp-bot-builder --update-env`.');
  }

  const content = lines.join('\n');
  await fs.writeFile(filePath, content, 'utf8');

  logger.info({ filePath }, 'Autopatch-Spezifikation gespeichert');

  return filePath;
}

