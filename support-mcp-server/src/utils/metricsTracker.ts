import type { SupabaseClient } from '@supabase/supabase-js';
import type { Logger } from './logger.js';
import { logWithContext } from './logger.js';

export interface ProblemDiagnosisMetrics {
  ticketId: string;
  problemDetected: boolean;
  problemType?: string;
  detectionMethod?: 'keyword' | 'semantic' | 'llm' | 'reverse_engineering';
  detectionTime: number; // in milliseconds
  fixGenerated: boolean;
  fixType?: string;
  fixGenerationTime: number; // in milliseconds
  fixApplied: boolean;
  fixSuccess: boolean;
  fixApplicationTime: number; // in milliseconds
  totalProcessingTime: number; // in milliseconds
  postFixVerificationPassed: boolean;
  postFixVerificationTime: number; // in milliseconds
  createdAt: Date;
}

export interface SuccessRateMetrics {
  problemDetectionRate: number; // 0-1
  fixGenerationRate: number; // 0-1
  fixSuccessRate: number; // 0-1
  falsePositiveRate: number; // 0-1
  falseNegativeRate: number; // 0-1
  averageProcessingTime: number; // in milliseconds
  totalTickets: number;
  period: {
    start: Date;
    end: Date;
  };
}

export class MetricsTracker {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly logger: Logger,
  ) {}

  /**
   * Speichert Metriken für eine Ticket-Verarbeitung
   */
  async trackProblemDiagnosis(metrics: ProblemDiagnosisMetrics): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('problem_diagnosis_metrics')
        .insert({
          ticket_id: metrics.ticketId,
          problem_detected: metrics.problemDetected,
          problem_type: metrics.problemType,
          detection_method: metrics.detectionMethod,
          detection_time: metrics.detectionTime,
          fix_generated: metrics.fixGenerated,
          fix_type: metrics.fixType,
          fix_generation_time: metrics.fixGenerationTime,
          fix_applied: metrics.fixApplied,
          fix_success: metrics.fixSuccess,
          fix_application_time: metrics.fixApplicationTime,
          total_processing_time: metrics.totalProcessingTime,
          post_fix_verification_passed: metrics.postFixVerificationPassed,
          post_fix_verification_time: metrics.postFixVerificationTime,
          created_at: metrics.createdAt.toISOString(),
        });

      if (error) {
        logWithContext(this.logger, 'error', 'Fehler beim Speichern der Metriken', {
          component: 'MetricsTracker',
          metadata: { error: error.message, ticketId: metrics.ticketId },
        });
      } else {
        logWithContext(this.logger, 'debug', 'Metriken erfolgreich gespeichert', {
          component: 'MetricsTracker',
          metadata: { ticketId: metrics.ticketId },
        });
      }
    } catch (error) {
      logWithContext(this.logger, 'error', 'Fehler beim Speichern der Metriken', {
        component: 'MetricsTracker',
        metadata: { error: (error as Error).message, ticketId: metrics.ticketId },
      });
    }
  }

  /**
   * Berechnet Erfolgsquote-Metriken für einen Zeitraum
   */
  async calculateSuccessRateMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<SuccessRateMetrics> {
    try {
      const { data, error } = await this.supabase
        .from('problem_diagnosis_metrics')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        return {
          problemDetectionRate: 0,
          fixGenerationRate: 0,
          fixSuccessRate: 0,
          falsePositiveRate: 0,
          falseNegativeRate: 0,
          averageProcessingTime: 0,
          totalTickets: 0,
          period: { start: startDate, end: endDate },
        };
      }

      const totalTickets = data.length;
      const problemDetected = data.filter((m) => m.problem_detected).length;
      const fixGenerated = data.filter((m) => m.fix_generated).length;
      const fixSuccess = data.filter((m) => m.fix_success).length;
      const postFixVerificationPassed = data.filter((m) => m.post_fix_verification_passed).length;

      // Problem-Erkennungs-Rate: Anteil der Tickets mit erkanntem Problem
      const problemDetectionRate = problemDetected / totalTickets;

      // Fix-Generierungs-Rate: Anteil der erkannten Probleme mit generiertem Fix
      const fixGenerationRate = problemDetected > 0 ? fixGenerated / problemDetected : 0;

      // Fix-Erfolgs-Rate: Anteil der angewendeten Fixes die erfolgreich waren
      const fixApplied = data.filter((m) => m.fix_applied).length;
      const fixSuccessRate = fixApplied > 0 ? fixSuccess / fixApplied : 0;

      // False-Positive-Rate: Anteil der Tickets mit erkanntem Problem, aber Post-Fix-Verifikation fehlgeschlagen
      const falsePositives = data.filter(
        (m) => m.problem_detected && !m.post_fix_verification_passed
      ).length;
      const falsePositiveRate = problemDetected > 0 ? falsePositives / problemDetected : 0;

      // False-Negative-Rate: Anteil der Tickets ohne erkanntes Problem, aber Post-Fix-Verifikation erfolgreich
      // (Dies ist schwierig zu messen, da wir keine "echten" Probleme ohne Erkennung haben)
      const falseNegativeRate = 0; // TODO: Implementiere wenn möglich

      // Durchschnittliche Verarbeitungszeit
      const averageProcessingTime =
        data.reduce((sum, m) => sum + (m.total_processing_time || 0), 0) / totalTickets;

      return {
        problemDetectionRate,
        fixGenerationRate,
        fixSuccessRate,
        falsePositiveRate,
        falseNegativeRate,
        averageProcessingTime,
        totalTickets,
        period: { start: startDate, end: endDate },
      };
    } catch (error) {
      logWithContext(this.logger, 'error', 'Fehler beim Berechnen der Erfolgsquote-Metriken', {
        component: 'MetricsTracker',
        metadata: { error: (error as Error).message },
      });

      return {
        problemDetectionRate: 0,
        fixGenerationRate: 0,
        fixSuccessRate: 0,
        falsePositiveRate: 0,
        falseNegativeRate: 0,
        averageProcessingTime: 0,
        totalTickets: 0,
        period: { start: startDate, end: endDate },
      };
    }
  }

  /**
   * Gibt die aktuellen Erfolgsquote-Metriken zurück (letzte 24 Stunden)
   */
  async getCurrentSuccessRateMetrics(): Promise<SuccessRateMetrics> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // 24 Stunden zurück

    return this.calculateSuccessRateMetrics(startDate, endDate);
  }

  /**
   * Gibt die Erfolgsquote-Metriken für die letzten N Tage zurück
   */
  async getSuccessRateMetricsForDays(days: number): Promise<SuccessRateMetrics> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    return this.calculateSuccessRateMetrics(startDate, endDate);
  }
}

