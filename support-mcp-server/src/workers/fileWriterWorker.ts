/**
 * File Writer Worker - Isolierter Prozess für Datei-Operationen
 * 
 * Dieser Worker-Prozess führt Datei-Operationen in einem isolierten Kontext aus,
 * um Berechtigungs- und Path-Probleme zu umgehen.
 */

import 'dotenv/config';
import http from 'node:http';
import { readFile, writeFile, stat } from 'fs/promises';
import path from 'node:path';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('info');
const PORT = parseInt(process.env.FILE_WRITER_PORT || '3004', 10);

interface WriteFileRequest {
  filePath: string;
  content: string;
  verify?: boolean;
}

interface WriteI18nRequest {
  repositoryRoot: string;
  instructions: Array<{
    type: 'i18n-add-key';
    key: string;
    translations: Record<string, string>;
  }>;
}

/**
 * Liest Request-Body
 */
async function readRequestBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Setzt verschachtelten Wert in JSON-Objekt
 */
function setNestedValue(obj: any, segments: string[], value: string): void {
  let current = obj;
  for (let i = 0; i < segments.length - 1; i++) {
    if (!current[segments[i]]) {
      current[segments[i]] = {};
    }
    current = current[segments[i]];
  }
  current[segments[segments.length - 1]] = value;
}

/**
 * Liest verschachtelten Wert aus JSON-Objekt
 */
function getNestedValue(obj: any, segments: string[]): any {
  return segments.reduce((acc, segment) => {
    if (acc === null || acc === undefined) {
      return null;
    }
    return acc[segment];
  }, obj);
}

/**
 * Schreibt einzelne Datei
 */
async function writeSingleFile(
  filePath: string,
  content: string,
  verify: boolean = true
): Promise<{ success: boolean; message: string; verified?: boolean }> {
  const TRACE_MARKER = `WRITE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  logger.info({ TRACE_MARKER, filePath, contentLength: content.length }, 'writeSingleFile: Start');
  
  try {
    // Absoluter Pfad verwenden
    const absolutePath = path.isAbsolute(filePath) 
      ? filePath 
      : path.resolve(process.cwd(), filePath);
    
    logger.info({ TRACE_MARKER, filePath, absolutePath }, 'Path Resolution');
    
    // Verzeichnis-Prüfung
    const dir = path.dirname(absolutePath);
    try {
      const stats = await stat(dir);
      if (!stats.isDirectory()) {
        throw new Error(`${dir} ist kein Verzeichnis`);
      }
      logger.info({ TRACE_MARKER, dir, isDirectory: true }, 'Verzeichnis verifiziert');
    } catch (error) {
      logger.error({ TRACE_MARKER, dir, err: error }, 'Verzeichnis-Prüfung fehlgeschlagen');
      throw new Error(`Verzeichnis existiert nicht: ${dir}`);
    }
    
    // Datei schreiben
    logger.info({ TRACE_MARKER, absolutePath }, 'SCHREIBE DATEI');
    await writeFile(absolutePath, content, 'utf8');
    
    // Verifikation
    if (verify) {
      logger.info({ TRACE_MARKER, absolutePath }, 'Verifiziere geschriebene Datei');
      const verifyContent = await readFile(absolutePath, 'utf8');
      const verified = verifyContent === content;
      
      if (!verified) {
        throw new Error(`Verifikation fehlgeschlagen: Inhalt stimmt nicht überein`);
      }
      
      logger.info({ TRACE_MARKER, absolutePath, verified: true }, 'Datei erfolgreich geschrieben und verifiziert');
      return { success: true, message: 'Datei geschrieben', verified: true };
    }
    
    logger.info({ TRACE_MARKER, absolutePath }, 'Datei erfolgreich geschrieben (ohne Verifikation)');
    return { success: true, message: 'Datei geschrieben', verified: false };
  } catch (error) {
    logger.error({ TRACE_MARKER, filePath, err: error }, 'writeSingleFile fehlgeschlagen');
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Verarbeitet i18n-Add-Key Instructions
 */
async function processI18nInstructions(
  repositoryRoot: string,
  instructions: Array<{
    type: 'i18n-add-key';
    key: string;
    translations: Record<string, string>;
  }>
): Promise<{ success: boolean; message: string; filesWritten: number }> {
  const TRACE_MARKER = `I18N-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  logger.info({ TRACE_MARKER, repositoryRoot, instructionCount: instructions.length }, 'processI18nInstructions: Start');
  
  // Absoluter Pfad verwenden
  const absoluteRepositoryRoot = path.isAbsolute(repositoryRoot)
    ? repositoryRoot
    : path.resolve(process.cwd(), repositoryRoot);
  
  logger.info({ TRACE_MARKER, repositoryRoot, absoluteRepositoryRoot }, 'Path Resolution');
  
  let filesWritten = 0;
  const errors: string[] = [];
  
  for (const instruction of instructions) {
    const { key, translations } = instruction;
    const keySegments = key.split('.');
    
    logger.info({ TRACE_MARKER, key, translationCount: Object.keys(translations).length }, 'Verarbeite Instruction');
    
    for (const [locale, translation] of Object.entries(translations)) {
      const localeFile = path.resolve(absoluteRepositoryRoot, 'messages', `${locale}.json`);
      
      try {
        // Datei lesen
        logger.info({ TRACE_MARKER, locale, localeFile }, 'Lese Locale-Datei');
        const content = await readFile(localeFile, 'utf8');
        const json = JSON.parse(content);
        
        // Prüfe ob Wert bereits vorhanden
        const existing = getNestedValue(json, keySegments);
        const translationValue = typeof translation === 'string' ? translation : String(translation);
        
        if (existing === translationValue) {
          logger.debug({ TRACE_MARKER, locale, key, existingValue: existing }, 'Übersetzung bereits vorhanden');
          continue;
        }
        
        // Wert setzen
        setNestedValue(json, keySegments, translationValue);
        const newContent = `${JSON.stringify(json, null, 2)}\n`;
        
        // Datei schreiben
        logger.info({ TRACE_MARKER, localeFile, key, value: translationValue }, 'SCHREIBE DATEI');
        await writeFile(localeFile, newContent, 'utf8');
        
        // Verifikation
        logger.info({ TRACE_MARKER, localeFile }, 'Verifiziere geschriebene Datei');
        const verifyContent = await readFile(localeFile, 'utf8');
        const verifyJson = JSON.parse(verifyContent);
        const verifyValue = getNestedValue(verifyJson, keySegments);
        
        if (verifyValue !== translationValue) {
          throw new Error(
            `Verifikation fehlgeschlagen: Erwartet "${translationValue}", Gefunden "${verifyValue}"`
          );
        }
        
        logger.info({ TRACE_MARKER, localeFile, key, verified: true }, 'Datei erfolgreich geschrieben und verifiziert');
        filesWritten++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error({ TRACE_MARKER, localeFile, key, err: error }, 'Fehler beim Verarbeiten');
        errors.push(`${localeFile}: ${errorMessage}`);
      }
    }
  }
  
  if (errors.length > 0) {
    return {
      success: false,
      message: `Fehler bei ${errors.length} Datei(en): ${errors.join('; ')}`,
      filesWritten,
    };
  }
  
  logger.info({ TRACE_MARKER, filesWritten }, 'processI18nInstructions: Abgeschlossen');
  return {
    success: true,
    message: `${filesWritten} Datei(en) erfolgreich geschrieben`,
    filesWritten,
  };
}

/**
 * HTTP-Server für Datei-Operationen
 */
const server = http.createServer(async (req, res) => {
  // CORS-Header
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.method === 'POST' && req.url === '/write-file') {
    try {
      const body = await readRequestBody(req) as WriteFileRequest;
      const { filePath, content, verify = true } = body;
      
      logger.info({ filePath, contentLength: content.length, verify }, 'POST /write-file');
      
      const result = await writeSingleFile(filePath, content, verify);
      
      const statusCode = result.success ? 200 : 500;
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (error) {
      logger.error({ err: error }, 'POST /write-file Fehler');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : String(error),
      }));
    }
    return;
  }
  
  if (req.method === 'POST' && req.url === '/write-i18n') {
    try {
      const body = await readRequestBody(req) as WriteI18nRequest;
      const { repositoryRoot, instructions } = body;
      
      logger.info({ repositoryRoot, instructionCount: instructions.length }, 'POST /write-i18n');
      
      const result = await processI18nInstructions(repositoryRoot, instructions);
      
      const statusCode = result.success ? 200 : 500;
      res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (error) {
      logger.error({ err: error }, 'POST /write-i18n Fehler');
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : String(error),
      }));
    }
    return;
  }
  
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'file-writer-worker',
      timestamp: new Date().toISOString(),
    }));
    return;
  }
  
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

server.listen(PORT, () => {
  logger.info({ port: PORT }, 'File Writer Worker läuft');
});

// Graceful Shutdown
process.on('SIGINT', () => {
  logger.info('File Writer Worker wird heruntergefahren');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  logger.info('File Writer Worker wird heruntergefahren');
  server.close(() => {
    process.exit(0);
  });
});

