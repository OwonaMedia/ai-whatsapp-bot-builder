import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import { SupportConfig } from './config.js';
import type { Logger } from '../utils/logger.js';
import type { SupportSupabaseClient } from './supabaseClient.js';

export interface KnowledgeDocument {
  id: string;
  title: string;
  path: string;
  content: string;
}

export class KnowledgeBase {
  private documents: KnowledgeDocument[] = [];

  constructor(
    private readonly config: SupportConfig,
    private readonly logger: Logger,
    private readonly supabase?: SupportSupabaseClient,
  ) {}

  async load() {
    const loadStartTime = Date.now();
    this.logger.info('Knowledge Base Loading gestartet');
    
    // 1. Lade aus Dateien (wie bisher)
    const fileLoadStartTime = Date.now();
    const files = await fg(['**/*.md'], {
      cwd: this.config.knowledgeRoot,
      absolute: true,
      suppressErrors: true,
    });

    const uxFiles = await fg(['**/*.md'], {
      cwd: this.config.uxGuideRoot,
      absolute: true,
      suppressErrors: true,
    });

    const allFiles = [...new Set([...files, ...uxFiles])];

    const fileDocuments = allFiles
      .map((filePath) => {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const title = extractTitle(content) ?? path.basename(filePath);
          return {
            id: path.relative(process.cwd(), filePath),
            title,
            path: filePath,
            content,
          } satisfies KnowledgeDocument;
        } catch (error) {
          this.logger.warn({ err: error, filePath }, 'Knowledge-Dokument konnte nicht gelesen werden');
          return null;
        }
      })
      .filter(Boolean) as KnowledgeDocument[];
    
    const fileLoadDuration = Date.now() - fileLoadStartTime;
    this.logger.info(
      { 
        fileCount: fileDocuments.length, 
        duration: fileLoadDuration,
        knowledgeRoot: this.config.knowledgeRoot,
        uxGuideRoot: this.config.uxGuideRoot,
      },
      'Dateien aus Knowledge Base geladen'
    );

    // 2. Lade aus Supabase (Reverse Engineering Dokumentation)
    let supabaseDocuments: KnowledgeDocument[] = [];
    if (this.supabase) {
      const supabaseLoadStartTime = Date.now();
      try {
        // Versuche verschiedene mögliche Tabellennamen
        const possibleTables = [
          'support_reverse_engineering', // NEU: Primäre Tabelle
          'support_knowledge',
          'reverse_engineering_docs',
          'knowledge_documents',
        ];

        for (const tableName of possibleTables) {
          const { data, error } = await this.supabase
            .from(tableName)
            .select('*')
            .limit(100);

          if (!error && data && data.length > 0) {
            const supabaseLoadDuration = Date.now() - supabaseLoadStartTime;
            this.logger.info(
              { 
                table: tableName, 
                count: data.length,
                duration: supabaseLoadDuration,
              },
              'Reverse Engineering Dokumente aus Supabase geladen'
            );
            
            supabaseDocuments = data
              .map((row: any) => {
                // Für support_reverse_engineering: Standard-Spalten
                const content = row.content || row.text || row.document || '';
                const title = row.title || row.name || extractTitle(content) || 'Untitled';
                return {
                  id: `supabase:${tableName}:${row.id}`,
                  title,
                  path: `supabase:${tableName}:${row.id}`,
                  content,
                } satisfies KnowledgeDocument;
              })
              .filter((doc: KnowledgeDocument) => doc.content.length > 0);
            
            break; // Erste gefundene Tabelle verwenden
          }
        }

        if (supabaseDocuments.length === 0) {
          const supabaseLoadDuration = Date.now() - supabaseLoadStartTime;
          this.logger.warn(
            { duration: supabaseLoadDuration },
            'Keine Reverse Engineering Dokumente in Supabase gefunden'
          );
        }
      } catch (error) {
        this.logger.warn({ err: error }, 'Fehler beim Laden von Reverse Engineering Dokumenten aus Supabase');
      }
    }

    this.documents = [...fileDocuments, ...supabaseDocuments];
    const totalLoadDuration = Date.now() - loadStartTime;
    this.logger.info(
      { 
        count: this.documents.length,
        fromFiles: fileDocuments.length,
        fromSupabase: supabaseDocuments.length,
        totalDuration: totalLoadDuration,
      },
      'Knowledge Base geladen'
    );
  }

  query(query: string, limit = 5): KnowledgeDocument[] {
    const normalized = query.toLowerCase();

    return this.documents
      .map((doc) => ({
        doc,
        score: scoreDocument(doc, normalized),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ doc }) => doc);
  }
}

function extractTitle(content: string): string | null {
  const match = content.match(/^#\s*(.+)$/m);
  return match ? match[1].trim() : null;
}

function scoreDocument(doc: KnowledgeDocument, query: string): number {
  const haystack = (doc.title + ' ' + doc.content.slice(0, 4000)).toLowerCase();
  let score = 0;

  for (const token of query.split(/\s+/)) {
    if (!token) continue;
    if (haystack.includes(token)) {
      score += token.length;
    }
  }

  return score;
}

