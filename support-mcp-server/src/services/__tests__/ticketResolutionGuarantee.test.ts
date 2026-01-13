import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TicketResolutionGuarantee } from '../ticketResolutionGuarantee.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Logger } from '../../utils/logger.js';
import type { AutoFixResult } from '../actions/autopatchExecutor.js';
import * as configModule from '../config.js';

// Mock loadConfig
vi.mock('../config.js', () => ({
  loadConfig: vi.fn(() => ({
    N8N_WEBHOOK_URL: 'https://test.n8n.webhook',
  })),
}));

describe('TicketResolutionGuarantee', () => {
  let guarantee: TicketResolutionGuarantee;
  let mockSupabase: SupabaseClient;
  let mockLogger: Logger;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    } as unknown as SupabaseClient;

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      child: vi.fn().mockReturnThis(),
    } as unknown as Logger;

    guarantee = new TicketResolutionGuarantee(mockSupabase, mockLogger);
  });

  describe('ensureTicketResolution', () => {
    it('sollte resolved=true zurückgeben wenn AutoFix erfolgreich war', async () => {
      const ticket = {
        id: 'ticket-001',
        title: 'Test Ticket',
        description: 'Test Description',
        status: 'new',
        priority: 'high',
        category: 'technical',
      };

      const autoFixResult: AutoFixResult = {
        success: true,
        message: 'Fix applied successfully',
      };

      const result = await guarantee.ensureTicketResolution(ticket, autoFixResult, 0);

      expect(result.resolved).toBe(true);
      expect(result.status).toBe('resolved');
    });

    it('sollte alternative Strategien versuchen wenn AutoFix fehlgeschlagen ist', async () => {
      const ticket = {
        id: 'ticket-001',
        title: 'Test Ticket',
        description: 'Test Description',
        status: 'new',
        priority: 'high',
        category: 'technical',
      };

      const autoFixResult: AutoFixResult = {
        success: false,
        message: 'Fix failed',
      };

      vi.spyOn(guarantee, 'tryAlternativeStrategies').mockResolvedValue({
        resolved: true,
        status: 'resolved',
        message: 'Alternative strategy worked',
      });

      const result = await guarantee.ensureTicketResolution(ticket, autoFixResult, 0);

      expect(result.resolved).toBe(true);
      expect(guarantee['tryAlternativeStrategies']).toHaveBeenCalled();
    });

    it('sollte zu manueller Intervention eskalieren wenn AutoFix fehlgeschlagen ist', async () => {
      const ticket = {
        id: 'ticket-001',
        title: 'Test Ticket',
        description: 'Test Description',
        status: 'new',
        priority: 'high',
        category: 'technical',
      };

      const autoFixResult: AutoFixResult = {
        success: false,
        message: 'Fix failed',
      };

      vi.spyOn(guarantee, 'tryAlternativeStrategies').mockResolvedValue({
        resolved: false,
        status: 'investigating',
        message: 'Alternative strategies failed',
      });

      vi.spyOn(guarantee, 'escalateToManual').mockResolvedValue({
        resolved: true,
        status: 'escalated',
        message: 'Escalated to manual intervention',
      });

      const result = await guarantee.ensureTicketResolution(ticket, autoFixResult, 3);

      expect(result.resolved).toBe(true);
      expect(guarantee['escalateToManual']).toHaveBeenCalled();
    });
  });

  describe('tryAlternativeStrategies', () => {
    it('sollte alternative Strategien versuchen', async () => {
      const ticket = {
        id: 'ticket-001',
        title: 'Test Ticket',
        description: 'Test Description',
        status: 'new',
        priority: 'high',
        category: 'technical',
      };

      const autoFixResult: AutoFixResult = {
        success: false,
        message: 'Fix failed',
      };

      // Mock Supabase für tryAlternativeStrategies
      let callCount = 0;
      const mockQuery1 = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
      const mockQuery2 = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      (mockSupabase.from as any).mockImplementation((table: string) => {
        callCount++;
        if (table === 'support_ticket_messages') {
          return mockQuery1;
        } else if (table === 'support_tickets') {
          return mockQuery2;
        }
        return mockQuery1;
      });

      const result = await guarantee['tryAlternativeStrategies'](ticket, autoFixResult);

      expect(result).toBeDefined();
      expect(result.resolved).toBeDefined();
      expect(result.status).toBeDefined();
      expect(result.message).toBeDefined();
    });
  });

  describe('escalateToManual', () => {
    it('sollte zu manueller Intervention eskalieren', async () => {
      const ticket = {
        id: 'ticket-001',
        title: 'Test Ticket',
        description: 'Test Description',
        status: 'new',
        priority: 'high',
        category: 'technical',
      };

      const autoFixResult: AutoFixResult = {
        success: false,
        message: 'Fix failed',
      };

      // Mock Supabase für escalateToManual
      let callCount = 0;
      const mockQuery1 = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
      const mockQuery2 = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      (mockSupabase.from as any).mockImplementation((table: string) => {
        callCount++;
        if (table === 'support_ticket_messages') {
          return mockQuery1;
        } else if (table === 'support_tickets') {
          return mockQuery2;
        }
        return mockQuery1;
      });

      // Mock sendResultNotification (wird von TelegramNotificationService aufgerufen)
      vi.spyOn(guarantee['telegramService'], 'sendResultNotification' as any).mockResolvedValue(undefined);

      const result = await guarantee['escalateToManual'](ticket, autoFixResult);

      expect(result).toBeDefined();
      expect(result.resolved).toBeDefined();
      expect(result.status).toBeDefined();
      expect(result.message).toBeDefined();
    });
  });

  describe('handleTimeoutEscalation', () => {
    it('sollte Timeout-Escalation durchführen wenn Ticket > 30 Minuten ungelöst ist', async () => {
      const ticket = {
        id: 'ticket-001',
        title: 'Test Ticket',
        description: 'Test Description',
        status: 'new',
        priority: 'high',
        category: 'technical',
      };

      // Mock Ticket-Daten mit > 30 Minuten seit Update
      const oldDate = new Date();
      oldDate.setMinutes(oldDate.getMinutes() - 35); // 35 Minuten alt

      const mockQuery1 = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            created_at: oldDate.toISOString(),
            updated_at: oldDate.toISOString(),
          },
        }),
      };
      const mockQuery2 = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
      (mockSupabase.from as any).mockImplementation((table: string) => {
        if (table === 'support_tickets') {
          return mockQuery1;
        } else if (table === 'support_ticket_messages') {
          return mockQuery2;
        }
        return mockQuery1;
      });

      // Mock sendResultNotification
      vi.spyOn(guarantee['telegramService'], 'sendResultNotification' as any).mockResolvedValue(undefined);

      const result = await guarantee['handleTimeoutEscalation'](ticket);

      expect(result.resolved).toBe(false);
      expect(result.status).toBe('needs_manual_review');
      expect(result.message).toContain('Timeout-Escalation');
      expect(mockQuery2.insert).toHaveBeenCalled();
    });

    it('sollte keine Escalation durchführen wenn Ticket < 30 Minuten alt ist', async () => {
      const ticket = {
        id: 'ticket-001',
        title: 'Test Ticket',
        description: 'Test Description',
        status: 'new',
        priority: 'high',
        category: 'technical',
      };

      // Mock Ticket-Daten mit < 30 Minuten seit Update
      const recentDate = new Date();
      recentDate.setMinutes(recentDate.getMinutes() - 15); // 15 Minuten alt

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            created_at: recentDate.toISOString(),
            updated_at: recentDate.toISOString(),
          },
        }),
      };
      (mockSupabase.from as any).mockImplementation(() => mockQuery);

      const result = await guarantee['handleTimeoutEscalation'](ticket);

      expect(result.resolved).toBe(false);
      expect(result.status).toBe('new');
      expect(result.message).toBe('Noch kein Timeout');
    });

    it('sollte Fehler behandeln wenn Ticket nicht gefunden wird', async () => {
      const ticket = {
        id: 'ticket-001',
        title: 'Test Ticket',
        description: 'Test Description',
        status: 'new',
        priority: 'high',
        category: 'technical',
      };

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
      };
      (mockSupabase.from as any).mockImplementation(() => mockQuery);

      const result = await guarantee['handleTimeoutEscalation'](ticket);

      expect(result.resolved).toBe(false);
      expect(result.status).toBe('new');
      expect(result.message).toBe('Ticket nicht gefunden');
    });
  });

  describe('applyWorkaround', () => {
    it('sollte Workaround-Lösung anwenden', async () => {
      const ticket = {
        id: 'ticket-001',
        title: 'Test Ticket',
        description: 'Test Description',
        status: 'new',
        priority: 'high',
        category: 'technical',
      };

      const mockUpdate = vi.fn().mockResolvedValue({ error: null });
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      (mockSupabase.from as any).mockImplementation((table: string) => {
        if (table === 'support_tickets') {
          return {
            update: vi.fn().mockReturnThis(),
            eq: mockUpdate,
            insert: mockInsert,
          };
        } else if (table === 'support_ticket_messages') {
          return {
            insert: mockInsert,
          };
        }
        return { insert: mockInsert };
      });

      const result = await guarantee['applyWorkaround'](ticket);

      expect(result.resolved).toBe(true);
      expect(result.status).toBe('resolved_with_workaround');
      expect(result.message).toBe('Workaround-Lösung angewendet');
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockInsert).toHaveBeenCalledTimes(2); // Kunden-Nachricht + Follow-up-Ticket
    });
  });

  describe('applyFinalGuarantee', () => {
    it('sollte finale Garantie anwenden', async () => {
      const ticket = {
        id: 'ticket-001',
        title: 'Test Ticket',
        description: 'Test Description',
        status: 'new',
        priority: 'high',
        category: 'technical',
      };

      const mockQuery1 = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      const mockQuery2 = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
      (mockSupabase.from as any).mockImplementation((table: string) => {
        if (table === 'support_tickets') {
          return mockQuery1;
        } else if (table === 'support_ticket_messages') {
          return mockQuery2;
        }
        return mockQuery1;
      });

      // Mock sendResultNotification
      vi.spyOn(guarantee['telegramService'], 'sendResultNotification' as any).mockResolvedValue(undefined);

      const result = await guarantee['applyFinalGuarantee'](ticket);

      expect(result.resolved).toBe(true);
      expect(result.status).toBe('resolved_manual_required');
      expect(result.message).toContain('Finale Garantie');
      expect(mockQuery1.update).toHaveBeenCalled();
      expect(mockQuery2.insert).toHaveBeenCalled();
    });

    it('sollte Fehler bei Telegram-Benachrichtigung behandeln', async () => {
      const ticket = {
        id: 'ticket-001',
        title: 'Test Ticket',
        description: 'Test Description',
        status: 'new',
        priority: 'high',
        category: 'technical',
      };

      const mockQuery1 = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      const mockQuery2 = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
      (mockSupabase.from as any).mockImplementation((table: string) => {
        if (table === 'support_tickets') {
          return mockQuery1;
        } else if (table === 'support_ticket_messages') {
          return mockQuery2;
        }
        return mockQuery1;
      });

      // Mock sendResultNotification um Fehler zu werfen
      vi.spyOn(guarantee['telegramService'], 'sendResultNotification' as any).mockRejectedValue(
        new Error('Telegram error')
      );

      const result = await guarantee['applyFinalGuarantee'](ticket);

      expect(result.resolved).toBe(true);
      expect(result.status).toBe('resolved_manual_required');
      expect(mockLogger.warn).toHaveBeenCalled();
    });
  });

  describe('checkManualResolution', () => {
    it('sollte true zurückgeben wenn Ticket resolved ist', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            status: 'resolved',
            updated_at: new Date().toISOString(),
          },
        }),
      };
      (mockSupabase.from as any).mockImplementation(() => mockQuery);

      const result = await guarantee.checkManualResolution('ticket-001');

      expect(result).toBe(true);
    });

    it('sollte true zurückgeben wenn Ticket resolved_with_workaround ist', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            status: 'resolved_with_workaround',
            updated_at: new Date().toISOString(),
          },
        }),
      };
      (mockSupabase.from as any).mockImplementation(() => mockQuery);

      const result = await guarantee.checkManualResolution('ticket-001');

      expect(result).toBe(true);
    });

    it('sollte false zurückgeben wenn Ticket noch nicht resolved ist', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            status: 'new',
            updated_at: new Date().toISOString(),
          },
        }),
      };
      (mockSupabase.from as any).mockImplementation(() => mockQuery);

      const result = await guarantee.checkManualResolution('ticket-001');

      expect(result).toBe(false);
    });

    it('sollte false zurückgeben wenn Ticket nicht gefunden wird', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null }),
      };
      (mockSupabase.from as any).mockImplementation(() => mockQuery);

      const result = await guarantee.checkManualResolution('ticket-001');

      expect(result).toBe(false);
    });
  });

  describe('ensureTicketResolution - vollständiger Flow', () => {
    it('sollte Level 4 (Timeout-Escalation) aufrufen wenn Level 3 fehlschlägt', async () => {
      const ticket = {
        id: 'ticket-001',
        title: 'Test Ticket',
        description: 'Test Description',
        status: 'new',
        priority: 'high',
        category: 'technical',
      };

      const autoFixResult: AutoFixResult = {
        success: false,
        message: 'Fix failed',
      };

      vi.spyOn(guarantee, 'tryAlternativeStrategies').mockResolvedValue({
        resolved: false,
        status: 'investigating',
        message: 'Alternative strategies failed',
      });
      vi.spyOn(guarantee, 'escalateToManual').mockResolvedValue({
        resolved: false,
        status: 'needs_manual_review',
        message: 'Manual escalation failed',
      });
      vi.spyOn(guarantee, 'handleTimeoutEscalation').mockResolvedValue({
        resolved: true,
        status: 'escalated',
        message: 'Timeout escalation worked',
      });

      const result = await guarantee.ensureTicketResolution(ticket, autoFixResult, 3);

      expect(result.resolved).toBe(true);
      expect(guarantee['handleTimeoutEscalation']).toHaveBeenCalled();
    });

    it('sollte Level 5 (Workaround) aufrufen wenn Level 4 fehlschlägt', async () => {
      const ticket = {
        id: 'ticket-001',
        title: 'Test Ticket',
        description: 'Test Description',
        status: 'new',
        priority: 'high',
        category: 'technical',
      };

      const autoFixResult: AutoFixResult = {
        success: false,
        message: 'Fix failed',
      };

      vi.spyOn(guarantee, 'tryAlternativeStrategies').mockResolvedValue({
        resolved: false,
        status: 'investigating',
        message: 'Alternative strategies failed',
      });
      vi.spyOn(guarantee, 'escalateToManual').mockResolvedValue({
        resolved: false,
        status: 'needs_manual_review',
        message: 'Manual escalation failed',
      });
      vi.spyOn(guarantee, 'handleTimeoutEscalation').mockResolvedValue({
        resolved: false,
        status: 'needs_manual_review',
        message: 'Timeout escalation failed',
      });
      vi.spyOn(guarantee, 'applyWorkaround').mockResolvedValue({
        resolved: true,
        status: 'resolved_with_workaround',
        message: 'Workaround applied',
      });

      const result = await guarantee.ensureTicketResolution(ticket, autoFixResult, 3);

      expect(result.resolved).toBe(true);
      expect(guarantee['applyWorkaround']).toHaveBeenCalled();
    });

    it('sollte Level 6 (Finale Garantie) aufrufen wenn alle anderen Level fehlschlagen', async () => {
      const ticket = {
        id: 'ticket-001',
        title: 'Test Ticket',
        description: 'Test Description',
        status: 'new',
        priority: 'high',
        category: 'technical',
      };

      const autoFixResult: AutoFixResult = {
        success: false,
        message: 'Fix failed',
      };

      vi.spyOn(guarantee, 'tryAlternativeStrategies').mockResolvedValue({
        resolved: false,
        status: 'investigating',
        message: 'Alternative strategies failed',
      });
      vi.spyOn(guarantee, 'escalateToManual').mockResolvedValue({
        resolved: false,
        status: 'needs_manual_review',
        message: 'Manual escalation failed',
      });
      vi.spyOn(guarantee, 'handleTimeoutEscalation').mockResolvedValue({
        resolved: false,
        status: 'needs_manual_review',
        message: 'Timeout escalation failed',
      });
      vi.spyOn(guarantee, 'applyWorkaround').mockResolvedValue({
        resolved: false,
        status: 'needs_manual_review',
        message: 'Workaround failed',
      });
      vi.spyOn(guarantee, 'applyFinalGuarantee').mockResolvedValue({
        resolved: true,
        status: 'resolved_manual_required',
        message: 'Final guarantee applied',
      });

      const result = await guarantee.ensureTicketResolution(ticket, autoFixResult, 3);

      expect(result.resolved).toBe(true);
      expect(guarantee['applyFinalGuarantee']).toHaveBeenCalled();
    });
  });
});

