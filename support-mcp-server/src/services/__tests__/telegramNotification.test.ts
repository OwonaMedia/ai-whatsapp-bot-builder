import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TelegramNotificationService } from '../telegramNotification.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Logger } from '../../utils/logger.js';

describe('TelegramNotificationService', () => {
  let service: TelegramNotificationService;
  let mockSupabase: SupabaseClient;
  let mockLogger: Logger;
  const mockN8nWebhookUrl = 'https://test.n8n.webhook';

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
    } as unknown as Logger;

    service = new TelegramNotificationService(mockSupabase, mockLogger, mockN8nWebhookUrl);
  });

  describe('hasPendingApprovalRequest', () => {
    it('sollte false zurückgeben wenn keine pending Anfrage existiert', async () => {
      const result = await service.hasPendingApprovalRequest('ticket-001', 'hetzner-command');
      expect(result).toBe(false);
    });

    it('sollte true zurückgeben wenn pending Anfrage existiert', async () => {
      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: 'event-001',
            ticket_id: 'ticket-001',
            action_type: 'telegram_approval',
            payload: { instructionType: 'hetzner-command' },
          },
        }),
      });

      const result = await service.hasPendingApprovalRequest('ticket-001', 'hetzner-command');
      expect(result).toBe(true);
    });

    it('sollte false zurückgeben wenn bereits eine Bestätigung vorhanden ist', async () => {
      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: 'event-001',
            ticket_id: 'ticket-001',
            action_type: 'telegram_approval',
            payload: { approved: true, instructionType: 'hetzner-command' },
          },
        }),
      });

      const result = await service.hasPendingApprovalRequest('ticket-001', 'hetzner-command');
      expect(result).toBe(false);
    });
  });

  describe('sendApprovalRequest', () => {
    it('sollte keine Anfrage senden wenn N8N_WEBHOOK_URL nicht konfiguriert ist', async () => {
      const serviceWithoutWebhook = new TelegramNotificationService(
        mockSupabase,
        mockLogger,
        undefined
      );

      await serviceWithoutWebhook.sendApprovalRequest({
        ticketId: 'ticket-001',
        instructionType: 'hetzner-command',
        description: 'Test command',
        command: 'pm2 restart test',
      });

      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('sollte keine Anfrage senden wenn bereits pending Anfrage existiert', async () => {
      vi.spyOn(service, 'hasPendingApprovalRequest').mockResolvedValue(true);
      vi.spyOn(service, 'checkExistingApproval').mockResolvedValue(null);

      await service.sendApprovalRequest({
        ticketId: 'ticket-001',
        instructionType: 'hetzner-command',
        description: 'Test command',
        command: 'pm2 restart test',
      });

      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('sollte Anfrage senden wenn keine pending Anfrage existiert', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      (mockSupabase.from as any).mockReturnValue({
        insert: vi.fn().mockResolvedValue({ error: null }),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      });

      vi.spyOn(service, 'hasPendingApprovalRequest').mockResolvedValue(false);
      vi.spyOn(service, 'checkExistingApproval' as any).mockResolvedValue(null);

      await service.sendApprovalRequest({
        ticketId: 'ticket-001',
        instructionType: 'hetzner-command',
        description: 'Test command',
        command: 'pm2 restart test',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        mockN8nWebhookUrl,
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('waitForApproval', () => {
    it('sollte auf Bestätigung warten', async () => {
      let callCount = 0;
      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({ data: null });
          }
          return Promise.resolve({
            data: {
              id: 'event-001',
              ticket_id: 'ticket-001',
              action_type: 'telegram_approval',
              payload: { approved: true, instructionType: 'hetzner-command' },
            },
          });
        }),
      });

      const result = await service.waitForApproval('ticket-001', 'hetzner-command', 1);

      expect(result).toBeDefined();
      expect(result?.approved).toBe(true);
    });

    it('sollte Timeout nach Ablauf der Zeit', async () => {
      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      });

      const result = await service.waitForApproval('ticket-001', 'hetzner-command', 0.01); // 0.01 Minuten = 0.6 Sekunden

      expect(result).toBeNull();
    });
  });
});

