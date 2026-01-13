import type { Logger } from '../../utils/logger.js';
import type { KnowledgeDocument } from '../knowledgeBase.js';
import type { SupportSupabaseClient } from '../supabaseClient.js';

type SupabaseDiagnosticsPayload = {
  orphan_profiles?: Array<Record<string, unknown>>;
  inactive_subscriptions?: Array<Record<string, unknown>>;
  recent_audit_errors?: Array<Record<string, unknown>>;
  recent_workflow_errors?: Array<Record<string, unknown>>;
  generated_at?: string;
};

export type SupabaseDiagnosticResult = {
  summary: string;
  details: SupabaseDiagnosticsPayload;
  knowledgeDoc: KnowledgeDocument;
};

const MAX_PREVIEW_ITEMS = 3;

export class SupabaseDiagnostics {
  constructor(
    private readonly supabase: SupportSupabaseClient,
    private readonly logger: Logger,
  ) {}

  async run(ticketId: string): Promise<SupabaseDiagnosticResult | null> {
    const { data, error } = await this.supabase.rpc('support_supabase_diagnostics');

    if (error) {
      this.logger.warn({ err: error, ticketId }, 'Supabase-Diagnose konnte nicht ausgeführt werden');
      return null;
    }

    const payload = (data ?? {}) as SupabaseDiagnosticsPayload;
    const summary = this.buildSummary(payload);
    const knowledgeDoc = this.buildKnowledgeDoc(ticketId, payload);

    return {
      summary,
      details: payload,
      knowledgeDoc,
    };
  }

  private buildSummary(payload: SupabaseDiagnosticsPayload): string {
    const orphanCount = Array.isArray(payload.orphan_profiles) ? payload.orphan_profiles.length : 0;
    const inactiveSubs = Array.isArray(payload.inactive_subscriptions) ? payload.inactive_subscriptions.length : 0;
    const auditErrors = Array.isArray(payload.recent_audit_errors) ? payload.recent_audit_errors.length : 0;
    const workflowErrors = Array.isArray(payload.recent_workflow_errors) ? payload.recent_workflow_errors.length : 0;

    const lines = [
      'Supabase-Diagnose abgeschlossen:',
      `- Verwaiste Profile: ${orphanCount}`,
      `- Problematische Subscriptions: ${inactiveSubs}`,
      `- Audit-Log Fehler (24h): ${auditErrors}`,
      `- Workflow-Fehler (24h): ${workflowErrors}`,
    ];

    return lines.join('\n');
  }

  private buildKnowledgeDoc(ticketId: string, payload: SupabaseDiagnosticsPayload): KnowledgeDocument {
    const generatedAt = payload.generated_at ?? new Date().toISOString();

    const sections: string[] = [
      `# Supabase Diagnose Snapshot (${generatedAt})`,
      '',
      '## Zusammenfassung',
      this.buildSummary(payload),
      '',
    ];

    sections.push(this.renderSection('Verwaiste Profile', payload.orphan_profiles));
    sections.push(this.renderSection('Subscriptions mit Problemstatus', payload.inactive_subscriptions));
    sections.push(this.renderSection('Audit-Log Fehler', payload.recent_audit_errors));
    sections.push(this.renderSection('Workflow-Fehler', payload.recent_workflow_errors));

    return {
      id: `virtual://diagnostics/supabase/${ticketId}`,
      title: `Supabase Diagnose ${generatedAt}`,
      path: `virtual://diagnostics/supabase/${ticketId}`,
      content: sections.join('\n').trim(),
    };
  }

  private renderSection(title: string, items: Array<Record<string, unknown>> | undefined): string {
    if (!Array.isArray(items) || items.length === 0) {
      return `### ${title}\nKeine Auffälligkeiten.\n`;
    }

    const lines: string[] = [`### ${title}`];
    const preview = items.slice(0, MAX_PREVIEW_ITEMS);

    for (const entry of preview) {
      const formatted = Object.entries(entry)
        .map(([key, value]) => `    - ${key}: ${this.formatValue(value)}`)
        .join('\n');
      lines.push(`- Eintrag:\n${formatted}`);
    }

    if (items.length > preview.length) {
      lines.push(`- … ${items.length - preview.length} weitere Einträge`);
    }

    return `${lines.join('\n')}\n`;
  }

  private formatValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '—';
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }

    return String(value);
  }
}




