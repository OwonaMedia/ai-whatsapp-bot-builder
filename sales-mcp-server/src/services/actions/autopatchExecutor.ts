import path from 'node:path';
import { promises as fs } from 'node:fs';
import { exec as execCallback } from 'node:child_process';
import { promisify } from 'node:util';

import type { Logger } from '../../utils/logger.js';
import type { AutoFixInstruction } from './autopatchPatterns.js';
import { withTimeout } from '../../utils/retry.js';
import { logWithContext } from '../../utils/logger.js';
import { writeAutopatchDebug } from '../../utils/autopatchDebugLogger.js';

const execAsync = promisify(execCallback);

interface AutoFixResult {
  success: boolean;
  message?: string;
  error?: unknown;
  warnings?: string[];
  lintFailed?: boolean;
  buildFailed?: boolean;
}

interface ModifiedFile {
  filePath: string;
  originalContent: string | null;
  existed: boolean;
}

const debugLog = (label: string, payload?: Record<string, unknown>) => {
  void writeAutopatchDebug(label, payload);
};

function setNestedValue(target: any, keyPath: string[], value: string) {
  let current = target;
  keyPath.forEach((segment, index) => {
    if (index === keyPath.length - 1) {
      current[segment] = value;
      return;
    }
    if (typeof current[segment] !== 'object' || current[segment] === null) {
      current[segment] = {};
    }
    current = current[segment];
  });
}

function getNestedValue(target: any, keyPath: string[]): unknown {
  return keyPath.reduce((acc, segment) => {
    if (typeof acc !== 'object' || acc === null) {
      return undefined;
    }
    return acc[segment];
  }, target);
}

async function applyI18nAddKey(
  repositoryRoot: string,
  instruction: Extract<AutoFixInstruction, { type: 'i18n-add-key' }>,
  logger: Logger,
  modifiedFiles: ModifiedFile[],
) {
  const { key, translations } = instruction;
  const keySegments = key.split('.');
  const TRACE_MARKER = `I18N-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
// KRITISCH: Console-Logging für sofortige Sichtbarkeit
debugLog('applyI18nAddKey: Start', {
    TRACE_MARKER,
    key,
    repositoryRoot,
    translationCount: Object.keys(translations).length,
    translations: Object.keys(translations),
  });
  
  logWithContext(logger, 'info', 'applyI18nAddKey: Start', {
    component: 'AutoFixExecutor',
    metadata: { TRACE_MARKER, key, repositoryRoot, translationCount: Object.keys(translations).length },
  });
  
  // NEU: Versuche zuerst File Writer Worker (Alternative 1)
  try {
    const { writeI18nViaWorker, checkFileWriterHealth } = await import('../../utils/fileWriterClient.js');
    
    const isWorkerAvailable = await checkFileWriterHealth();
    debugLog('Worker Health Check', {
      TRACE_MARKER,
      isWorkerAvailable,
      repositoryRoot,
      key,
    });
    
    if (isWorkerAvailable) {
      debugLog('File Writer Worker verfügbar - verwende Worker', {
        TRACE_MARKER,
        key,
      });
      
      logWithContext(logger, 'info', 'File Writer Worker verfügbar - verwende Worker', {
        component: 'AutoFixExecutor',
        metadata: { TRACE_MARKER },
      });
      
      const result = await writeI18nViaWorker(
        repositoryRoot,
        [{ type: 'i18n-add-key', key, translations }],
        logger
      );
      
      debugLog('Worker-Ergebnis', {
        TRACE_MARKER,
        success: result.success,
        message: result.message,
        filesWritten: result.filesWritten,
      });
      
      if (result.success) {
        debugLog('applyI18nAddKey: Erfolgreich über Worker', {
          TRACE_MARKER,
          key,
          filesWritten: result.filesWritten,
        });
        
        logWithContext(logger, 'info', 'applyI18nAddKey: Erfolgreich über Worker', {
          component: 'AutoFixExecutor',
          metadata: { TRACE_MARKER, key, filesWritten: result.filesWritten },
        });
        
        // Markiere Dateien als modifiziert (für Rollback)
        const absoluteRepositoryRoot = path.isAbsolute(repositoryRoot)
          ? repositoryRoot
          : path.resolve(process.cwd(), repositoryRoot);
        
        for (const locale of Object.keys(translations)) {
          const localeFile = path.resolve(absoluteRepositoryRoot, 'messages', `${locale}.json`);
          try {
            const content = await fs.readFile(localeFile, 'utf8');
            modifiedFiles.push({ filePath: localeFile, originalContent: content, existed: true });
          } catch {
            // Ignoriere Fehler beim Lesen für Rollback
          }
        }
        
        return;
      } else {
        debugLog('File Writer Worker fehlgeschlagen - Fallback', {
          TRACE_MARKER,
          error: result.message,
        });
        
        logWithContext(logger, 'warn', 'File Writer Worker fehlgeschlagen - versuche direkten Zugriff', {
          component: 'AutoFixExecutor',
          metadata: { TRACE_MARKER, error: result.message },
        });
        // Fallback zu direktem Zugriff
      }
    } else {
      debugLog('File Writer Worker nicht verfügbar - Fallback', {
        TRACE_MARKER,
      });
      
      logWithContext(logger, 'warn', 'File Writer Worker nicht verfügbar - versuche direkten Zugriff', {
        component: 'AutoFixExecutor',
        metadata: { TRACE_MARKER },
      });
      // Fallback zu direktem Zugriff
    }
  } catch (error) {
    debugLog('File Writer Worker Fehler - Fallback', {
      TRACE_MARKER,
      error: error instanceof Error ? error.message : String(error),
    });
    
    logWithContext(logger, 'warn', 'File Writer Worker Fehler - versuche direkten Zugriff', {
      component: 'AutoFixExecutor',
      error: error instanceof Error ? error : new Error(String(error)),
      metadata: { TRACE_MARKER },
    });
    // Fallback zu direktem Zugriff
  }
  
  // FALLBACK: Direkter Zugriff (ursprüngliche Implementierung)
debugLog('Verwende direkten Datei-Zugriff (Fallback)', {
    TRACE_MARKER,
    repositoryRoot,
    key,
  });
  
  logWithContext(logger, 'info', 'Verwende direkten Datei-Zugriff (Fallback)', {
    component: 'AutoFixExecutor',
    metadata: { TRACE_MARKER },
  });
  
  // KRITISCH: repositoryRoot muss absolut sein
  const absoluteRepositoryRoot = path.isAbsolute(repositoryRoot)
    ? repositoryRoot
    : path.resolve(process.cwd(), repositoryRoot);
  
  for (const [locale, translation] of Object.entries(translations)) {
    // KRITISCH: Absoluter Pfad für Locale-Datei (Experten-Empfehlung)
    const localeFile = path.resolve(absoluteRepositoryRoot, 'messages', `${locale}.json`);
    
    logWithContext(logger, 'info', 'Lese Locale-Datei', {
      component: 'AutoFixExecutor',
      metadata: { TRACE_MARKER, locale, localeFile, absoluteRepositoryRoot },
    });
    
    let content: string;
    try {
      content = await fs.readFile(localeFile, 'utf8');
      logWithContext(logger, 'debug', 'Locale-Datei gelesen', {
        component: 'AutoFixExecutor',
        metadata: { TRACE_MARKER, locale, localeFile, contentLength: content.length },
      });
    } catch (error) {
      logWithContext(logger, 'error', 'Locale-Datei nicht gefunden', {
        component: 'AutoFixExecutor',
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: { TRACE_MARKER, locale, localeFile },
      });
      // WICHTIG: Fehler weiterwerfen (Experten-Empfehlung)
      throw new Error(`Locale-Datei nicht gefunden: ${localeFile}`);
    }
    
    const json = JSON.parse(content);
    const existing = getNestedValue(json, keySegments);
    const translationValue = typeof translation === 'string' ? translation : String(translation);
    
    if (existing === translationValue) {
      logWithContext(logger, 'debug', 'Übersetzung bereits vorhanden', {
        component: 'AutoFixExecutor',
        metadata: { TRACE_MARKER, locale, key, existingValue: existing },
      });
      continue;
    }
    
    modifiedFiles.push({ filePath: localeFile, originalContent: content, existed: true });
    setNestedValue(json, keySegments, translationValue);
    
    const newContent = `${JSON.stringify(json, null, 2)}\n`;
    
        debugLog('SCHREIBE DATEI (Fallback)', {
          TRACE_MARKER,
          localeFile,
          key,
          value: translationValue,
          contentLength: newContent.length,
        });
        
        logWithContext(logger, 'info', 'SCHREIBE DATEI (Fallback)', {
          component: 'AutoFixExecutor',
          metadata: { TRACE_MARKER, localeFile, key, value: translationValue, contentLength: newContent.length },
        });
        
        try {
          await fs.writeFile(localeFile, newContent, 'utf8');
          
          debugLog('Datei geschrieben (Fallback)', {
            TRACE_MARKER,
            localeFile,
            key,
            value: translationValue,
          });
      
      // KRITISCH: Verifikation nach Schreiben (Experten-Empfehlung)
      logWithContext(logger, 'info', 'Verifiziere geschriebene Datei', {
        component: 'AutoFixExecutor',
        metadata: { TRACE_MARKER, localeFile },
      });
      
      const verifyContent = await fs.readFile(localeFile, 'utf8');
      const verifyJson = JSON.parse(verifyContent);
      const verifyValue = getNestedValue(verifyJson, keySegments);
      
      if (verifyValue !== translationValue) {
        throw new Error(
          `Verifikation fehlgeschlagen: Erwartet "${translationValue}", Gefunden "${verifyValue}"`
        );
      }
      
      logWithContext(logger, 'info', 'Datei erfolgreich geschrieben und verifiziert', {
        component: 'AutoFixExecutor',
        metadata: { TRACE_MARKER, localeFile, key, value: translationValue, verified: true },
      });
    } catch (error) {
      logWithContext(logger, 'error', 'Fehler beim Schreiben oder Verifizieren', {
        component: 'AutoFixExecutor',
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: { TRACE_MARKER, localeFile, key, value: translationValue },
      });
      // WICHTIG: Fehler weiterwerfen (Experten-Empfehlung)
      throw error;
    }
  }
  
  logWithContext(logger, 'info', 'applyI18nAddKey: Abgeschlossen', {
    component: 'AutoFixExecutor',
    metadata: { TRACE_MARKER, key, modifiedCount: modifiedFiles.length },
  });
}

async function applyCloneLocaleFile(
  repositoryRoot: string,
  instruction: Extract<AutoFixInstruction, { type: 'clone-locale-file' }>,
  logger: Logger,
  modifiedFiles: ModifiedFile[],
) {
  const locale = instruction.locale;
  const baseLocale = instruction.baseLocale ?? 'de';
  const messagesDir = path.join(repositoryRoot, 'messages');
  const targetFile = path.join(messagesDir, `${locale}.json`);
  const baseFile = path.join(messagesDir, `${baseLocale}.json`);

  try {
    await fs.access(targetFile);
    logger.info({ targetFile }, 'Locale-Datei existiert bereits – überspringe Clone-Fix.');
    return;
  } catch {
    // expected
  }

  let baseContent: string;
  try {
    baseContent = await fs.readFile(baseFile, 'utf8');
  } catch (error) {
    logger.error({ baseFile, err: error }, 'Basis-Locale konnte nicht gelesen werden – breche AutoFix ab.');
    throw error;
  }

  const strategy = instruction.strategy ?? 'copy';
  let targetContent = baseContent;
  if (strategy === 'empty') {
    try {
      const json = JSON.parse(baseContent);
      const emptied = Object.keys(json).reduce<Record<string, string>>((acc, key) => {
        acc[key] = '';
        return acc;
      }, {});
      targetContent = `${JSON.stringify(emptied, null, 2)}\n`;
    } catch (error) {
      logger.warn({ err: error }, 'Konnte Basis-Locale nicht parsen, verwende Copy-Strategie.');
      targetContent = baseContent;
    }
  }

  await fs.writeFile(targetFile, targetContent, 'utf8');
  modifiedFiles.push({ filePath: targetFile, originalContent: null, existed: false });
  logger.info({ targetFile, baseLocale }, 'Locale-Datei aus Basis-Locale erstellt.');
}

async function applyEnvAddPlaceholder(
  repositoryRoot: string,
  instruction: Extract<AutoFixInstruction, { type: 'env-add-placeholder' }>,
  logger: Logger,
  modifiedFiles: ModifiedFile[],
) {
  const envFile = instruction.file ? path.join(repositoryRoot, instruction.file) : path.join(repositoryRoot, '.env.local');

  let originalContent: string | null = null;
  let existed = true;
  try {
    originalContent = await fs.readFile(envFile, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      existed = false;
      originalContent = '';
    } else {
      throw error;
    }
  }

  const lines = originalContent.split(/\r?\n/).filter((line) => line.length > 0);
  const hasKey = lines.some((line) => line.trim().startsWith(`${instruction.key}=`));
  if (hasKey) {
    logger.debug({ key: instruction.key }, 'ENV-Key existiert bereits – überspringe AutoFix.');
    return;
  }

  const additions: string[] = [];
  if (instruction.comment) {
    additions.push(instruction.comment);
  }
  additions.push(`${instruction.key}=${instruction.value}`);

  const newContent = `${originalContent}${originalContent?.endsWith('\n') ? '' : '\n'}${additions.join('\n')}\n`;
  await fs.writeFile(envFile, newContent, 'utf8');
  modifiedFiles.push({
    filePath: envFile,
    originalContent,
    existed,
  });
  logger.info({ key: instruction.key, envFile }, 'Platzhalter für fehlende ENV-Variable hinzugefügt.');
}

export async function executeAutoFixInstructions(
  rootDir: string,
  instructions: AutoFixInstruction[],
  logger: Logger,
): Promise<AutoFixResult> {
  const startTime = Date.now();
  const TRACE_MARKER = `AUTOFIX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const warnings: string[] = [];
  
  // KRITISCH: Direktes Console-Logging für Debugging
  debugLog('executeAutoFixInstructions: Start', {
    TRACE_MARKER,
    rootDir,
    cwd: process.cwd(),
    instructionCount: instructions?.length ?? 0,
    instructions: instructions,
    instructionsFull: JSON.stringify(instructions ?? []),
  });
  
  logWithContext(
    logger,
    'info',
    'executeAutoFixInstructions: Start',
    {
      component: 'AutoFixExecutor',
      metadata: {
        TRACE_MARKER,
        rootDir,
        cwd: process.cwd(),
        instructionCount: instructions?.length ?? 0,
        instructionTypes: instructions?.map((i) => i.type) ?? [],
        instructionsFull: JSON.stringify(instructions ?? []),
      },
    }
  );
  
  if (!instructions || instructions.length === 0) {
  debugLog('executeAutoFixInstructions: KEINE INSTRUCTIONS!', {
      instructions,
      instructionCount: instructions?.length ?? 0,
    });
    logWithContext(logger, 'warn', 'Keine AutoFix-Anweisungen vorhanden', {
      component: 'AutoFixExecutor',
      metadata: { TRACE_MARKER },
    });
    return { success: false, message: 'Keine AutoFix-Anweisungen vorhanden.' };
  }
  
  debugLog('executeAutoFixInstructions: Instructions vorhanden, verarbeite...', {
    instructionCount: instructions.length,
    instructions,
  });

  // KRITISCH: Absoluter Pfad verwenden (Experten-Empfehlung)
  const absoluteRootDir = path.isAbsolute(rootDir) 
    ? rootDir 
    : path.resolve(process.cwd(), rootDir);
  
  logWithContext(logger, 'info', 'Path Resolution', {
    component: 'AutoFixExecutor',
    metadata: { TRACE_MARKER, rootDir, absoluteRootDir, cwd: process.cwd() },
  });
  
  // KRITISCH: Verzeichnis-Prüfung (Experten-Empfehlung)
  try {
    const stats = await fs.stat(absoluteRootDir);
    if (!stats.isDirectory()) {
      throw new Error(`${absoluteRootDir} ist kein Verzeichnis`);
    }
    logWithContext(logger, 'info', 'rootDir verifiziert', {
      component: 'AutoFixExecutor',
      metadata: { TRACE_MARKER, absoluteRootDir, isDirectory: true },
    });
  } catch (error) {
    logWithContext(logger, 'error', 'rootDir existiert nicht oder ist kein Verzeichnis', {
      component: 'AutoFixExecutor',
      error: error instanceof Error ? error : new Error(String(error)),
      metadata: { TRACE_MARKER, absoluteRootDir, rootDir, cwd: process.cwd() },
    });
    return { 
      success: false, 
      message: `rootDir existiert nicht oder ist kein Verzeichnis: ${absoluteRootDir}`,
      error 
    };
  }

  // repositoryRoot: Eine Ebene nach oben (absoluter Pfad)
  const repositoryRoot = path.resolve(absoluteRootDir, '..');
  const messagesDir = path.resolve(repositoryRoot, 'messages');
  
  logWithContext(logger, 'info', 'Prüfe messages-Verzeichnis', {
    component: 'AutoFixExecutor',
    metadata: { TRACE_MARKER, repositoryRoot, messagesDir },
  });
  
  // KRITISCH: Verzeichnis-Prüfung mit stat (Experten-Empfehlung)
  try {
    const stats = await fs.stat(messagesDir);
    if (!stats.isDirectory()) {
      throw new Error(`${messagesDir} ist kein Verzeichnis`);
    }
    logWithContext(logger, 'info', 'messages-Verzeichnis gefunden und verifiziert', {
      component: 'AutoFixExecutor',
      metadata: { TRACE_MARKER, messagesDir, isDirectory: true },
    });
  } catch (error) {
    logWithContext(logger, 'error', 'messages-Verzeichnis nicht gefunden oder ist kein Verzeichnis', {
      component: 'AutoFixExecutor',
      error: error instanceof Error ? error : new Error(String(error)),
      metadata: { TRACE_MARKER, messagesDir, repositoryRoot, absoluteRootDir },
    });
    return { 
      success: false, 
      message: `messages-Verzeichnis nicht gefunden oder ist kein Verzeichnis: ${messagesDir}`,
      error 
    };
  }
  
  const modifiedFiles: ModifiedFile[] = [];

  try {
    // WICHTIG: Alle Instructions ausführen und Dateien schreiben
    debugLog('Starte Ausführung von Instructions', {
      instructionCount: instructions.length,
      instructions,
    });
    
    logWithContext(logger, 'info', 'Starte Ausführung von Instructions', {
      component: 'AutoFixExecutor',
      metadata: { 
        TRACE_MARKER,
        instructionCount: instructions.length,
        instructionsFull: JSON.stringify(instructions),
      },
    });
    
    for (const instruction of instructions) {
      const instructionStartTime = Date.now();
      
      debugLog('Verarbeite Instruction', {
        type: instruction.type,
        instruction: JSON.stringify(instruction),
      });
      
      logWithContext(logger, 'debug', `Verarbeite Instruction: ${instruction.type}`, {
        component: 'AutoFixExecutor',
        metadata: { 
          TRACE_MARKER,
          instructionType: instruction.type,
          instructionFull: JSON.stringify(instruction),
        },
      });
      
      try {
        debugLog('BEFORE Instruction', { instructionType: instruction.type });
        
        logWithContext(logger, 'info', `BEFORE Instruction: ${instruction.type}`, {
          component: 'AutoFixExecutor',
          metadata: { 
            TRACE_MARKER, 
            instructionType: instruction.type,
            instructionFull: JSON.stringify(instruction),
          },
        });
        
        switch (instruction.type) {
          case 'i18n-add-key':
            debugLog('Rufe applyI18nAddKey auf', {
              repositoryRoot,
              key: instruction.key,
              translations: Object.keys(instruction.translations),
            });
            await applyI18nAddKey(repositoryRoot, instruction, logger, modifiedFiles);
            debugLog('applyI18nAddKey zurückgekehrt', {
              repositoryRoot,
              key: instruction.key,
              modifiedFilesCount: modifiedFiles.length,
            });
            break;
          case 'clone-locale-file':
            await applyCloneLocaleFile(repositoryRoot, instruction, logger, modifiedFiles);
            break;
          case 'env-add-placeholder':
            await applyEnvAddPlaceholder(repositoryRoot, instruction, logger, modifiedFiles);
            break;
          default:
            logger.warn({ type: (instruction as any)?.type ?? 'unknown' }, 'Unbekannter AutoFix-Typ – überspringe');
        }
        
        const instructionDuration = Date.now() - instructionStartTime;
        logWithContext(logger, 'info', `AFTER Instruction: ${instruction.type} (SUCCESS)`, {
          component: 'AutoFixExecutor',
          duration: instructionDuration,
          metadata: { TRACE_MARKER, instructionType: instruction.type },
        });
      } catch (instructionError) {
        const instructionDuration = Date.now() - instructionStartTime;
        logWithContext(logger, 'error', `AFTER Instruction: ${instruction.type} (ERROR)`, {
          component: 'AutoFixExecutor',
          duration: instructionDuration,
          error: instructionError instanceof Error ? instructionError : new Error(String(instructionError)),
          metadata: { TRACE_MARKER, instructionType: instruction.type },
        });
        // KRITISCH: Fehler weiterwerfen (Experten-Empfehlung: Keine Silent Failures)
        throw new Error(
          `Instruction ${instruction.type} fehlgeschlagen: ${instructionError instanceof Error ? instructionError.message : String(instructionError)}`
        );
      }
    }

    if (modifiedFiles.length === 0) {
      const duration = Date.now() - startTime;
      logWithContext(logger, 'info', 'AutoFix abgeschlossen (keine Änderungen erforderlich)', {
        component: 'AutoFixExecutor',
        duration,
      });
      return { success: true, message: 'AutoFix abgeschlossen (keine Änderungen erforderlich).' };
    }

    // WICHTIG: Dateien sind jetzt geschrieben - das ist der kritische Punkt
    logWithContext(logger, 'info', 'AutoFix-Dateien geschrieben. Verifiziere Dateien.', {
      component: 'AutoFixExecutor',
      metadata: {
        TRACE_MARKER,
        modifiedFiles: modifiedFiles.map((f) => f.filePath),
        fileCount: modifiedFiles.length,
      },
    });
    
    // KRITISCH: Verifikation aller geschriebenen Dateien (Experten-Empfehlung)
    for (const file of modifiedFiles) {
      try {
        const verifyContent = await fs.readFile(file.filePath, 'utf8');
        logWithContext(logger, 'info', 'Datei verifiziert', {
          component: 'AutoFixExecutor',
          metadata: { TRACE_MARKER, filePath: file.filePath, contentLength: verifyContent.length },
        });
      } catch (error) {
        logWithContext(logger, 'error', 'Datei-Verifikation fehlgeschlagen', {
          component: 'AutoFixExecutor',
          error: error instanceof Error ? error : new Error(String(error)),
          metadata: { TRACE_MARKER, filePath: file.filePath },
        });
        // WICHTIG: Fehler weiterwerfen
        throw new Error(`Datei-Verifikation fehlgeschlagen für ${file.filePath}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    logWithContext(logger, 'info', 'Alle Dateien verifiziert. Führe Lint & Build aus.', {
      component: 'AutoFixExecutor',
      metadata: { TRACE_MARKER, verifiedFileCount: modifiedFiles.length },
    });
    
    // Frontend-Verzeichnis ermitteln (kann 'frontend' oder direkt repositoryRoot sein)
    const frontendDir = path.join(repositoryRoot, 'frontend');
    let buildDir = repositoryRoot;
    try {
      await fs.access(path.join(frontendDir, 'package.json'));
      buildDir = frontendDir;
      logger.debug({ buildDir }, 'Frontend-Verzeichnis gefunden');
    } catch {
      logger.debug({ repositoryRoot }, 'Verwende Repository-Root als Build-Verzeichnis');
    }
    
    // WICHTIG: Dateien sind bereits geschrieben - Lint/Build-Fehler sollten nicht die Dateien zurückrollen
    let lintError: Error | null = null;
    let buildError: Error | null = null;
    
    // Lint ausführen (Fehler werden ignoriert, aber für Logging gespeichert)
    try {
      await withTimeout(
        execAsync('npm run lint', { cwd: buildDir }),
        60000, // 60 Sekunden Timeout
        'npm run lint timeout'
      );
      logWithContext(logger, 'info', 'npm run lint erfolgreich', {
        component: 'AutoFixExecutor',
        metadata: { buildDir },
      });
    } catch (error) {
      lintError = error instanceof Error ? error : new Error(String(error));
      logWithContext(logger, 'warn', 'npm run lint fehlgeschlagen (überspringe, Dateien bleiben erhalten)', {
        component: 'AutoFixExecutor',
        error: lintError,
        metadata: { buildDir },
      });
      warnings.push(`npm run lint fehlgeschlagen: ${lintError.message}`);
    }
    
    // Build ausführen (Fehler werden geloggt, aber Dateien bleiben erhalten)
    try {
      await withTimeout(
        execAsync('npm run build', { cwd: buildDir }),
        120000, // 120 Sekunden Timeout
        'npm run build timeout'
      );
      logWithContext(logger, 'info', 'Build erfolgreich abgeschlossen', {
        component: 'AutoFixExecutor',
        metadata: { buildDir },
      });
    } catch (error) {
      buildError = error instanceof Error ? error : new Error(String(error));
      logWithContext(logger, 'error', 'Build fehlgeschlagen, aber Dateien bleiben erhalten', {
        component: 'AutoFixExecutor',
        error: buildError,
        metadata: { buildDir },
      });
      warnings.push(`npm run build fehlgeschlagen: ${buildError.message}`);
    }
    
    // PM2 Restart (optional, Fehler werden geloggt)
    try {
      await withTimeout(
        execAsync('pm2 restart whatsapp-bot-builder --update-env'),
        30000, // 30 Sekunden Timeout
        'pm2 restart timeout'
      );
      logWithContext(logger, 'info', 'PM2 Restart erfolgreich', {
        component: 'AutoFixExecutor',
      });
    } catch (error) {
      logWithContext(logger, 'warn', 'PM2 Restart fehlgeschlagen (überspringe)', {
        component: 'AutoFixExecutor',
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
    
    // Erfolg zurückgeben, auch wenn Lint oder Build fehlgeschlagen sind (Dateien sind geschrieben)
    const duration = Date.now() - startTime;
    
    if (buildError) {
      logWithContext(logger, 'warn', 'AutoFix angewendet, aber Build fehlgeschlagen', {
        component: 'AutoFixExecutor',
        duration,
        error: buildError,
        metadata: {
          modifiedFilesCount: modifiedFiles.length,
          hasBuildError: true,
        },
      });
      return {
        success: true,
        message: `AutoFix angewendet (${modifiedFiles.length} Dateien geschrieben), aber Build fehlgeschlagen: ${buildError.message}`,
        warnings,
        buildFailed: true,
      };
    }
    
    if (lintError) {
      logWithContext(logger, 'warn', 'AutoFix angewendet, aber Lint fehlgeschlagen', {
        component: 'AutoFixExecutor',
        duration,
        error: lintError,
        metadata: {
          modifiedFilesCount: modifiedFiles.length,
          hasLintError: true,
        },
      });
      return {
        success: true,
        message: `AutoFix angewendet (${modifiedFiles.length} Dateien geschrieben), aber Lint fehlgeschlagen: ${lintError.message}`,
        warnings,
        lintFailed: true,
      };
    }

    logWithContext(logger, 'info', 'AutoFix erfolgreich angewendet und Deployment aktualisiert', {
      component: 'AutoFixExecutor',
      duration,
      metadata: {
        modifiedFilesCount: modifiedFiles.length,
        hasLintError: false,
        hasBuildError: false,
      },
    });
    
    return {
      success: true,
      message: 'AutoFix erfolgreich angewendet und Deployment aktualisiert.',
      warnings,
    };
  } catch (error) {
    // WICHTIG: Nur Dateien zurückrollen, wenn der Fehler beim Schreiben der Dateien auftrat
    // Lint/Build-Fehler sollten nicht die Dateien zurückrollen
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isFileWriteError = errorMessage.includes('ENOENT') || 
                            errorMessage.includes('EACCES') || 
                            errorMessage.includes('writeFile') ||
                            errorMessage.includes('readFile') ||
                            errorMessage.includes('JSON.parse');
    
    if (isFileWriteError && modifiedFiles.length > 0) {
      logger.error({ err: error, modifiedFilesCount: modifiedFiles.length }, 'AutoFix fehlgeschlagen beim Schreiben der Dateien. Stelle ursprüngliche Dateien wieder her.');
      await Promise.all(
        modifiedFiles.map((file) => {
          if (!file.existed) {
            return fs.unlink(file.filePath).catch(() => null);
          }
          if (file.originalContent === null) {
            return Promise.resolve(null);
          }
          return fs.writeFile(file.filePath, file.originalContent, 'utf8').catch(() => null);
        }),
      );
      return { success: false, error, message: 'AutoFix fehlgeschlagen beim Schreiben der Dateien.' };
    } else {
      // Fehler beim Lint/Build - Dateien bleiben erhalten
      logger.error({ err: error }, 'AutoFix-Fehler (nicht beim Dateischreiben), aber Dateien bleiben erhalten.');
      return { 
        success: true, 
        error, 
        message: `AutoFix-Dateien geschrieben, aber Fehler aufgetreten: ${errorMessage}` 
      };
    }
  }
}

