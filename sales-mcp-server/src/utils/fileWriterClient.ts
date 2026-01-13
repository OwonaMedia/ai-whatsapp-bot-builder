/**
 * File Writer Client - Client für File Writer Worker
 * 
 * Dieser Client kommuniziert mit dem File Writer Worker über HTTP.
 */

import http from 'node:http';
import type { Logger } from './logger.js';
import { logWithContext } from './logger.js';

const FILE_WRITER_URL = process.env.FILE_WRITER_URL || 'http://localhost:3004';
const FILE_WRITER_TIMEOUT = parseInt(process.env.FILE_WRITER_TIMEOUT || '30000', 10);

interface WriteFileResult {
  success: boolean;
  message: string;
  verified?: boolean;
}

interface WriteI18nResult {
  success: boolean;
  message: string;
  filesWritten: number;
}

/**
 * Schreibt Datei über File Writer Worker
 */
export async function writeFileViaWorker(
  filePath: string,
  content: string,
  verify: boolean = true,
  logger: Logger
): Promise<WriteFileResult> {
  const TRACE_MARKER = `CLIENT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  logWithContext(logger, 'info', 'writeFileViaWorker: Start', {
    component: 'FileWriterClient',
    metadata: { TRACE_MARKER, filePath, contentLength: content.length, verify },
  });
  
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      filePath,
      content,
      verify,
    });
    
    const options = {
      hostname: new URL(FILE_WRITER_URL).hostname,
      port: new URL(FILE_WRITER_URL).port || 3003,
      path: '/write-file',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
      timeout: FILE_WRITER_TIMEOUT,
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk.toString();
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data) as WriteFileResult;
          
          logWithContext(logger, result.success ? 'info' : 'error', 'writeFileViaWorker: Abgeschlossen', {
            component: 'FileWriterClient',
            metadata: { TRACE_MARKER, success: result.success, message: result.message },
          });
          
          resolve(result);
        } catch (error) {
          logWithContext(logger, 'error', 'writeFileViaWorker: JSON-Parse-Fehler', {
            component: 'FileWriterClient',
            error: error instanceof Error ? error : new Error(String(error)),
            metadata: { TRACE_MARKER, responseData: data },
          });
          reject(new Error(`JSON-Parse-Fehler: ${error instanceof Error ? error.message : String(error)}`));
        }
      });
    });
    
    req.on('error', (error) => {
      logWithContext(logger, 'error', 'writeFileViaWorker: Request-Fehler', {
        component: 'FileWriterClient',
        error,
        metadata: { TRACE_MARKER, filePath },
      });
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      logWithContext(logger, 'error', 'writeFileViaWorker: Timeout', {
        component: 'FileWriterClient',
        metadata: { TRACE_MARKER, filePath, timeout: FILE_WRITER_TIMEOUT },
      });
      reject(new Error(`Timeout nach ${FILE_WRITER_TIMEOUT}ms`));
    });
    
    req.write(postData);
    req.end();
  });
}

/**
 * Schreibt i18n-Dateien über File Writer Worker
 */
export async function writeI18nViaWorker(
  repositoryRoot: string,
  instructions: Array<{
    type: 'i18n-add-key';
    key: string;
    translations: Record<string, string>;
  }>,
  logger: Logger
): Promise<WriteI18nResult> {
  const TRACE_MARKER = `CLIENT-I18N-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  logWithContext(logger, 'info', 'writeI18nViaWorker: Start', {
    component: 'FileWriterClient',
    metadata: { TRACE_MARKER, repositoryRoot, instructionCount: instructions.length },
  });
  
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      repositoryRoot,
      instructions,
    });
    
    const options = {
      hostname: new URL(FILE_WRITER_URL).hostname,
      port: new URL(FILE_WRITER_URL).port || 3004,
      path: '/write-i18n',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
      timeout: FILE_WRITER_TIMEOUT,
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk.toString();
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data) as WriteI18nResult;
          
          logWithContext(logger, result.success ? 'info' : 'error', 'writeI18nViaWorker: Abgeschlossen', {
            component: 'FileWriterClient',
            metadata: { TRACE_MARKER, success: result.success, filesWritten: result.filesWritten, message: result.message },
          });
          
          resolve(result);
        } catch (error) {
          logWithContext(logger, 'error', 'writeI18nViaWorker: JSON-Parse-Fehler', {
            component: 'FileWriterClient',
            error: error instanceof Error ? error : new Error(String(error)),
            metadata: { TRACE_MARKER, responseData: data },
          });
          reject(new Error(`JSON-Parse-Fehler: ${error instanceof Error ? error.message : String(error)}`));
        }
      });
    });
    
    req.on('error', (error) => {
      logWithContext(logger, 'error', 'writeI18nViaWorker: Request-Fehler', {
        component: 'FileWriterClient',
        error,
        metadata: { TRACE_MARKER, repositoryRoot },
      });
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      logWithContext(logger, 'error', 'writeI18nViaWorker: Timeout', {
        component: 'FileWriterClient',
        metadata: { TRACE_MARKER, repositoryRoot, timeout: FILE_WRITER_TIMEOUT },
      });
      reject(new Error(`Timeout nach ${FILE_WRITER_TIMEOUT}ms`));
    });
    
    req.write(postData);
    req.end();
  });
}

/**
 * Prüft ob File Writer Worker erreichbar ist
 */
export async function checkFileWriterHealth(): Promise<boolean> {
  return new Promise((resolve) => {
    const options = {
      hostname: new URL(FILE_WRITER_URL).hostname,
      port: new URL(FILE_WRITER_URL).port || 3004,
      path: '/health',
      method: 'GET',
      timeout: 5000,
    };
    
    const req = http.request(options, (res) => {
      resolve(res.statusCode === 200);
    });
    
    req.on('error', () => {
      resolve(false);
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

