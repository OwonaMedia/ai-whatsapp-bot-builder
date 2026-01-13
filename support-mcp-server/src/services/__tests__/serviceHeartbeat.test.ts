import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ServiceHeartbeat } from '../serviceHeartbeat.js';
import type { Logger } from '../../utils/logger.js';
import type { SupportSupabaseClient } from '../supabaseClient.js';

describe('ServiceHeartbeat', () => {
  let heartbeat: ServiceHeartbeat;
  let mockSupabase: SupportSupabaseClient;
  let mockLogger: Logger;

  beforeEach(() => {
    vi.useFakeTimers();

    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ error: null }),
    } as unknown as SupportSupabaseClient;

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      child: vi.fn().mockReturnThis(),
    } as unknown as Logger;

    heartbeat = new ServiceHeartbeat(mockSupabase, mockLogger, 'test-service', 1000);
  });

  afterEach(() => {
    vi.useRealTimers();
    if (heartbeat) {
      void heartbeat.stop();
    }
  });

  it('sollte Heartbeat starten', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    (mockSupabase.from as any).mockReturnValue({
      insert: mockInsert,
    });

    heartbeat.start('up');

    await vi.advanceTimersByTimeAsync(1000);

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({ service: 'test-service', intervalMs: 1000 }),
      'Starte Service-Heartbeat'
    );
  });

  it('sollte Heartbeat stoppen', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    (mockSupabase.from as any).mockReturnValue({
      insert: mockInsert,
    });

    heartbeat.start('up');
    await heartbeat.stop('down');

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({ service: 'test-service' }),
      'Service-Heartbeat gestoppt'
    );
  });

  it('sollte Meta-Provider verwenden wenn vorhanden', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    (mockSupabase.from as any).mockReturnValue({
      insert: mockInsert,
    });

    const metaProvider = vi.fn().mockResolvedValue({ customMeta: 'value' });
    const heartbeatWithMeta = new ServiceHeartbeat(
      mockSupabase,
      mockLogger,
      'test-service',
      1000,
      metaProvider
    );

    heartbeatWithMeta.start('up');
    await vi.advanceTimersByTimeAsync(1000);

    expect(metaProvider).toHaveBeenCalled();
  });
});

