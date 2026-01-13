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
  systemState?: {
    currentFileContents?: Record<string, string>;
    environmentVariables?: Record<string, string>;
    dependencies?: Record<string, string>;
    configurations?: Record<string, unknown>;
    reverseEngineeringRefs?: string[];
  };
  codeChanges?: {
    diffs?: Array<{
      file: string;
      before: string;
      after: string;
      lineNumbers?: { start: number; end: number };
    }>;
    affectedFunctions?: string[];
    importChanges?: string[];
  };
  context?: {
    affectedComponents?: string[];
    apiEndpoints?: string[];
    databaseChanges?: string[];
    frontendBackendDependencies?: string[];
  };
  errorHandling?: {
    possibleErrors?: string[];
    rollbackStrategy?: string;
    validationSteps?: string[];
    monitoring?: string[];
  };
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

  // NEU: Extrahiere erweiterte Kontext-Daten aus payload
  const systemState = payloadRecord['systemState'] as AutopatchPlanContext['systemState'] | undefined;
  const codeChanges = payloadRecord['codeChanges'] as AutopatchPlanContext['codeChanges'] | undefined;
  const contextData = payloadRecord['context'] as AutopatchPlanContext['context'] | undefined;
  const errorHandling = payloadRecord['errorHandling'] as AutopatchPlanContext['errorHandling'] | undefined;

  // Merge mit übergebenem Kontext (payload hat Priorität)
  const mergedContext: AutopatchPlanContext = {
    ...context,
    systemState: systemState ?? context.systemState,
    codeChanges: codeChanges ?? context.codeChanges,
    context: contextData ?? context.context,
    errorHandling: errorHandling ?? context.errorHandling,
  };

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

  // NEU: System-Zustand dokumentieren
  if (mergedContext.systemState) {
    lines.push('', '## System-Zustand');
    
    if (mergedContext.systemState.currentFileContents && Object.keys(mergedContext.systemState.currentFileContents).length > 0) {
      lines.push('', '### Aktuelle Datei-Inhalte');
      for (const [file, content] of Object.entries(mergedContext.systemState.currentFileContents)) {
        lines.push(`\n#### ${file}`);
        lines.push('```typescript');
        lines.push(content.substring(0, 2000)); // Limit für Lesbarkeit
        if (content.length > 2000) {
          lines.push('... (gekürzt)');
        }
        lines.push('```');
      }
    }
    
    if (mergedContext.systemState.environmentVariables && Object.keys(mergedContext.systemState.environmentVariables).length > 0) {
      lines.push('', '### Umgebungsvariablen (relevant)');
      for (const [key, value] of Object.entries(mergedContext.systemState.environmentVariables)) {
        // Maskiere sensible Werte
        const maskedValue = key.includes('KEY') || key.includes('SECRET') || key.includes('TOKEN')
          ? value.substring(0, 8) + '...'
          : value;
        lines.push(`- \`${key}\`: ${maskedValue}`);
      }
    }
    
    if (mergedContext.systemState.dependencies && Object.keys(mergedContext.systemState.dependencies).length > 0) {
      lines.push('', '### Abhängigkeiten');
      for (const [packageName, version] of Object.entries(mergedContext.systemState.dependencies)) {
        lines.push(`- \`${packageName}\`: ${version}`);
      }
    }
    
    if (mergedContext.systemState.configurations && Object.keys(mergedContext.systemState.configurations).length > 0) {
      lines.push('', '### Konfigurationsdateien');
      for (const [configFile, configData] of Object.entries(mergedContext.systemState.configurations)) {
        lines.push(`- \`${configFile}\`: ${JSON.stringify(configData, null, 2).substring(0, 500)}`);
      }
    }
    
    if (mergedContext.systemState.reverseEngineeringRefs && mergedContext.systemState.reverseEngineeringRefs.length > 0) {
      lines.push('', '### Reverse Engineering Referenzen');
      mergedContext.systemState.reverseEngineeringRefs.forEach((ref) => {
        lines.push(`- ${ref}`);
      });
    }
  }

  // NEU: Code-Änderungen (Diffs)
  if (mergedContext.codeChanges) {
    lines.push('', '## Code-Änderungen (Diff)');
    
    if (mergedContext.codeChanges.diffs && mergedContext.codeChanges.diffs.length > 0) {
      for (const diff of mergedContext.codeChanges.diffs) {
        lines.push(`\n### ${diff.file}`);
        if (diff.lineNumbers) {
          lines.push(`**Betroffene Zeilen:** ${diff.lineNumbers.start}-${diff.lineNumbers.end}`);
        }
        lines.push('\n**Vorher:**');
        lines.push('```typescript');
        lines.push(diff.before);
        lines.push('```');
        lines.push('\n**Nachher:**');
        lines.push('```typescript');
        lines.push(diff.after);
        lines.push('```');
      }
    }
    
    if (mergedContext.codeChanges.affectedFunctions && mergedContext.codeChanges.affectedFunctions.length > 0) {
      lines.push('', '### Betroffene Funktionen');
      mergedContext.codeChanges.affectedFunctions.forEach((func) => {
        lines.push(`- ${func}`);
      });
    }
    
    if (mergedContext.codeChanges.importChanges && mergedContext.codeChanges.importChanges.length > 0) {
      lines.push('', '### Import-Änderungen');
      mergedContext.codeChanges.importChanges.forEach((change) => {
        lines.push(`- ${change}`);
      });
    }
  }

  // NEU: Kontext & Abhängigkeiten
  if (mergedContext.context) {
    lines.push('', '## Kontext & Abhängigkeiten');
    
    if (mergedContext.context.affectedComponents && mergedContext.context.affectedComponents.length > 0) {
      lines.push('', '### Betroffene Komponenten');
      mergedContext.context.affectedComponents.forEach((component) => {
        lines.push(`- ${component}`);
      });
    }
    
    if (mergedContext.context.apiEndpoints && mergedContext.context.apiEndpoints.length > 0) {
      lines.push('', '### API-Endpunkte');
      mergedContext.context.apiEndpoints.forEach((endpoint) => {
        lines.push(`- ${endpoint}`);
      });
    }
    
    if (mergedContext.context.databaseChanges && mergedContext.context.databaseChanges.length > 0) {
      lines.push('', '### Datenbank-Änderungen');
      mergedContext.context.databaseChanges.forEach((change) => {
        lines.push(`- ${change}`);
      });
    }
    
    if (mergedContext.context.frontendBackendDependencies && mergedContext.context.frontendBackendDependencies.length > 0) {
      lines.push('', '### Frontend/Backend-Abhängigkeiten');
      mergedContext.context.frontendBackendDependencies.forEach((dep) => {
        lines.push(`- ${dep}`);
      });
    }
  }

  // NEU: Fehlerbehandlung
  if (mergedContext.errorHandling) {
    lines.push('', '## Fehlerbehandlung & Rollback');
    
    if (mergedContext.errorHandling.possibleErrors && mergedContext.errorHandling.possibleErrors.length > 0) {
      lines.push('', '### Mögliche Fehler');
      mergedContext.errorHandling.possibleErrors.forEach((error) => {
        lines.push(`- ${error}`);
      });
    }
    
    if (mergedContext.errorHandling.rollbackStrategy) {
      lines.push('', '### Rollback-Strategie');
      lines.push(mergedContext.errorHandling.rollbackStrategy);
    }
    
    if (mergedContext.errorHandling.validationSteps && mergedContext.errorHandling.validationSteps.length > 0) {
      lines.push('', '### Validierungsschritte');
      mergedContext.errorHandling.validationSteps.forEach((step, index) => {
        lines.push(`${index + 1}. ${step}`);
      });
    }
    
    if (mergedContext.errorHandling.monitoring && mergedContext.errorHandling.monitoring.length > 0) {
      lines.push('', '### Monitoring');
      mergedContext.errorHandling.monitoring.forEach((monitor) => {
        lines.push(`- ${monitor}`);
      });
    }
  }

  const content = lines.join('\n');
  await fs.writeFile(filePath, content, 'utf8');

  logger.info({ filePath }, 'Autopatch-Spezifikation gespeichert');

  return filePath;
}

