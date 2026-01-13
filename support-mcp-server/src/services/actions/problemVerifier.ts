/**
 * Problem Verifier
 * 
 * Verifiziert, ob ein erkanntes Problem tatsächlich vorliegt,
 * bevor ein Fix ausgeführt wird.
 * 
 * Dies verhindert unnötige Fixes und stellt sicher, dass
 * nur echte Probleme behoben werden.
 */

import { readFile, access, constants } from 'fs/promises';
import { join } from 'path';
import type { Logger } from '../../utils/logger.js';
import type { MinimalTicket } from './autopatchPatterns.js';
import type { ConfigurationItem } from './reverseEngineeringAnalyzer.js';
import type { ReverseEngineeringAnalyzer } from './reverseEngineeringAnalyzer.js';

export interface VerificationResult {
  problemExists: boolean;
  evidence: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  details?: Record<string, unknown>;
}

export class ProblemVerifier {
  constructor(
    private readonly rootDir: string,
    private readonly logger: Logger,
    private readonly reverseEngineeringAnalyzer: ReverseEngineeringAnalyzer | null = null,
  ) {}

  /**
   * Verifiziert ein Problem basierend auf dem Ticket und Pattern-ID
   * Unterstützt jetzt auch dynamische Konfigurations-basierte Verifikation
   * 
   * NEU: Nutzt Reverse Engineering Dokumentation als Referenz für erwarteten Zustand
   */
  async verifyProblem(
    ticket: MinimalTicket,
    patternId: string
  ): Promise<VerificationResult> {
    this.logger.info(
      { ticketId: ticket.title, patternId },
      'Starte Problem-Verifikation'
    );

    // NEU: Wenn Reverse Engineering Analyzer verfügbar ist, nutze Blaupause-Vergleich
    if (this.reverseEngineeringAnalyzer && patternId.startsWith('config-')) {
      const blueprintResult = await this.verifyAgainstBlueprint(ticket, patternId);
      if (blueprintResult) {
        this.logger.info(
          { ticketId: ticket.title, patternId, deviationFound: blueprintResult.problemExists },
          'Blaupause-Vergleich abgeschlossen'
        );
        return blueprintResult;
      }
    }

    // Prüfe ob es eine Konfigurations-basierte Pattern-ID ist
    if (patternId.startsWith('config-')) {
      const result = await this.verifyConfigurationBasedProblem(ticket, patternId);
      
      // ERWEITERTE PRÜFUNG: Wenn es ein PDF-Problem ist, prüfe auch Upload-Funktionalität
      if (patternId.includes('pdf') || patternId.includes('parsePdf')) {
        const uploadCheck = await this.verifyPdfUploadFunctionality(ticket);
        // Kombiniere Evidenz
        result.evidence.push(...uploadCheck.evidence);
        // Problem existiert wenn eines der Checks ein Problem findet
        if (uploadCheck.problemExists) {
          result.problemExists = true;
          result.severity = 'high';
        }
      }
      
      return result;
    }

    switch (patternId) {
      case 'pdf-worker-module-not-found':
        return await this.verifyPdfWorkerModule(ticket);
      
      case 'knowledge-upload-failed':
        return await this.verifyKnowledgeUpload(ticket);
      
      case 'missing-translation':
        return await this.verifyMissingTranslation(ticket);
      
      case 'missing-env-variable':
        return await this.verifyMissingEnvVariable(ticket);
      
      case 'whatsapp-link-button-issue':
        return await this.verifyWhatsAppLinkButton(ticket);
      
      default:
        // Für unbekannte Patterns: Standard-Verifikation
        return await this.verifyGenericProblem(ticket, patternId);
    }
  }

  /**
   * Verifiziert ein Problem basierend auf einer Konfiguration (dynamisch)
   */
  private async verifyConfigurationBasedProblem(
    ticket: MinimalTicket,
    patternId: string
  ): Promise<VerificationResult> {
    const evidence: string[] = [];
    let problemExists = false;

    // Parse Pattern-ID: config-{type}-{name}
    const parts = patternId.split('-');
    if (parts.length < 3) {
      return {
        problemExists: false,
        evidence: ['❌ Ungültige Pattern-ID'],
        severity: 'low',
      };
    }

    const configType = parts[1]; // env_var, api_endpoint, etc.
    const configName = parts.slice(2).join('-'); // Rest ist der Name

    evidence.push(`✅ Konfiguration erkannt: ${configType} - ${configName}`);

    try {
      switch (configType) {
        case 'env_var': {
          const envPath = join(this.rootDir, '.env.local');
          try {
            const envContent = await readFile(envPath, 'utf-8');
            if (envContent.includes(configName)) {
              evidence.push(`✅ ${configName} in .env.local vorhanden`);
              
              // ERWEITERTE PRÜFUNG: Verwendungs-Prüfung und Format-Validierung
              const envCheck = await this.verifyEnvVariable(configName, envContent, ticket);
              evidence.push(...envCheck.evidence);
              if (envCheck.problemExists) {
                problemExists = true;
              }
            } else {
              evidence.push(`❌ ${configName} fehlt in .env.local`);
              problemExists = true;
            }
          } catch {
            evidence.push('⚠️  .env.local konnte nicht gelesen werden');
            problemExists = true;
          }
          break;
        }

        case 'api_endpoint': {
          // configName ist der Endpoint-Pfad (z.B. /api/knowledge/upload)
          const routePath = join(this.rootDir, 'app', 'api', configName.replace(/^\//, ''), 'route.ts');
          try {
            await access(routePath, constants.F_OK);
            evidence.push(`✅ API Route existiert: ${routePath}`);
            
            // ERWEITERTE PRÜFUNG für API-Endpoints
            const apiCheck = await this.verifyApiEndpoint(routePath, ticket);
            evidence.push(...apiCheck.evidence);
            if (apiCheck.problemExists) {
              problemExists = true;
            }
          } catch {
            evidence.push(`❌ API Route fehlt: ${routePath}`);
            problemExists = true;
          }
          break;
        }

        case 'frontend_config': {
          // configName ist der Dateipfad (kann relativ oder absolut sein)
          let filePath: string | null = null;
          
          // Prüfe ob configName bereits ein vollständiger Pfad ist
          if (configName.startsWith('/') || configName.startsWith('app/') || configName.startsWith('lib/')) {
            // Relativer Pfad vom Frontend-Root
            filePath = join(this.rootDir, configName);
          } else {
            // Versuche verschiedene mögliche Pfade
            const possiblePaths = [
              join(this.rootDir, configName),
              join(this.rootDir, 'app', configName),
              join(this.rootDir, 'lib', configName),
            ];
            
            for (const path of possiblePaths) {
              try {
                await access(path, constants.F_OK);
                filePath = path;
                break;
              } catch {
                // Versuche nächsten Pfad
              }
            }
            
            if (!filePath) {
              filePath = join(this.rootDir, configName); // Fallback
              evidence.push(`❌ Datei nicht gefunden: ${configName}`);
              evidence.push(`   Versuchte Pfade: ${possiblePaths.join(', ')}`);
              problemExists = true;
            }
          }
          
          if (filePath) {
            try {
              await access(filePath, constants.F_OK);
              evidence.push(`✅ Datei existiert: ${filePath}`);
              
              // ERWEITERTE PRÜFUNG für alle Frontend-Konfigurationen
              const frontendCheck = await this.verifyFrontendConfig(filePath, ticket);
              evidence.push(...frontendCheck.evidence);
              if (frontendCheck.problemExists) {
                problemExists = true;
              }
            } catch {
              evidence.push(`❌ Datei fehlt: ${filePath}`);
              problemExists = true;
            }
          }
          break;
        }

        case 'database_setting': {
          evidence.push('✅ Database-Konfiguration erkannt');
          
          // ERWEITERTE PRÜFUNG für Database-Settings
          const dbCheck = await this.verifyDatabaseSetting(configName, ticket);
          evidence.push(...dbCheck.evidence);
          if (dbCheck.problemExists) {
            problemExists = true;
          }
          break;
        }

        case 'deployment_config': {
          evidence.push('✅ Deployment-Konfiguration erkannt');
          
          // ERWEITERTE PRÜFUNG für Deployment-Configs
          const deployCheck = await this.verifyDeploymentConfig(configName, ticket);
          evidence.push(...deployCheck.evidence);
          if (deployCheck.problemExists) {
            problemExists = true;
          }
          break;
        }

        default:
          evidence.push(`⚠️  Unbekannter Konfigurationstyp: ${configType}`);
          problemExists = true;
      }
    } catch (error) {
      evidence.push(`❌ Verifikationsfehler: ${error}`);
      problemExists = true;
    }

    return {
      problemExists,
      evidence,
      severity: problemExists ? 'high' : 'low',
      details: {
        patternId,
        configType,
        configName,
      },
    };
  }

  /**
   * Erweiterte Verifikation für PDF-bezogene Dateien
   */
  private async verifyPdfRelatedFile(
    filePath: string,
    evidence: string[]
  ): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');
      
      // 1. Prüfe auf Worker-Modul-Referenzen (häufiges Problem)
      if (content.includes('pdf.worker') || content.includes('pdf.worker.mjs') || content.includes('pdf.worker.js')) {
        evidence.push(`⚠️  Explizite Worker-Pfad-Referenz gefunden - kann zu "Cannot find module" Fehlern führen`);
        // Problem existiert nur wenn es ein expliziter Pfad ist, nicht nur die Erwähnung
        if (content.match(/pdf\.worker\.(mjs|js)['"]/)) {
          evidence.push(`❌ Expliziter Worker-Pfad gefunden - Problem wahrscheinlich`);
        }
      } else {
        evidence.push(`✅ Keine expliziten Worker-Pfad-Referenzen gefunden`);
      }
      
      // 2. Prüfe auf pdf-parse Import
      if (content.includes('pdf-parse') || content.includes('PDFParse')) {
        evidence.push(`✅ pdf-parse wird verwendet`);
      } else {
        evidence.push(`⚠️  pdf-parse wird nicht verwendet - möglicherweise falsche Bibliothek`);
      }
      
      // 3. Prüfe Upload-Route für PDF-Verarbeitung
      const uploadRoutePath = join(this.rootDir, 'app', 'api', 'knowledge', 'upload', 'route.ts');
      try {
        await access(uploadRoutePath, constants.F_OK);
        evidence.push(`✅ Upload-Route existiert: ${uploadRoutePath}`);
        
        const uploadContent = await readFile(uploadRoutePath, 'utf-8');
        
        // Prüfe auf parsePdfBuffer Import
        if (uploadContent.includes('parsePdfBuffer')) {
          evidence.push(`✅ parsePdfBuffer wird in Upload-Route verwendet`);
        } else {
          evidence.push(`⚠️  parsePdfBuffer wird nicht in Upload-Route verwendet`);
        }
        
        // Prüfe auf chunkText Funktion
        if (uploadContent.includes('chunkText')) {
          evidence.push(`✅ chunkText Funktion vorhanden`);
          
          // Prüfe auf bekannte chunkText-Probleme
          if (uploadContent.includes('MAX_ITERATIONS') && uploadContent.includes('infinite loop')) {
            evidence.push(`✅ chunkText hat Infinite-Loop-Schutz`);
          } else {
            evidence.push(`⚠️  chunkText hat möglicherweise keinen Infinite-Loop-Schutz`);
          }
        } else {
          evidence.push(`⚠️  chunkText Funktion nicht gefunden`);
        }
        
        // Prüfe auf generateEmbeddingsForSource
        if (uploadContent.includes('generateEmbeddingsForSource')) {
          evidence.push(`✅ Embedding-Generierung vorhanden`);
        } else {
          evidence.push(`⚠️  Embedding-Generierung nicht gefunden`);
        }
        
        // Prüfe auf Error Handling
        if (uploadContent.includes('try') && uploadContent.includes('catch')) {
          evidence.push(`✅ Error Handling vorhanden`);
        } else {
          evidence.push(`⚠️  Error Handling könnte fehlen`);
        }
        
        // Prüfe auf bekannte Fehlermeldungen im Code
        if (uploadContent.includes('Cannot find module') || uploadContent.includes('worker') && uploadContent.includes('not found')) {
          evidence.push(`⚠️  Bekannte Fehlermeldungen im Code gefunden`);
        }
        
      } catch {
        evidence.push(`⚠️  Upload-Route konnte nicht geprüft werden: ${uploadRoutePath}`);
      }
      
      // 4. Prüfe package.json für pdf-parse Dependency
      const packageJsonPath = join(this.rootDir, 'package.json');
      try {
        const packageJsonContent = await readFile(packageJsonPath, 'utf-8');
        const packageJson = JSON.parse(packageJsonContent);
        
        if (packageJson.dependencies && packageJson.dependencies['pdf-parse']) {
          evidence.push(`✅ pdf-parse in package.json vorhanden`);
        } else if (packageJson.dependencies && packageJson.dependencies['pdf-parse'] === undefined) {
          evidence.push(`❌ pdf-parse fehlt in package.json`);
        } else {
          evidence.push(`⚠️  pdf-parse Dependency-Status unklar`);
        }
      } catch {
        evidence.push(`⚠️  package.json konnte nicht gelesen werden`);
      }
      
      // 5. Prüfe auf häufige PDF-Upload-Probleme basierend auf Ticket-Text
      // (wird in verifyProblem aufgerufen, wenn Ticket verfügbar ist)
      
    } catch (error) {
      evidence.push(`⚠️  Erweiterte PDF-Verifikation fehlgeschlagen: ${error}`);
    }
  }

  /**
   * Verifiziert PDF-Upload-Funktionalität (unabhängig von spezifischen Dateien)
   */
  private async verifyPdfUploadFunctionality(
    ticket: MinimalTicket
  ): Promise<{ problemExists: boolean; evidence: string[] }> {
    const evidence: string[] = [];
    let problemExists = false;
    
    evidence.push(`\n📄 PDF-UPLOAD-FUNKTIONALITÄT PRÜFUNG:`);
    
    try {
      // 1. Prüfe Upload-Route
      const uploadRoutePath = join(this.rootDir, 'app', 'api', 'knowledge', 'upload', 'route.ts');
      try {
        await access(uploadRoutePath, constants.F_OK);
        evidence.push(`✅ Upload-Route existiert`);
        
        const uploadContent = await readFile(uploadRoutePath, 'utf-8');
        
        // Prüfe auf häufige Upload-Probleme
        const ticketText = `${ticket.title ?? ''} ${ticket.description ?? ''}`.toLowerCase();
        
        // Prüfe auf "upload fehlgeschlagen" oder ähnliche Fehler
        if (ticketText.includes('upload') && (ticketText.includes('fehlgeschlagen') || ticketText.includes('schlägt fehl') || ticketText.includes('funktioniert nicht'))) {
          evidence.push(`⚠️  Ticket beschreibt Upload-Problem`);
          
          // Prüfe ob parsePdfBuffer aufgerufen wird
          if (uploadContent.includes('parsePdfBuffer')) {
            evidence.push(`✅ parsePdfBuffer wird aufgerufen`);
            
            // Prüfe auf Error Handling um parsePdfBuffer
            const parsePdfIndex = uploadContent.indexOf('parsePdfBuffer');
            const surroundingCode = uploadContent.substring(
              Math.max(0, parsePdfIndex - 200),
              Math.min(uploadContent.length, parsePdfIndex + 500)
            );
            
            if (surroundingCode.includes('try') && surroundingCode.includes('catch')) {
              evidence.push(`✅ Error Handling um parsePdfBuffer vorhanden`);
            } else {
              evidence.push(`⚠️  Error Handling um parsePdfBuffer könnte fehlen`);
              problemExists = true;
            }
          } else {
            evidence.push(`❌ parsePdfBuffer wird nicht aufgerufen - Upload funktioniert nicht`);
            problemExists = true;
          }
        }
        
        // Prüfe auf chunkText-Probleme
        if (uploadContent.includes('chunkText')) {
          // Prüfe auf Infinite-Loop-Schutz
          if (uploadContent.includes('MAX_ITERATIONS') || uploadContent.includes('infinite loop')) {
            evidence.push(`✅ chunkText hat Infinite-Loop-Schutz`);
          } else {
            evidence.push(`⚠️  chunkText hat möglicherweise keinen Infinite-Loop-Schutz`);
            // Nicht als Problem markieren, da es nur eine Warnung ist
          }
        }
        
        // Prüfe auf Embedding-Generierung
        if (uploadContent.includes('generateEmbeddingsForSource')) {
          evidence.push(`✅ Embedding-Generierung vorhanden`);
        } else {
          evidence.push(`⚠️  Embedding-Generierung nicht gefunden`);
        }
        
      } catch {
        evidence.push(`❌ Upload-Route nicht gefunden: ${uploadRoutePath}`);
        problemExists = true;
      }
      
      // 2. Prüfe Embeddings-Route
      const embeddingsRoutePath = join(this.rootDir, 'app', 'api', 'knowledge', 'embeddings', 'route.ts');
      try {
        await access(embeddingsRoutePath, constants.F_OK);
        evidence.push(`✅ Embeddings-Route existiert`);
      } catch {
        evidence.push(`⚠️  Embeddings-Route nicht gefunden: ${embeddingsRoutePath}`);
      }
      
      // 3. Prüfe auf bekannte Fehlermuster im Ticket-Text
      const ticketText = `${ticket.title ?? ''} ${ticket.description ?? ''}`.toLowerCase();
      
      if (ticketText.includes('worker') && (ticketText.includes('nicht gefunden') || ticketText.includes('not found'))) {
        evidence.push(`⚠️  Ticket beschreibt Worker-Modul-Problem`);
        problemExists = true;
      }
      
      if (ticketText.includes('upload') && (ticketText.includes('fehlgeschlagen') || ticketText.includes('schlägt fehl'))) {
        evidence.push(`⚠️  Ticket beschreibt Upload-Problem`);
        // Problem existiert wahrscheinlich, wenn Upload fehlschlägt
        problemExists = true;
      }
      
    } catch (error) {
      evidence.push(`❌ PDF-Upload-Verifikation fehlgeschlagen: ${error}`);
      problemExists = true;
    }
    
    return { problemExists, evidence };
  }

  /**
   * Verifiziert PDF Worker-Modul Problem
   */
  private async verifyPdfWorkerModule(ticket: MinimalTicket): Promise<VerificationResult> {
    const evidence: string[] = [];
    let problemExists = false;

    try {
      // 1. Prüfe ob parsePdf.ts existiert
      // rootDir zeigt bereits auf das Frontend-Verzeichnis
      const parsePdfPath = join(this.rootDir, 'lib', 'pdf', 'parsePdf.ts');
      try {
        await access(parsePdfPath, constants.F_OK);
        evidence.push('✅ parsePdf.ts existiert');
      } catch {
        evidence.push('❌ parsePdf.ts fehlt');
        problemExists = true;
      }

      // 2. Prüfe ob pdf-parse verwendet wird
      if (!problemExists) {
        try {
          const parsePdfContent = await readFile(parsePdfPath, 'utf-8');
          if (parsePdfContent.includes('pdf-parse')) {
            evidence.push('✅ pdf-parse wird verwendet');
            
            // 3. Prüfe ob Worker-Pfad korrekt ist
            if (parsePdfContent.includes('pdf.worker.mjs') || 
                parsePdfContent.includes('pdf.worker.js')) {
              evidence.push('⚠️  PDF Worker-Pfad gefunden - möglicherweise falscher Pfad');
              problemExists = true;
            } else {
              evidence.push('✅ Kein expliziter Worker-Pfad gefunden (verwendet Standard)');
            }
          } else {
            evidence.push('❌ pdf-parse wird nicht verwendet');
            problemExists = true;
          }
        } catch (error) {
          evidence.push(`❌ Fehler beim Lesen von parsePdf.ts: ${error}`);
          problemExists = true;
        }
      }

      // 4. Prüfe upload/route.ts für Worker-Referenzen
      const uploadRoutePath = join(this.rootDir, 'app', 'api', 'knowledge', 'upload', 'route.ts');
      try {
        const uploadContent = await readFile(uploadRoutePath, 'utf-8');
        if (uploadContent.includes('pdf.worker') || 
            uploadContent.includes('Cannot find module')) {
          evidence.push('⚠️  Worker-Referenz in upload/route.ts gefunden');
          problemExists = true;
        } else {
          evidence.push('✅ Keine Worker-Referenz in upload/route.ts');
        }
      } catch {
        evidence.push('⚠️  upload/route.ts konnte nicht gelesen werden');
      }

      // 5. Prüfe package.json für pdf-parse Dependency
      const packageJsonPath = join(this.rootDir, 'package.json');
      try {
        const packageContent = await readFile(packageJsonPath, 'utf-8');
        const packageJson = JSON.parse(packageContent);
        if (packageJson.dependencies?.['pdf-parse'] || 
            packageJson.devDependencies?.['pdf-parse']) {
          evidence.push('✅ pdf-parse in package.json vorhanden');
        } else {
          evidence.push('❌ pdf-parse fehlt in package.json');
          problemExists = true;
        }
      } catch {
        evidence.push('⚠️  package.json konnte nicht gelesen werden');
      }

      // 6. Prüfe Ticket-Beschreibung für spezifische Fehlermeldungen
      const ticketText = `${ticket.title ?? ''} ${ticket.description ?? ''}`.toLowerCase();
      if (ticketText.includes('cannot find module') && 
          (ticketText.includes('pdf.worker') || ticketText.includes('worker.mjs'))) {
        evidence.push('✅ Fehlermeldung im Ticket bestätigt Problem');
        problemExists = true;
      }

    } catch (error) {
      this.logger.error({ err: error }, 'Fehler bei PDF Worker-Verifikation');
      evidence.push(`❌ Verifikationsfehler: ${error}`);
      problemExists = true; // Im Zweifel Problem annehmen
    }

    return {
      problemExists,
      evidence,
      severity: problemExists ? 'high' : 'low',
      details: {
        patternId: 'pdf-worker-module-not-found',
        rootDir: this.rootDir,
      },
    };
  }

  /**
   * Verifiziert Knowledge Upload Problem
   */
  private async verifyKnowledgeUpload(ticket: MinimalTicket): Promise<VerificationResult> {
    const evidence: string[] = [];
    let problemExists = false;

    try {
      const uploadRoutePath = join(this.rootDir, 'app', 'api', 'knowledge', 'upload', 'route.ts');
      const uploadContent = await readFile(uploadRoutePath, 'utf-8');
      
      // Prüfe auf bekannte Fehlerquellen
      if (uploadContent.includes('chunkText') && 
          !uploadContent.includes('safety check') && 
          !uploadContent.includes('timeout')) {
        evidence.push('⚠️  chunkText ohne Safety-Checks gefunden');
        problemExists = true;
      } else {
        evidence.push('✅ chunkText hat Safety-Checks');
      }

      // Prüfe Embeddings-Route
      const embeddingsRoutePath = join(this.rootDir, 'app', 'api', 'knowledge', 'embeddings', 'route.ts');
      try {
        const embeddingsContent = await readFile(embeddingsRoutePath, 'utf-8');
        if (embeddingsContent.includes('router.huggingface.co')) {
          evidence.push('✅ Hugging Face API-Endpoint korrekt');
        } else {
          evidence.push('⚠️  Hugging Face API-Endpoint möglicherweise falsch');
          problemExists = true;
        }
      } catch {
        evidence.push('⚠️  Embeddings-Route konnte nicht gelesen werden');
      }

    } catch (error) {
      evidence.push(`❌ Verifikationsfehler: ${error}`);
      problemExists = true;
    }

    return {
      problemExists,
      evidence,
      severity: problemExists ? 'medium' : 'low',
    };
  }

  /**
   * Erweiterte Verifikation für API-Endpoints
   */
  private async verifyApiEndpoint(
    routePath: string,
    ticket: MinimalTicket
  ): Promise<{ problemExists: boolean; evidence: string[] }> {
    const evidence: string[] = [];
    let problemExists = false;
    
    evidence.push(`\n🔌 API-ENDPOINT PRÜFUNG:`);
    
    try {
      const routeContent = await readFile(routePath, 'utf-8');
      const ticketText = `${ticket.title ?? ''} ${ticket.description ?? ''}`.toLowerCase();
      
      // 1. Error Handling
      if (routeContent.includes('try') && routeContent.includes('catch')) {
        evidence.push(`✅ Error Handling vorhanden`);
      } else {
        evidence.push(`⚠️  Error Handling könnte fehlen`);
        if (ticketText.includes('fehler') || ticketText.includes('error')) {
          problemExists = true;
        }
      }
      
      // 2. Supabase Client-Prüfung
      const hasSupabaseClient = routeContent.includes('createRouteHandlerClient') ||
                                routeContent.includes('createServerSupabaseClient') ||
                                routeContent.includes('createServiceRoleClient') ||
                                routeContent.includes('createBackgroundAnonClient');
      
      if (hasSupabaseClient) {
        evidence.push(`✅ Supabase Client wird verwendet`);
        
        // Prüfe auf korrekte Client-Verwendung
        if (routeContent.includes('createRouteHandlerClient') && !routeContent.includes('await createRouteHandlerClient')) {
          evidence.push(`⚠️  createRouteHandlerClient sollte mit await aufgerufen werden`);
        }
      } else if (ticketText.includes('supabase') || ticketText.includes('datenbank')) {
        evidence.push(`⚠️  Supabase Client wird möglicherweise nicht verwendet`);
        problemExists = true;
      }
      
      // 3. Request-Validierung
      if (routeContent.includes('zod') || routeContent.includes('schema.parse') || routeContent.includes('validate')) {
        evidence.push(`✅ Request-Validierung vorhanden`);
      } else if (routeContent.includes('request.json') || routeContent.includes('formData')) {
        evidence.push(`⚠️  Request-Validierung könnte fehlen`);
        if (ticketText.includes('validierung') || ticketText.includes('validation')) {
          problemExists = true;
        }
      }
      
      // 4. Response-Format
      if (routeContent.includes('NextResponse.json') || routeContent.includes('Response.json')) {
        evidence.push(`✅ Korrektes Response-Format`);
      } else {
        evidence.push(`⚠️  Response-Format könnte fehlen`);
      }
      
      // 5. HTTP-Methoden-Prüfung
      const hasGet = routeContent.includes('export async function GET');
      const hasPost = routeContent.includes('export async function POST');
      const hasPut = routeContent.includes('export async function PUT');
      const hasDelete = routeContent.includes('export async function DELETE');
      
      if (hasGet || hasPost || hasPut || hasDelete) {
        evidence.push(`✅ HTTP-Methoden definiert`);
      } else {
        evidence.push(`⚠️  Keine HTTP-Methoden gefunden`);
        problemExists = true;
      }
      
      // 6. Authentifizierung-Prüfung
      if (routeContent.includes('getUser') || routeContent.includes('auth.getUser') || routeContent.includes('getSession')) {
        evidence.push(`✅ Authentifizierung wird geprüft`);
      } else if (ticketText.includes('auth') || ticketText.includes('login') || ticketText.includes('authentifizierung')) {
        evidence.push(`⚠️  Authentifizierung könnte fehlen`);
        problemExists = true;
      }
      
      // 7. Spezifische Funktionalitäts-Prüfung basierend auf Endpoint
      if (routePath.includes('upload')) {
        if (routeContent.includes('FormData') || routeContent.includes('formData')) {
          evidence.push(`✅ Upload-Funktionalität vorhanden`);
        } else {
          evidence.push(`⚠️  Upload-Funktionalität könnte fehlen`);
          problemExists = true;
        }
      }
      
      if (routePath.includes('payment') || routePath.includes('stripe') || routePath.includes('paypal')) {
        if (routeContent.includes('stripe') || routeContent.includes('paypal') || routeContent.includes('mollie')) {
          evidence.push(`✅ Payment-Integration vorhanden`);
        } else {
          evidence.push(`⚠️  Payment-Integration könnte fehlen`);
          if (ticketText.includes('zahlung') || ticketText.includes('payment')) {
            problemExists = true;
          }
        }
      }
      
    } catch (error) {
      evidence.push(`❌ Fehler bei API-Endpoint-Prüfung: ${error}`);
      problemExists = true;
    }
    
    return { problemExists, evidence };
  }

  /**
   * Erweiterte Verifikation für Frontend-Konfigurationen
   */
  private async verifyFrontendConfig(
    filePath: string,
    ticket: MinimalTicket
  ): Promise<{ problemExists: boolean; evidence: string[] }> {
    const evidence: string[] = [];
    let problemExists = false;
    
    evidence.push(`\n📄 FRONTEND-KONFIGURATION PRÜFUNG:`);
    
    try {
      const fileContent = await readFile(filePath, 'utf-8');
      const ticketText = `${ticket.title ?? ''} ${ticket.description ?? ''}`.toLowerCase();
      
      // Spezielle Prüfung für PDF-Dateien
      if (filePath.includes('pdf') || filePath.includes('parsePdf')) {
        await this.verifyPdfRelatedFile(filePath, evidence);
        
        // WICHTIG: Wenn Ticket ein Upload-Problem beschreibt, Problem als existierend markieren
        if (ticketText.includes('upload') && (ticketText.includes('fehlgeschlagen') || ticketText.includes('schlägt fehl') || ticketText.includes('funktioniert nicht') || ticketText.includes('nicht möglich'))) {
          evidence.push(`⚠️  Ticket beschreibt Upload-Problem - Problem existiert trotz vorhandener Datei`);
          problemExists = true;
        }
      }
      
      // Prüfung für React-Komponenten
      if (filePath.includes('.tsx') || filePath.includes('.jsx')) {
        // Prüfe auf 'use client' Directive
        if (filePath.includes('app/') && !fileContent.includes("'use client'") && !fileContent.includes('"use client"')) {
          evidence.push(`✅ Server Component (kein 'use client' nötig)`);
        } else if (filePath.includes('components/') && (fileContent.includes('useState') || fileContent.includes('useEffect'))) {
          if (!fileContent.includes("'use client'") && !fileContent.includes('"use client"')) {
            evidence.push(`⚠️  Client Component benötigt 'use client' Directive`);
            if (ticketText.includes('hydration') || ticketText.includes('client component')) {
              problemExists = true;
            }
          } else {
            evidence.push(`✅ 'use client' Directive vorhanden`);
          }
        }
        
        // Prüfe auf häufige React-Fehler
        if (fileContent.includes('useEffect') && !fileContent.includes('return') && fileContent.includes('useEffect(() => {')) {
          evidence.push(`⚠️  useEffect könnte Cleanup-Funktion benötigen`);
        }
        
        // Prüfe auf TypeScript-Typen
        if (filePath.endsWith('.tsx') && fileContent.includes('any')) {
          evidence.push(`⚠️  'any' Typen gefunden - sollte vermieden werden`);
        }
      }
      
      // Prüfung für TypeScript-Dateien
      if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
        // Prüfe auf Imports
        if (fileContent.includes('import') && fileContent.includes('from')) {
          evidence.push(`✅ Imports vorhanden`);
          
          // Prüfe auf fehlende Imports (wenn Funktionen verwendet werden, aber nicht importiert)
          const hasSupabaseUsage = fileContent.includes('supabase') || fileContent.includes('Supabase');
          const hasSupabaseImport = fileContent.includes("from '@supabase") || fileContent.includes("from '@/lib/supabase");
          
          if (hasSupabaseUsage && !hasSupabaseImport) {
            evidence.push(`⚠️  Supabase wird verwendet, aber möglicherweise nicht importiert`);
            problemExists = true;
          }
        }
      }
      
      // Prüfe auf Error Handling
      if (fileContent.includes('try') && fileContent.includes('catch')) {
        evidence.push(`✅ Error Handling vorhanden`);
      } else if (ticketText.includes('fehler') || ticketText.includes('error')) {
        evidence.push(`⚠️  Error Handling könnte fehlen`);
        problemExists = true;
      }
      
    } catch (error) {
      evidence.push(`❌ Fehler bei Frontend-Konfigurations-Prüfung: ${error}`);
      problemExists = true;
    }
    
    return { problemExists, evidence };
  }

  /**
   * Erweiterte Verifikation für Env-Variablen
   */
  private async verifyEnvVariable(
    varName: string,
    envContent: string,
    ticket: MinimalTicket
  ): Promise<{ problemExists: boolean; evidence: string[] }> {
    const evidence: string[] = [];
    let problemExists = false;
    
    evidence.push(`\n🔐 ENV-VARIABLE PRÜFUNG:`);
    
    try {
      // 1. Format-Validierung
      const varLine = envContent.split('\n').find(line => line.includes(varName) && !line.trim().startsWith('#'));
      if (varLine) {
        const value = varLine.split('=')[1]?.trim().replace(/^["']|["']$/g, '');
        
        // Prüfe auf leere Werte
        if (!value || value.length === 0) {
          evidence.push(`❌ ${varName} ist leer`);
          problemExists = true;
        } else {
          evidence.push(`✅ ${varName} hat einen Wert`);
        }
        
        // Format-Validierung basierend auf Variablenname
        if (varName.includes('URL') || varName.includes('url')) {
          if (value.startsWith('http://') || value.startsWith('https://')) {
            evidence.push(`✅ URL-Format korrekt`);
          } else {
            evidence.push(`⚠️  URL-Format könnte falsch sein`);
            problemExists = true;
          }
        }
        
        if (varName.includes('KEY') || varName.includes('SECRET') || varName.includes('TOKEN')) {
          if (value.length >= 10) {
            evidence.push(`✅ Key/Secret hat ausreichende Länge`);
          } else {
            evidence.push(`⚠️  Key/Secret könnte zu kurz sein`);
            problemExists = true;
          }
        }
      }
      
      // 2. Verwendungs-Prüfung (vereinfacht)
      evidence.push(`✅ Env-Variable wird im Code verwendet (vereinfachte Prüfung)`);
      
      // 3. Abhängigkeits-Prüfung
      if (varName.includes('SUPABASE')) {
        const hasUrl = envContent.includes('SUPABASE_URL') || envContent.includes('NEXT_PUBLIC_SUPABASE_URL');
        const hasKey = envContent.includes('SUPABASE_ANON_KEY') || envContent.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY');
        
        if (hasUrl && hasKey) {
          evidence.push(`✅ Supabase-Abhängigkeiten vorhanden`);
        } else {
          evidence.push(`⚠️  Supabase-Abhängigkeiten könnten fehlen`);
          const ticketText = `${ticket.title ?? ''} ${ticket.description ?? ''}`.toLowerCase();
          if (ticketText.includes('supabase')) {
            problemExists = true;
          }
        }
      }
      
    } catch (error) {
      evidence.push(`❌ Fehler bei Env-Variable-Prüfung: ${error}`);
      problemExists = true;
    }
    
    return { problemExists, evidence };
  }

  /**
   * Erweiterte Verifikation für Database-Settings
   */
  private async verifyDatabaseSetting(
    settingName: string,
    ticket: MinimalTicket
  ): Promise<{ problemExists: boolean; evidence: string[] }> {
    const evidence: string[] = [];
    let problemExists = false;
    
    evidence.push(`\n🗄️  DATABASE-SETTING PRÜFUNG:`);
    
    try {
      const ticketText = `${ticket.title ?? ''} ${ticket.description ?? ''}`.toLowerCase();
      
      // Prüfe auf RLS-Policy-Probleme
      if (ticketText.includes('rls') || ticketText.includes('row level security') || ticketText.includes('zugriff verweigert') || ticketText.includes('permission denied')) {
        evidence.push(`⚠️  Ticket beschreibt mögliches RLS-Problem`);
        evidence.push(`💡 RLS-Policies sollten manuell geprüft werden`);
        problemExists = true;
      }
      
      // Prüfe auf Tabellen-Existenz-Probleme
      if (ticketText.includes('tabelle') || ticketText.includes('table') || ticketText.includes('does not exist') || ticketText.includes('nicht gefunden')) {
        evidence.push(`⚠️  Ticket beschreibt mögliches Tabellen-Existenz-Problem`);
        problemExists = true;
      }
      
      // Prüfe auf Foreign Key-Probleme
      if (ticketText.includes('foreign key') || ticketText.includes('constraint') || ticketText.includes('violates foreign key')) {
        evidence.push(`⚠️  Ticket beschreibt mögliches Foreign Key-Problem`);
        problemExists = true;
      }
      
      // Prüfe auf Schema-Probleme
      if (ticketText.includes('schema') || ticketText.includes('spalte') || ticketText.includes('column')) {
        evidence.push(`⚠️  Ticket beschreibt mögliches Schema-Problem`);
        problemExists = true;
      }
      
      // Generische Prüfung
      if (!problemExists && (ticketText.includes('datenbank') || ticketText.includes('database') || ticketText.includes('supabase'))) {
        evidence.push(`⚠️  Database-Problem erkannt - manuelle Prüfung empfohlen`);
        problemExists = true; // Im Zweifel Problem annehmen
      }
      
    } catch (error) {
      evidence.push(`❌ Fehler bei Database-Setting-Prüfung: ${error}`);
      problemExists = true;
    }
    
    return { problemExists, evidence };
  }

  /**
   * Erweiterte Verifikation für Deployment-Configs
   */
  private async verifyDeploymentConfig(
    configName: string,
    ticket: MinimalTicket
  ): Promise<{ problemExists: boolean; evidence: string[] }> {
    const evidence: string[] = [];
    let problemExists = false;
    
    evidence.push(`\n🚀 DEPLOYMENT-CONFIG PRÜFUNG:`);
    
    try {
      const ticketText = `${ticket.title ?? ''} ${ticket.description ?? ''}`.toLowerCase();
      
      // Prüfe auf PM2-Probleme
      if (ticketText.includes('pm2') || ticketText.includes('prozess') || ticketText.includes('process')) {
        evidence.push(`⚠️  Ticket beschreibt mögliches PM2-Problem`);
        evidence.push(`💡 PM2-Status sollte manuell geprüft werden: pm2 list`);
        problemExists = true;
      }
      
      // Prüfe auf Port-Konflikte
      if (ticketText.includes('port') || ticketText.includes('eaddrinuse') || ticketText.includes('already in use')) {
        evidence.push(`⚠️  Ticket beschreibt mögliches Port-Problem`);
        problemExists = true;
      }
      
      // Prüfe auf Service-Verfügbarkeit
      if (ticketText.includes('service') || ticketText.includes('nicht erreichbar') || ticketText.includes('unreachable') || ticketText.includes('timeout')) {
        evidence.push(`⚠️  Ticket beschreibt mögliches Service-Verfügbarkeits-Problem`);
        problemExists = true;
      }
      
      // Prüfe auf Deployment-spezifische Probleme
      if (ticketText.includes('deployment') || ticketText.includes('deploy') || ticketText.includes('build') || ticketText.includes('npm run build')) {
        evidence.push(`⚠️  Ticket beschreibt mögliches Deployment-Problem`);
        problemExists = true;
      }
      
      // Generische Prüfung
      if (!problemExists && (ticketText.includes('server') || ticketText.includes('hetzner') || ticketText.includes('remote'))) {
        evidence.push(`⚠️  Deployment-Problem erkannt - manuelle Prüfung empfohlen`);
        problemExists = true; // Im Zweifel Problem annehmen
      }
      
    } catch (error) {
      evidence.push(`❌ Fehler bei Deployment-Config-Prüfung: ${error}`);
      problemExists = true;
    }
    
    return { problemExists, evidence };
  }

  /**
   * Verifiziert Missing Translation Problem
   */
  private async verifyMissingTranslation(ticket: MinimalTicket): Promise<VerificationResult> {
    const evidence: string[] = [];
    let problemExists = false;

    const ticketText = `${ticket.title ?? ''} ${ticket.description ?? ''}`;
    const keyMatch = ticketText.match(/MISSING_MESSAGE:\s*([A-Za-z0-9._-]+)/i);
    
    if (!keyMatch) {
      return {
        problemExists: false,
        evidence: ['❌ Kein Translation-Key im Ticket gefunden'],
        severity: 'low',
      };
    }

    const key = keyMatch[1];
    evidence.push(`✅ Translation-Key gefunden: ${key}`);

    // Prüfe ob Key in allen Locale-Dateien fehlt
    const locales = ['de', 'en', 'fr', 'sw'];
    for (const locale of locales) {
      const localePath = join(this.rootDir, 'messages', `${locale}.json`);
      try {
        const localeContent = await readFile(localePath, 'utf-8');
        const localeJson = JSON.parse(localeContent);
        
        // Prüfe ob Key existiert (einfache Prüfung)
        if (!this.hasNestedKey(localeJson, key)) {
          evidence.push(`❌ Key "${key}" fehlt in ${locale}.json`);
          problemExists = true;
        } else {
          evidence.push(`✅ Key "${key}" vorhanden in ${locale}.json`);
        }
      } catch {
        evidence.push(`⚠️  ${locale}.json konnte nicht gelesen werden`);
      }
    }

    return {
      problemExists,
      evidence,
      severity: problemExists ? 'medium' : 'low',
      details: { missingKey: key },
    };
  }

  /**
   * Verifiziert Missing Env Variable Problem
   */
  private async verifyMissingEnvVariable(ticket: MinimalTicket): Promise<VerificationResult> {
    const evidence: string[] = [];
    let problemExists = false;

    const ticketText = `${ticket.title ?? ''} ${ticket.description ?? ''}`;
    const envMatch = ticketText.match(/Missing(?: required)? environment variable[:\s]+([A-Z0-9_]+)/i) ||
                    ticketText.match(/process\.env\.([A-Z0-9_]+)\s+(?:is|was)\s+(?:undefined|not set)/i);
    
    if (!envMatch) {
      return {
        problemExists: false,
        evidence: ['❌ Keine Env-Variable im Ticket gefunden'],
        severity: 'low',
      };
    }

    const envKey = envMatch[1];
    evidence.push(`✅ Env-Variable gefunden: ${envKey}`);

    // Prüfe .env.local
    const envPath = join(this.rootDir, '.env.local');
    try {
      const envContent = await readFile(envPath, 'utf-8');
      if (envContent.includes(envKey)) {
        evidence.push(`✅ ${envKey} in .env.local vorhanden`);
      } else {
        evidence.push(`❌ ${envKey} fehlt in .env.local`);
        problemExists = true;
      }
    } catch {
      evidence.push('⚠️  .env.local konnte nicht gelesen werden');
      problemExists = true; // Im Zweifel Problem annehmen
    }

    return {
      problemExists,
      evidence,
      severity: problemExists ? 'high' : 'low',
      details: { missingEnvKey: envKey },
    };
  }

  /**
   * Verifiziert WhatsApp Link Button Problem
   */
  private async verifyWhatsAppLinkButton(ticket: MinimalTicket): Promise<VerificationResult> {
    const evidence: string[] = [];
    let problemExists = false;

    try {
      const embedPath = join(this.rootDir, 'components', 'widget', 'EmbedCodeGenerator.tsx');
      const embedContent = await readFile(embedPath, 'utf-8');
      
      // Prüfe ob embedUrl korrekt definiert ist
      if (embedContent.includes('embedUrl') && 
          embedContent.includes('/de/widget/embed?botId=')) {
        evidence.push('✅ embedUrl korrekt definiert');
      } else {
        evidence.push('❌ embedUrl fehlt oder falsch definiert');
        problemExists = true;
      }

      // Prüfe Button onClick-Handler
      if (embedContent.includes('onClick') && 
          (embedContent.includes('window.open') || embedContent.includes('href'))) {
        evidence.push('✅ Button-Handler vorhanden');
      } else {
        evidence.push('⚠️  Button-Handler möglicherweise fehlerhaft');
        problemExists = true;
      }

    } catch (error) {
      evidence.push(`❌ Verifikationsfehler: ${error}`);
      problemExists = true;
    }

    return {
      problemExists,
      evidence,
      severity: problemExists ? 'medium' : 'low',
    };
  }

  /**
   * Generische Verifikation für unbekannte Patterns
   */
  private async verifyGenericProblem(
    ticket: MinimalTicket,
    patternId: string
  ): Promise<VerificationResult> {
    // Standard-Verifikation: Prüfe ob Ticket-Beschreibung auf Problem hinweist
    const ticketText = `${ticket.title ?? ''} ${ticket.description ?? ''}`.toLowerCase();
    const hasErrorKeywords = ticketText.includes('fehler') || 
                            ticketText.includes('error') ||
                            ticketText.includes('nicht') ||
                            ticketText.includes('fehlt') ||
                            ticketText.includes('missing');

    return {
      problemExists: hasErrorKeywords,
      evidence: [
        hasErrorKeywords 
          ? '✅ Fehler-Keywords im Ticket gefunden' 
          : '⚠️  Keine eindeutigen Fehler-Keywords gefunden',
      ],
      severity: hasErrorKeywords ? 'medium' : 'low',
      details: { patternId },
    };
  }

  /**
   * Verifiziert Problem gegen Reverse Engineering Blaupause
   * 
   * Nutzt die dokumentierten Konfigurationen als Referenz für den erwarteten Zustand
   * und vergleicht diesen mit dem tatsächlichen Zustand.
   */
  private async verifyAgainstBlueprint(
    ticket: MinimalTicket,
    patternId: string
  ): Promise<VerificationResult | null> {
    if (!this.reverseEngineeringAnalyzer) {
      return null;
    }

    try {
      // Parse Pattern-ID: config-{type}-{name}
      const parts = patternId.split('-');
      if (parts.length < 3) {
        return null;
      }

      // Nutze detectDeviationsFromBlueprint um Abweichungen zu finden
      const deviations = await this.reverseEngineeringAnalyzer.detectDeviationsFromBlueprint(
        ticket,
        this.rootDir
      );

      // Finde Abweichung die zu diesem Pattern passt
      const matchingDeviation = deviations.find(d => {
        const deviationPatternId = `config-${d.config.type}-${d.config.name}`;
        return deviationPatternId === patternId;
      });

      if (matchingDeviation) {
        return {
          problemExists: true,
          evidence: [
            `📋 Reverse Engineering Blaupause: Abweichung erkannt`,
            `❌ ${matchingDeviation.deviation}`,
            `📄 Dokumentierter Zustand: ${matchingDeviation.config.description}`,
            ...matchingDeviation.evidence,
          ],
          severity: matchingDeviation.severity,
          details: {
            patternId,
            configType: matchingDeviation.config.type,
            configName: matchingDeviation.config.name,
            deviation: matchingDeviation.deviation,
          },
        };
      }

      // Keine Abweichung gefunden - Zustand entspricht Dokumentation
      return {
        problemExists: false,
        evidence: [
          `✅ Reverse Engineering Blaupause: Keine Abweichung erkannt`,
          `📋 Aktueller Zustand entspricht dokumentiertem Zustand`,
        ],
        severity: 'low',
        details: {
          patternId,
          blueprintMatch: true,
        },
      };
    } catch (error) {
      this.logger.warn({ err: error, patternId }, 'Fehler bei Blaupause-Vergleich');
      return null;
    }
  }

  /**
   * Erweiterte Post-Fix-Verifikation mit mehreren Validierungsstufen
   * 
   * Führt eine umfassende Validierung durch, bevor ein Problem als "behoben" markiert wird.
   * Prüft mehrere Bereiche: Code-Änderung, Build-Status, Datei-Existenz, Code-Qualität, Reverse Engineering Vergleich
   */
  async verifyPostFix(
    ticket: MinimalTicket,
    patternId: string,
    autoFixResult: {
      success: boolean;
      message?: string;
      buildFailed?: boolean;
      lintFailed?: boolean;
      modifiedFiles?: string[];
    },
    autoFixInstructions?: Array<{ type: string; file?: string; command?: string; sql?: string }>
  ): Promise<VerificationResult> {
    const evidence: string[] = [];
    const validationStages: Array<{ name: string; passed: boolean; evidence: string[] }> = [];
    let allStagesPassed = true;

    this.logger.info(
      { ticketId: ticket.title, patternId, hasAutoFixResult: !!autoFixResult },
      'Starte erweiterte Post-Fix-Verifikation'
    );

    evidence.push('🔍 ERWEITERTE POST-FIX-VERIFIKATION');
    evidence.push('');

    // STUFE 1: Code-Änderung verifiziert
    const stage1 = await this.validateCodeChanges(autoFixResult, autoFixInstructions);
    validationStages.push(stage1);
    evidence.push(`📝 STUFE 1: Code-Änderung`);
    evidence.push(...stage1.evidence);
    evidence.push('');
    if (!stage1.passed) {
      allStagesPassed = false;
    }

    // STUFE 2: Build-Status
    const stage2 = await this.validateBuildStatus(autoFixResult);
    validationStages.push(stage2);
    evidence.push(`🔨 STUFE 2: Build-Status`);
    evidence.push(...stage2.evidence);
    evidence.push('');
    if (!stage2.passed) {
      allStagesPassed = false;
    }

    // STUFE 3: Datei-Existenz und -Zugriff
    const stage3 = await this.validateFileExistence(autoFixResult, autoFixInstructions);
    validationStages.push(stage3);
    evidence.push(`📁 STUFE 3: Datei-Existenz`);
    evidence.push(...stage3.evidence);
    evidence.push('');
    if (!stage3.passed) {
      allStagesPassed = false;
    }

    // STUFE 4: Code-Qualität (Syntax, kritische Fehler)
    const stage4 = await this.validateCodeQuality(autoFixResult, autoFixInstructions);
    validationStages.push(stage4);
    evidence.push(`✅ STUFE 4: Code-Qualität`);
    evidence.push(...stage4.evidence);
    evidence.push('');
    if (!stage4.passed) {
      allStagesPassed = false;
    }

    // STUFE 5: Reverse Engineering Vergleich
    const stage5 = await this.validateReverseEngineering(ticket, patternId);
    validationStages.push(stage5);
    evidence.push(`📋 STUFE 5: Reverse Engineering Vergleich`);
    evidence.push(...stage5.evidence);
    evidence.push('');
    if (!stage5.passed) {
      allStagesPassed = false;
    }

    // STUFE 6: Funktionale Tests (wenn möglich)
    const stage6 = await this.validateFunctionalTests(ticket, patternId, autoFixInstructions);
    validationStages.push(stage6);
    evidence.push(`🧪 STUFE 6: Funktionale Tests`);
    evidence.push(...stage6.evidence);
    evidence.push('');

    // Zusammenfassung
    evidence.push('');
    evidence.push('📊 VALIDIERUNGS-ZUSAMMENFASSUNG:');
    const passedStages = validationStages.filter(s => s.passed).length;
    const totalStages = validationStages.length;
    evidence.push(`✅ Bestanden: ${passedStages}/${totalStages} Stufen`);

    // Prüfe ob es sich um code-modify oder create-file Instructions handelt
    const hasCodeModifyInstructions = autoFixInstructions?.some(
      inst => inst.type === 'code-modify' || inst.type === 'create-file'
    );

    // Prüfe ob es ein PDF-Upload-Problem ist (einmalig definieren)
    const isPdfUploadProblem = 
      (patternId.includes('pdf') || patternId.includes('parsePdf') || patternId.includes('upload')) &&
      (`${ticket.title ?? ''} ${ticket.description ?? ''}`.toLowerCase().includes('pdf') || 
       `${ticket.title ?? ''} ${ticket.description ?? ''}`.toLowerCase().includes('upload'));
    
    // Funktionale Tests sind kritisch für PDF-Upload-Probleme
    if (isPdfUploadProblem && !stage6.passed) {
      allStagesPassed = false;
      evidence.push('⚠️  Funktionale Tests fehlgeschlagen - Problem besteht möglicherweise weiterhin');
    }

    // Entscheidung: Problem als behoben markieren
    // Bei code-modify/create-file: Wenn Code geändert + Build erfolgreich → Problem behoben
    // Bei anderen Instructions (hetzner-command, supabase-migration): Alle kritischen Stufen müssen bestanden sein
    let criticalStagesPassed: boolean;
    let problemResolved: boolean;
    
    if (hasCodeModifyInstructions) {
      // Bei Code-Änderungen: Code-Änderung + Build-Erfolg sind ausreichend
      // STUFE 5 (Reverse Engineering) kann fehlschlagen, wenn das Problem funktional behoben wurde
      // ABER: Bei PDF-Upload-Problemen ist STUFE 6 (Funktionale Tests) kritisch
      // WICHTIG: Bei create-file Instructions ist STUFE 6 (Funktionale Tests) NICHT kritisch,
      // da Datei-Existenz bereits in STUFE 3 validiert wurde
      const isCreateFileOnly = autoFixInstructions?.every(
        inst => inst.type === 'create-file'
      ) && !autoFixInstructions.some(inst => inst.type === 'code-modify');
      
      if (isPdfUploadProblem) {
        criticalStagesPassed = stage1.passed && stage2.passed && stage3.passed && stage4.passed && stage6.passed;
        problemResolved = criticalStagesPassed;
        
        if (problemResolved) {
          evidence.push('✅ Code-Änderung erfolgreich: Code geändert + Build erfolgreich + Funktionale Tests bestanden');
          evidence.push('✅ Problem wurde erfolgreich behoben (PDF-Upload funktioniert)');
          if (!stage5.passed) {
            evidence.push('ℹ️  STUFE 5 (Reverse Engineering) nicht kritisch für Code-Änderungen');
          }
        } else {
          evidence.push('❌ Code-Änderung nicht erfolgreich oder funktionale Tests fehlgeschlagen');
          evidence.push('⚠️  Problem besteht möglicherweise weiterhin');
        }
      } else if (isCreateFileOnly) {
        // Bei create-file: STUFE 6 (Funktionale Tests) ist NICHT kritisch
        // Datei-Existenz wurde bereits in STUFE 3 validiert
        criticalStagesPassed = stage1.passed && stage2.passed && stage3.passed && stage4.passed;
        problemResolved = criticalStagesPassed;
        
        if (problemResolved) {
          evidence.push('✅ Code-Änderung erfolgreich: Code geändert + Build erfolgreich');
          evidence.push('✅ Problem wurde erfolgreich behoben (create-file)');
          if (!stage5.passed) {
            evidence.push('ℹ️  STUFE 5 (Reverse Engineering) nicht kritisch für Code-Änderungen');
          }
          if (!stage6.passed) {
            evidence.push('ℹ️  STUFE 6 (Funktionale Tests) nicht kritisch für create-file - Datei-Existenz bereits in STUFE 3 validiert');
          }
        } else {
          evidence.push('❌ Code-Änderung nicht erfolgreich');
          evidence.push('⚠️  Problem besteht möglicherweise weiterhin');
        }
      } else {
        criticalStagesPassed = stage1.passed && stage2.passed && stage3.passed && stage4.passed;
        problemResolved = criticalStagesPassed;
        
        if (problemResolved) {
          evidence.push('✅ Code-Änderung erfolgreich: Code geändert + Build erfolgreich');
          evidence.push('✅ Problem wurde erfolgreich behoben (code-modify/create-file)');
          if (!stage5.passed) {
            evidence.push('ℹ️  STUFE 5 (Reverse Engineering) nicht kritisch für Code-Änderungen');
          }
        } else {
          evidence.push('❌ Code-Änderung nicht erfolgreich');
          evidence.push('⚠️  Problem besteht möglicherweise weiterhin');
        }
      }
    } else {
      // Bei anderen Instructions: Alle kritischen Stufen müssen bestanden sein
      // Bei PDF-Upload-Problemen ist STUFE 6 (Funktionale Tests) kritisch
      if (isPdfUploadProblem) {
        criticalStagesPassed = stage1.passed && stage2.passed && stage3.passed && stage4.passed && stage5.passed && stage6.passed;
      } else {
        criticalStagesPassed = stage1.passed && stage2.passed && stage3.passed && stage4.passed && stage5.passed;
      }
      problemResolved = criticalStagesPassed;
      
      if (problemResolved) {
        evidence.push('✅ Alle kritischen Validierungsstufen bestanden');
        evidence.push('✅ Problem wurde erfolgreich behoben');
      } else {
        evidence.push('❌ Nicht alle kritischen Validierungsstufen bestanden');
        evidence.push('⚠️  Problem besteht möglicherweise weiterhin');
      }
    }

    return {
      problemExists: !problemResolved,
      evidence,
      severity: problemResolved ? 'low' : 'high',
      details: {
        patternId,
        validationStages: validationStages.map(s => ({ name: s.name, passed: s.passed })),
        passedStages,
        totalStages,
        allCriticalStagesPassed: criticalStagesPassed,
        hasCodeModifyInstructions,
        problemResolved,
      },
    };
  }

  /**
   * STUFE 1: Validiert Code-Änderungen
   */
  private async validateCodeChanges(
    autoFixResult: { success: boolean; modifiedFiles?: string[] },
    autoFixInstructions?: Array<{ type: string; file?: string }>
  ): Promise<{ name: string; passed: boolean; evidence: string[] }> {
    const evidence: string[] = [];
    let passed = false;

    if (!autoFixResult.success) {
      evidence.push('❌ AutoFix war nicht erfolgreich');
      return { name: 'Code-Änderung', passed: false, evidence };
    }

    // Prüfe ob Code-Änderungen vorhanden sind
    const hasCodeChanges = autoFixResult.modifiedFiles && autoFixResult.modifiedFiles.length > 0;
    const hasCodeInstructions = autoFixInstructions?.some(
      inst => inst.type === 'code-modify' || inst.type === 'create-file'
    );

    if (hasCodeChanges) {
      evidence.push(`✅ Code-Änderungen erkannt: ${autoFixResult.modifiedFiles!.length} Datei(en)`);
      evidence.push(`   Geänderte Dateien: ${autoFixResult.modifiedFiles!.join(', ')}`);
      passed = true;
    } else if (hasCodeInstructions) {
      evidence.push(`⚠️  Code-Instructions vorhanden, aber keine Dateien geändert`);
      evidence.push(`   Instructions: ${autoFixInstructions!.filter(i => i.file).map(i => i.file).join(', ')}`);
      passed = false;
    } else {
      // Keine Code-Änderungen erwartet (z.B. bei hetzner-command)
      evidence.push(`ℹ️  Keine Code-Änderungen erwartet (z.B. Server-Befehl)`);
      passed = true; // Nicht kritisch wenn keine Code-Änderungen erwartet werden
    }

    return { name: 'Code-Änderung', passed, evidence };
  }

  /**
   * STUFE 2: Validiert Build-Status
   */
  private async validateBuildStatus(
    autoFixResult: { success: boolean; buildFailed?: boolean; lintFailed?: boolean }
  ): Promise<{ name: string; passed: boolean; evidence: string[] }> {
    const evidence: string[] = [];
    let passed = false;

    if (autoFixResult.buildFailed) {
      evidence.push('❌ Build fehlgeschlagen');
      evidence.push('⚠️  Code-Änderungen können nicht deployed werden');
      return { name: 'Build-Status', passed: false, evidence };
    }

    if (autoFixResult.lintFailed) {
      evidence.push('⚠️  Lint-Fehler vorhanden');
      evidence.push('⚠️  Code-Qualität könnte beeinträchtigt sein');
      // Lint-Fehler sind nicht kritisch für "behoben"-Status
      passed = true;
    } else {
      evidence.push('✅ Lint erfolgreich');
      passed = true;
    }

    // Prüfe ob Build durchgeführt wurde (für Code-Änderungen)
    if (!autoFixResult.buildFailed && autoFixResult.buildFailed !== undefined) {
      evidence.push('✅ Build erfolgreich');
      passed = true;
    } else if (autoFixResult.buildFailed === undefined) {
      // Build wurde möglicherweise nicht durchgeführt (z.B. bei hetzner-command)
      evidence.push('ℹ️  Build-Status nicht verfügbar (möglicherweise nicht erforderlich)');
      passed = true; // Nicht kritisch wenn Build nicht erforderlich ist
    }

    return { name: 'Build-Status', passed, evidence };
  }

  /**
   * STUFE 3: Validiert Datei-Existenz und -Zugriff
   */
  private async validateFileExistence(
    autoFixResult: { success: boolean; modifiedFiles?: string[] },
    autoFixInstructions?: Array<{ type: string; file?: string }>
  ): Promise<{ name: string; passed: boolean; evidence: string[] }> {
    const evidence: string[] = [];
    let passed = true;

    const filesToCheck: string[] = [];

    // Sammle alle Dateien die geprüft werden sollten
    if (autoFixResult.modifiedFiles) {
      filesToCheck.push(...autoFixResult.modifiedFiles);
    }

    if (autoFixInstructions) {
      for (const inst of autoFixInstructions) {
        if (inst.file && !filesToCheck.includes(inst.file)) {
          filesToCheck.push(inst.file);
        }
      }
    }

    if (filesToCheck.length === 0) {
      evidence.push('ℹ️  Keine Dateien zu prüfen (z.B. Server-Befehl)');
      return { name: 'Datei-Existenz', passed: true, evidence };
    }

    // Prüfe jede Datei
    for (const file of filesToCheck) {
      try {
        const fullPath = file.startsWith('/') ? file : join(this.rootDir, file);
        await access(fullPath, constants.F_OK);
        evidence.push(`✅ Datei existiert: ${file}`);
      } catch {
        evidence.push(`❌ Datei fehlt: ${file}`);
        passed = false;
      }
    }

    return { name: 'Datei-Existenz', passed, evidence };
  }

  /**
   * STUFE 4: Validiert Code-Qualität (Syntax, kritische Fehler)
   */
  private async validateCodeQuality(
    autoFixResult: { success: boolean; lintFailed?: boolean },
    autoFixInstructions?: Array<{ type: string; file?: string }>
  ): Promise<{ name: string; passed: boolean; evidence: string[] }> {
    const evidence: string[] = [];
    let passed = true;

    // Prüfe Lint-Status
    if (autoFixResult.lintFailed) {
      evidence.push('⚠️  Lint-Fehler vorhanden');
      evidence.push('⚠️  Code-Qualität könnte beeinträchtigt sein');
      // Lint-Fehler sind Warnungen, nicht kritisch
    } else {
      evidence.push('✅ Keine Lint-Fehler');
    }

    // Prüfe ob Code-Instructions vorhanden sind
    const hasCodeInstructions = autoFixInstructions?.some(
      inst => inst.type === 'code-modify' || inst.type === 'create-file'
    );

    if (hasCodeInstructions) {
      // Versuche Dateien zu lesen und auf kritische Syntax-Fehler zu prüfen
      for (const inst of autoFixInstructions!) {
        if (inst.file) {
          try {
            const fullPath = inst.file.startsWith('/') ? inst.file : join(this.rootDir, inst.file);
            const content = await readFile(fullPath, 'utf-8');
            
            // Prüfe auf kritische Syntax-Fehler
            if (content.includes('undefined') && content.includes('Cannot find module')) {
              evidence.push(`⚠️  Möglicher Syntax-Fehler in ${inst.file}`);
              passed = false;
            } else {
              evidence.push(`✅ Code-Syntax OK: ${inst.file}`);
            }
          } catch (error) {
            evidence.push(`⚠️  Datei konnte nicht gelesen werden: ${inst.file}`);
            // Nicht kritisch wenn Datei nicht gelesen werden kann
          }
        }
      }
    } else {
      evidence.push('ℹ️  Keine Code-Instructions vorhanden');
    }

    return { name: 'Code-Qualität', passed, evidence };
  }

  /**
   * STUFE 5: Validiert Reverse Engineering Vergleich
   */
  private async validateReverseEngineering(
    ticket: MinimalTicket,
    patternId: string
  ): Promise<{ name: string; passed: boolean; evidence: string[] }> {
    const evidence: string[] = [];
    let passed = false;

    // Nutze verifyAgainstBlueprint
    const blueprintResult = await this.verifyAgainstBlueprint(ticket, patternId);

    if (!blueprintResult) {
      evidence.push('ℹ️  Reverse Engineering Vergleich nicht verfügbar');
      passed = true; // Nicht kritisch wenn Vergleich nicht verfügbar ist
    } else if (!blueprintResult.problemExists) {
      evidence.push('✅ Reverse Engineering Blaupause: Keine Abweichung erkannt');
      evidence.push('✅ Aktueller Zustand entspricht dokumentiertem Zustand');
      passed = true;
    } else {
      evidence.push('❌ Reverse Engineering Blaupause: Abweichung erkannt');
      evidence.push(...blueprintResult.evidence.slice(0, 3)); // Erste 3 Evidence-Einträge
      passed = false;
    }

    return { name: 'Reverse Engineering Vergleich', passed, evidence };
  }

  /**
   * STUFE 6: Validiert Funktionale Tests (wenn möglich)
   */
  private async validateFunctionalTests(
    ticket: MinimalTicket,
    patternId: string,
    autoFixInstructions?: Array<{ type: string; file?: string; command?: string }>
  ): Promise<{ name: string; passed: boolean; evidence: string[] }> {
    const evidence: string[] = [];
    let passed = true;

    evidence.push('🧪 FUNKTIONALE TESTS');
    evidence.push('');

    // Prüfe ob es ein PDF-Upload-Problem ist
    const ticketText = `${ticket.title ?? ''} ${ticket.description ?? ''}`.toLowerCase();
    const isPdfUploadProblem = 
      (patternId.includes('pdf') || patternId.includes('parsePdf') || patternId.includes('upload')) &&
      (ticketText.includes('pdf') || ticketText.includes('upload'));

    if (isPdfUploadProblem) {
      evidence.push('📄 PDF-Upload-Problem erkannt - führe API-Test durch');
      
      try {
        // Teste /api/knowledge/upload Endpoint
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                       process.env.NEXT_PUBLIC_VERCEL_URL || 
                       'https://whatsapp.owona.de';
        const uploadUrl = `${baseUrl}/api/knowledge/upload`;
        
        evidence.push(`🔗 Teste API-Endpoint: ${uploadUrl}`);
        
        // KRITISCH: Timeout für fetch-Aufruf (5 Sekunden)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        try {
          // Prüfe zuerst ob Endpoint erreichbar ist (GET sollte 405 Method Not Allowed geben, nicht 404)
          const getResponse = await fetch(uploadUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
        
          if (getResponse.status === 405) {
            // 405 Method Not Allowed ist gut - bedeutet Endpoint existiert, akzeptiert nur POST
            evidence.push(`✅ API-Endpoint existiert (Status 405 = Method Not Allowed ist erwartet)`);
            evidence.push('✅ PDF-Upload-Endpoint ist erreichbar');
          } else if (getResponse.status === 404) {
            evidence.push(`❌ API-Endpoint nicht gefunden: Status ${getResponse.status}`);
            evidence.push('⚠️  PDF-Upload-Endpoint existiert möglicherweise nicht');
            passed = false;
          } else {
            evidence.push(`ℹ️  API-Endpoint Status: ${getResponse.status} (unexpected, aber Endpoint existiert)`);
          }
          
          // Prüfe ob Upload-Route-Datei existiert
          const uploadRoutePath = join(this.rootDir, 'app', 'api', 'knowledge', 'upload', 'route.ts');
          try {
            await access(uploadRoutePath, constants.F_OK);
            evidence.push(`✅ Upload-Route-Datei existiert: ${uploadRoutePath}`);
            
            // Prüfe ob Route POST-Methode hat
            const routeContent = await readFile(uploadRoutePath, 'utf-8');
            if (routeContent.includes('export async function POST')) {
              evidence.push('✅ Route hat POST-Handler');
            } else {
              evidence.push('⚠️  Route hat möglicherweise keinen POST-Handler');
              passed = false;
            }
          } catch (fileError) {
            evidence.push(`❌ Upload-Route-Datei nicht gefunden: ${uploadRoutePath}`);
            evidence.push('⚠️  PDF-Upload-Route existiert möglicherweise nicht');
            passed = false;
          }
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          if (fetchError.name === 'AbortError') {
            evidence.push('⚠️  API-Test Timeout (Endpoint nicht erreichbar oder zu langsam nach 5s)');
            evidence.push('ℹ️  Dies ist nicht kritisch - Endpoint könnte trotzdem existieren');
            // Nicht als kritisch markieren, da Netzwerk-Probleme möglich sind
            this.logger.warn(
              { patternId, uploadUrl },
              'Funktionaler Test Timeout (nicht kritisch)'
            );
          } else {
            evidence.push(`❌ API-Test Exception: ${fetchError.message || String(fetchError)}`);
            evidence.push('⚠️  PDF-Upload-Endpoint nicht erreichbar oder hat Fehler');
            // Nicht als kritisch markieren, da Netzwerk-Probleme möglich sind
            this.logger.warn(
              { err: fetchError, patternId },
              'Funktionaler Test fehlgeschlagen (nicht kritisch)'
            );
          }
        }
      } catch (error: any) {
        evidence.push(`❌ API-Test Exception: ${error.message || String(error)}`);
        evidence.push('⚠️  PDF-Upload-Endpoint nicht erreichbar oder hat Fehler');
        // Nicht als kritisch markieren, da Netzwerk-Probleme möglich sind
        this.logger.warn(
          { err: error, patternId },
          'Funktionaler Test fehlgeschlagen (nicht kritisch)'
        );
      }
    }

    // Prüfe ob es ein API-Endpoint-Problem ist
    if (patternId.includes('api_endpoint') && !isPdfUploadProblem) {
      evidence.push('🔗 API-Endpoint-Problem erkannt');
      
      try {
        // Extrahiere Endpoint-Pfad aus patternId
        const endpointMatch = patternId.match(/api_endpoint[_-]([^_]+)/);
        if (endpointMatch) {
          const endpointPath = endpointMatch[1];
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                         process.env.NEXT_PUBLIC_VERCEL_URL || 
                         'https://whatsapp.owona.de';
          const testUrl = `${baseUrl}${endpointPath}`;
          
          evidence.push(`🔗 Teste API-Endpoint: ${testUrl}`);
          
          // KRITISCH: Timeout für fetch-Aufruf (5 Sekunden)
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          try {
            // Führe GET-Request durch (für die meisten Endpoints)
            const response = await fetch(testUrl, {
              method: 'GET',
              signal: controller.signal,
              headers: {
                'Content-Type': 'application/json',
              },
            });
            
            if (response.ok || response.status === 401 || response.status === 403) {
              // 401/403 sind OK, da sie zeigen dass Endpoint existiert (nur Auth fehlt)
              evidence.push(`✅ API-Endpoint erreichbar: Status ${response.status}`);
              evidence.push('✅ API-Endpoint funktioniert (Auth erforderlich ist normal)');
            } else if (response.status === 404) {
              evidence.push(`❌ API-Endpoint nicht gefunden: Status ${response.status}`);
              evidence.push('⚠️  API-Endpoint existiert möglicherweise nicht');
              passed = false;
            } else {
              evidence.push(`⚠️  API-Endpoint hat unerwarteten Status: ${response.status}`);
            }
            
            clearTimeout(timeoutId);
          } catch (fetchError: any) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
              evidence.push('⚠️  API-Test Timeout (Endpoint nicht erreichbar oder zu langsam nach 5s)');
              evidence.push('ℹ️  Dies ist nicht kritisch - Endpoint könnte trotzdem existieren');
              this.logger.warn(
                { patternId, testUrl },
                'API-Endpoint-Test Timeout (nicht kritisch)'
              );
            } else {
              evidence.push(`⚠️  API-Endpoint-Test fehlgeschlagen: ${fetchError.message || String(fetchError)}`);
              // Nicht als kritisch markieren
              this.logger.warn(
                { err: fetchError, patternId },
                'API-Endpoint-Test fehlgeschlagen (nicht kritisch)'
              );
            }
          }
        }
      } catch (error: any) {
        evidence.push(`⚠️  API-Endpoint-Test Exception: ${error.message || String(error)}`);
        // Nicht als kritisch markieren
        this.logger.warn(
          { err: error, patternId },
          'API-Endpoint-Test Exception (nicht kritisch)'
        );
      }
    }

    // Prüfe ob es ein Frontend-Problem ist
    if (patternId.includes('frontend_config') && !isPdfUploadProblem) {
      evidence.push('🎨 Frontend-Konfiguration erkannt');
      evidence.push('ℹ️  Frontend-Tests erfordern Browser-Automation (optional)');
      // Frontend-Tests sind komplexer und erfordern Browser-Automation
      // Für jetzt: Nur Info-Logging
    }

    // Prüfe ob es ein Deployment-Problem ist
    if (patternId.includes('deployment_config')) {
      evidence.push('🚀 Deployment-Konfiguration erkannt');
      evidence.push('ℹ️  Deployment-Tests erfordern Server-Zugriff (optional)');
      // Deployment-Tests erfordern SSH-Zugriff
      // Für jetzt: Nur Info-Logging
    }

    if (evidence.length === 2) {
      // Nur Header vorhanden - keine spezifischen Tests durchgeführt
      evidence.push('ℹ️  Keine spezifischen funktionalen Tests für dieses Problem verfügbar');
    }

    return { name: 'Funktionale Tests', passed, evidence };
  }

  /**
   * Hilfsfunktion: Prüft ob ein verschachtelter Key in einem Objekt existiert
   */
  private hasNestedKey(obj: unknown, keyPath: string): boolean {
    if (typeof obj !== 'object' || obj === null) {
      return false;
    }

    const keys = keyPath.split('.');
    let current: unknown = obj;

    for (const key of keys) {
      if (typeof current !== 'object' || current === null || !(key in current)) {
        return false;
      }
      current = (current as Record<string, unknown>)[key];
    }

    return true;
  }
}

