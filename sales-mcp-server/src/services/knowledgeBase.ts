import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import { SupportConfig } from './config.js';
import type { Logger } from '../utils/logger.js';

export interface KnowledgeDocument {
  id: string;
  title: string;
  path: string;
  content: string;
}

export class KnowledgeBase {
  private documents: KnowledgeDocument[] = [];

  constructor(private readonly config: SupportConfig, private readonly logger: Logger) {}

  async load() {
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

    this.documents = allFiles
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

    this.logger.info({ count: this.documents.length }, 'Knowledge Base geladen');
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

