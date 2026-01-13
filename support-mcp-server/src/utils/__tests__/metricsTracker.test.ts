import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MetricsTracker } from '../metricsTracker.js';
import type { Logger } from '../logger.js';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock logWithContext
vi.mock('../logger.js', async () => {
  const actual = await vi.importActual('../logger.js');
  return {
    ...actual,
    logWithContext: vi.fn((logger, level, message, context) => {
      if (logger[level]) {
        logger[level](context?.metadata || {}, message);
      }
    }),
  };
});

describe('MetricsTracker', () => {
  let tracker: MetricsTracker;
  let mockSupabase: SupabaseClient;
  let mockLogger: Logger;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as unknown as SupabaseClient;

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      child: vi.fn().mockReturnThis(),
    } as unknown as Logger;

    tracker = new MetricsTracker(mockSupabase, mockLogger);
  });

  describe('trackProblemDiagnosis', () => {
    it('sollte Metriken erfolgreich speichern', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      (mockSupabase.from as any).mockReturnValue({
        insert: mockInsert,
      });

      const metrics = {
        ticketId: 'ticket-001',
        problemDetected: true,
        problemType: 'pdf-upload',
        detectionMethod: 'keyword' as const,
        detectionTime: 100,
        fixGenerated: true,
        fixType: 'code-modify',
        fixGenerationTime: 200,
        fixApplied: true,
        fixSuccess: true,
        fixApplicationTime: 300,
        totalProcessingTime: 600,
        postFixVerificationPassed: true,
        postFixVerificationTime: 50,
        createdAt: new Date(),
      };

      await tracker.trackProblemDiagnosis(metrics);

      expect(mockSupabase.from).toHaveBeenCalledWith('problem_diagnosis_metrics');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          ticket_id: 'ticket-001',
          problem_detected: true,
          problem_type: 'pdf-upload',
          detection_method: 'keyword',
        })
      );
    });

    it('sollte Fehler beim Speichern behandeln', async () => {
      const error = { message: 'Database error' };
      const mockInsert = vi.fn().mockResolvedValue({ error });
      (mockSupabase.from as any).mockReturnValue({
        insert: mockInsert,
      });

      const metrics = {
        ticketId: 'ticket-001',
        problemDetected: true,
        problemType: 'pdf-upload',
        detectionMethod: 'keyword' as const,
        detectionTime: 100,
        fixGenerated: false,
        fixGenerationTime: 0,
        fixApplied: false,
        fixSuccess: false,
        fixApplicationTime: 0,
        totalProcessingTime: 100,
        postFixVerificationPassed: false,
        postFixVerificationTime: 0,
        createdAt: new Date(),
      };

      await tracker.trackProblemDiagnosis(metrics);

      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('sollte Exception beim Speichern behandeln', async () => {
      const mockInsert = vi.fn().mockRejectedValue(new Error('Network error'));
      (mockSupabase.from as any).mockReturnValue({
        insert: mockInsert,
      });

      const metrics = {
        ticketId: 'ticket-001',
        problemDetected: false,
        detectionTime: 50,
        fixGenerated: false,
        fixGenerationTime: 0,
        fixApplied: false,
        fixSuccess: false,
        fixApplicationTime: 0,
        totalProcessingTime: 50,
        postFixVerificationPassed: false,
        postFixVerificationTime: 0,
        createdAt: new Date(),
      };

      await tracker.trackProblemDiagnosis(metrics);

      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('calculateSuccessRateMetrics', () => {
    it('sollte Metriken für leere Daten zurückgeben', async () => {
      const mockLte = vi.fn().mockResolvedValue({ data: [], error: null });
      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: mockLte,
      });

      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-02');

      const result = await tracker.calculateSuccessRateMetrics(startDate, endDate);

      expect(result.totalTickets).toBe(0);
      expect(result.problemDetectionRate).toBe(0);
      expect(result.fixGenerationRate).toBe(0);
      expect(result.fixSuccessRate).toBe(0);
      expect(result.period.start).toEqual(startDate);
      expect(result.period.end).toEqual(endDate);
    });

    it('sollte Metriken korrekt berechnen', async () => {
      const mockData = [
        {
          problem_detected: true,
          fix_generated: true,
          fix_applied: true,
          fix_success: true,
          post_fix_verification_passed: true,
          total_processing_time: 100,
        },
        {
          problem_detected: true,
          fix_generated: true,
          fix_applied: true,
          fix_success: false,
          post_fix_verification_passed: false,
          total_processing_time: 200,
        },
        {
          problem_detected: true,
          fix_generated: false,
          fix_applied: false,
          fix_success: false,
          post_fix_verification_passed: false,
          total_processing_time: 50,
        },
        {
          problem_detected: false,
          fix_generated: false,
          fix_applied: false,
          fix_success: false,
          post_fix_verification_passed: false,
          total_processing_time: 30,
        },
      ];

      const mockLte = vi.fn().mockResolvedValue({ data: mockData, error: null });
      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: mockLte,
      });

      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-02');

      const result = await tracker.calculateSuccessRateMetrics(startDate, endDate);

      expect(result.totalTickets).toBe(4);
      expect(result.problemDetectionRate).toBe(0.75); // 3/4
      expect(result.fixGenerationRate).toBeCloseTo(0.67, 2); // 2/3
      expect(result.fixSuccessRate).toBe(0.5); // 1/2
      expect(result.falsePositiveRate).toBeCloseTo(0.67, 2); // 2/3
      expect(result.averageProcessingTime).toBe(95); // (100+200+50+30)/4
    });

    it('sollte Fehler beim Abrufen behandeln', async () => {
      const mockLte = vi.fn().mockResolvedValue({ data: null, error: { message: 'Query error' } });
      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: mockLte,
      });

      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-02');

      const result = await tracker.calculateSuccessRateMetrics(startDate, endDate);

      expect(result.totalTickets).toBe(0);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('sollte Exception beim Abrufen behandeln', async () => {
      const mockLte = vi.fn().mockRejectedValue(new Error('Network error'));
      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: mockLte,
      });

      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-02');

      const result = await tracker.calculateSuccessRateMetrics(startDate, endDate);

      expect(result.totalTickets).toBe(0);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getCurrentSuccessRateMetrics', () => {
    it('sollte Metriken für letzte 24 Stunden zurückgeben', async () => {
      vi.useFakeTimers();
      const now = new Date('2025-01-02T12:00:00Z');
      vi.setSystemTime(now);

      const mockLte = vi.fn().mockResolvedValue({ data: [], error: null });
      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: mockLte,
      });

      await tracker.getCurrentSuccessRateMetrics();

      expect(mockSupabase.from).toHaveBeenCalledWith('problem_diagnosis_metrics');
      
      vi.useRealTimers();
    });
  });

  describe('getSuccessRateMetricsForDays', () => {
    it('sollte Metriken für N Tage zurückgeben', async () => {
      vi.useFakeTimers();
      const now = new Date('2025-01-10T12:00:00Z');
      vi.setSystemTime(now);

      const mockLte = vi.fn().mockResolvedValue({ data: [], error: null });
      (mockSupabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: mockLte,
      });

      await tracker.getSuccessRateMetricsForDays(7);

      expect(mockSupabase.from).toHaveBeenCalledWith('problem_diagnosis_metrics');
      
      vi.useRealTimers();
    });
  });
});
