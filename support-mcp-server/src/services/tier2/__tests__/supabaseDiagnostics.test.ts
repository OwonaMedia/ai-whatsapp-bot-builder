import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SupabaseDiagnostics } from '../supabaseDiagnostics.js';
import type { Logger } from '../../../utils/logger.js';
import type { SupportSupabaseClient } from '../../supabaseClient.js';

describe('SupabaseDiagnostics', () => {
  let diagnostics: SupabaseDiagnostics;
  let mockSupabase: SupportSupabaseClient;
  let mockLogger: Logger;

  beforeEach(() => {
    mockSupabase = {
      rpc: vi.fn(),
    } as unknown as SupportSupabaseClient;

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      child: vi.fn().mockReturnThis(),
    } as unknown as Logger;

    diagnostics = new SupabaseDiagnostics(mockSupabase, mockLogger);
  });

  describe('run', () => {
    it('sollte Diagnose erfolgreich ausführen', async () => {
      const ticketId = 'ticket-001';
      const mockData = {
        orphan_profiles: [{ id: '1', name: 'Test' }],
        inactive_subscriptions: [{ id: '2', status: 'inactive' }],
        recent_audit_errors: [],
        recent_workflow_errors: [],
        generated_at: '2025-01-01T00:00:00Z',
      };

      (mockSupabase.rpc as any).mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await diagnostics.run(ticketId);

      expect(result).not.toBeNull();
      expect(result?.summary).toContain('Supabase-Diagnose abgeschlossen');
      expect(result?.summary).toContain('Verwaiste Profile: 1');
      expect(result?.summary).toContain('Problematische Subscriptions: 1');
      expect(result?.details).toEqual(mockData);
      expect(result?.knowledgeDoc.id).toContain(ticketId);
    });

    it('sollte null zurückgeben wenn RPC fehlschlägt', async () => {
      const ticketId = 'ticket-001';

      (mockSupabase.rpc as any).mockResolvedValue({
        data: null,
        error: { message: 'RPC failed' },
      });

      const result = await diagnostics.run(ticketId);

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        { err: { message: 'RPC failed' }, ticketId },
        'Supabase-Diagnose konnte nicht ausgeführt werden'
      );
    });

    it('sollte leere Arrays behandeln', async () => {
      const ticketId = 'ticket-001';
      const mockData = {
        orphan_profiles: [],
        inactive_subscriptions: [],
        recent_audit_errors: [],
        recent_workflow_errors: [],
        generated_at: '2025-01-01T00:00:00Z',
      };

      (mockSupabase.rpc as any).mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await diagnostics.run(ticketId);

      expect(result).not.toBeNull();
      expect(result?.summary).toContain('Verwaiste Profile: 0');
      expect(result?.summary).toContain('Problematische Subscriptions: 0');
    });

    it('sollte undefined/null Werte behandeln', async () => {
      const ticketId = 'ticket-001';
      const mockData = {
        orphan_profiles: undefined,
        inactive_subscriptions: null,
        recent_audit_errors: undefined,
        recent_workflow_errors: null,
      };

      (mockSupabase.rpc as any).mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await diagnostics.run(ticketId);

      expect(result).not.toBeNull();
      expect(result?.summary).toContain('Verwaiste Profile: 0');
      expect(result?.summary).toContain('Problematische Subscriptions: 0');
    });

    it('sollte leeres data-Objekt behandeln', async () => {
      const ticketId = 'ticket-001';

      (mockSupabase.rpc as any).mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await diagnostics.run(ticketId);

      expect(result).not.toBeNull();
      expect(result?.summary).toContain('Verwaiste Profile: 0');
    });
  });

  describe('buildSummary', () => {
    it('sollte korrekte Zusammenfassung für alle Felder erstellen', async () => {
      const ticketId = 'ticket-001';
      const mockData = {
        orphan_profiles: [{ id: '1' }, { id: '2' }],
        inactive_subscriptions: [{ id: '3' }],
        recent_audit_errors: [{ id: '4' }, { id: '5' }, { id: '6' }],
        recent_workflow_errors: [{ id: '7' }],
        generated_at: '2025-01-01T00:00:00Z',
      };

      (mockSupabase.rpc as any).mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await diagnostics.run(ticketId);

      expect(result?.summary).toContain('Verwaiste Profile: 2');
      expect(result?.summary).toContain('Problematische Subscriptions: 1');
      expect(result?.summary).toContain('Audit-Log Fehler (24h): 3');
      expect(result?.summary).toContain('Workflow-Fehler (24h): 1');
    });
  });

  describe('buildKnowledgeDoc', () => {
    it('sollte Knowledge-Dokument mit korrekter Struktur erstellen', async () => {
      const ticketId = 'ticket-001';
      const mockData = {
        orphan_profiles: [{ id: '1', name: 'Test Profile' }],
        inactive_subscriptions: [],
        recent_audit_errors: [],
        recent_workflow_errors: [],
        generated_at: '2025-01-01T00:00:00Z',
      };

      (mockSupabase.rpc as any).mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await diagnostics.run(ticketId);

      expect(result?.knowledgeDoc).toBeDefined();
      expect(result?.knowledgeDoc.id).toContain('virtual://diagnostics/supabase');
      expect(result?.knowledgeDoc.id).toContain(ticketId);
      expect(result?.knowledgeDoc.title).toContain('Supabase Diagnose');
      expect(result?.knowledgeDoc.content).toContain('# Supabase Diagnose Snapshot');
      expect(result?.knowledgeDoc.content).toContain('## Zusammenfassung');
      expect(result?.knowledgeDoc.content).toContain('### Verwaiste Profile');
    });

    it('sollte alle Sektionen im Knowledge-Dokument enthalten', async () => {
      const ticketId = 'ticket-001';
      const mockData = {
        orphan_profiles: [{ id: '1' }],
        inactive_subscriptions: [{ id: '2' }],
        recent_audit_errors: [{ id: '3' }],
        recent_workflow_errors: [{ id: '4' }],
        generated_at: '2025-01-01T00:00:00Z',
      };

      (mockSupabase.rpc as any).mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await diagnostics.run(ticketId);

      const content = result?.knowledgeDoc.content || '';
      expect(content).toContain('### Verwaiste Profile');
      expect(content).toContain('### Subscriptions mit Problemstatus');
      expect(content).toContain('### Audit-Log Fehler');
      expect(content).toContain('### Workflow-Fehler');
    });
  });

  describe('renderSection', () => {
    it('sollte "Keine Auffälligkeiten" für leere Arrays anzeigen', async () => {
      const ticketId = 'ticket-001';
      const mockData = {
        orphan_profiles: [],
        inactive_subscriptions: [],
        recent_audit_errors: [],
        recent_workflow_errors: [],
        generated_at: '2025-01-01T00:00:00Z',
      };

      (mockSupabase.rpc as any).mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await diagnostics.run(ticketId);

      const content = result?.knowledgeDoc.content || '';
      expect(content).toContain('Keine Auffälligkeiten');
    });

    it('sollte nur MAX_PREVIEW_ITEMS Einträge anzeigen', async () => {
      const ticketId = 'ticket-001';
      const mockData = {
        orphan_profiles: [
          { id: '1', name: 'Profile 1' },
          { id: '2', name: 'Profile 2' },
          { id: '3', name: 'Profile 3' },
          { id: '4', name: 'Profile 4' },
          { id: '5', name: 'Profile 5' },
        ],
        inactive_subscriptions: [],
        recent_audit_errors: [],
        recent_workflow_errors: [],
        generated_at: '2025-01-01T00:00:00Z',
      };

      (mockSupabase.rpc as any).mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await diagnostics.run(ticketId);

      const content = result?.knowledgeDoc.content || '';
      // Sollte nur 3 Einträge zeigen + "... 2 weitere Einträge"
      expect(content).toContain('Profile 1');
      expect(content).toContain('Profile 2');
      expect(content).toContain('Profile 3');
      expect(content).toContain('… 2 weitere Einträge');
      expect(content).not.toContain('Profile 4');
      expect(content).not.toContain('Profile 5');
    });
  });

  describe('formatValue', () => {
    it('sollte verschiedene Datentypen korrekt formatieren', async () => {
      const ticketId = 'ticket-001';
      const mockData = {
        orphan_profiles: [
          { id: '1', name: 'Test', count: 5, active: true, date: '2025-01-01', nested: { key: 'value' } },
        ],
        inactive_subscriptions: [],
        recent_audit_errors: [],
        recent_workflow_errors: [],
        generated_at: '2025-01-01T00:00:00Z',
      };

      (mockSupabase.rpc as any).mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await diagnostics.run(ticketId);

      const content = result?.knowledgeDoc.content || '';
      expect(content).toContain('id: 1');
      expect(content).toContain('name: Test');
      expect(content).toContain('count: 5');
      expect(content).toContain('active: true');
    });

    it('sollte null/undefined als "—" formatieren', async () => {
      const ticketId = 'ticket-001';
      const mockData = {
        orphan_profiles: [
          { id: '1', name: null, value: undefined },
        ],
        inactive_subscriptions: [],
        recent_audit_errors: [],
        recent_workflow_errors: [],
        generated_at: '2025-01-01T00:00:00Z',
      };

      (mockSupabase.rpc as any).mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await diagnostics.run(ticketId);

      const content = result?.knowledgeDoc.content || '';
      expect(content).toContain('name: —');
      expect(content).toContain('value: —');
    });
  });
});

