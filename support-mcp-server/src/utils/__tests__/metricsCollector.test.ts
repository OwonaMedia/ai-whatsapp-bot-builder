import { describe, it, expect, beforeEach } from 'vitest';
import { MetricsCollector, metricsCollector } from '../metricsCollector.js';

describe('MetricsCollector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector();
    collector.reset();
  });

  describe('recordTicketProcessed', () => {
    it('sollte verarbeitetes Ticket aufzeichnen', () => {
      collector.recordTicketProcessed();
      collector.recordTicketProcessed();

      const metrics = collector.getMetrics();
      expect(metrics.ticketsProcessed).toBe(2);
    });
  });

  describe('recordAutopatchSuccess', () => {
    it('sollte erfolgreichen Autopatch aufzeichnen', () => {
      collector.recordAutopatchSuccess();
      collector.recordAutopatchSuccess();

      const metrics = collector.getMetrics();
      expect(metrics.autopatchSuccess).toBe(2);
    });
  });

  describe('recordAutopatchFailed', () => {
    it('sollte fehlgeschlagenen Autopatch aufzeichnen', () => {
      collector.recordAutopatchFailed();
      collector.recordAutopatchFailed();

      const metrics = collector.getMetrics();
      expect(metrics.autopatchFailed).toBe(2);
    });
  });

  describe('recordLatency', () => {
    it('sollte Latenz für insert-Operation aufzeichnen', () => {
      collector.recordLatency('insert', 100);
      collector.recordLatency('insert', 200);

      const metrics = collector.getMetrics();
      expect(metrics.insertEventLatency).toEqual([100, 200]);
      expect(metrics.averageInsertLatency).toBe(150);
    });

    it('sollte Latenz für autofix-Operation aufzeichnen', () => {
      collector.recordLatency('autofix', 500);
      collector.recordLatency('autofix', 600);

      const metrics = collector.getMetrics();
      expect(metrics.autofixDuration).toEqual([500, 600]);
      expect(metrics.averageAutofixDuration).toBe(550);
    });

    it('sollte Latenz für dispatch-Operation aufzeichnen', () => {
      collector.recordLatency('dispatch', 50);
      collector.recordLatency('dispatch', 75);

      const metrics = collector.getMetrics();
      expect(metrics.dispatchDuration).toEqual([50, 75]);
      expect(metrics.averageDispatchDuration).toBe(62.5);
    });

    it('sollte maxSamples begrenzen (FIFO)', () => {
      // Füge mehr als maxSamples (1000) hinzu
      for (let i = 0; i < 1001; i++) {
        collector.recordLatency('insert', i);
      }

      const metrics = collector.getMetrics();
      expect(metrics.insertEventLatency.length).toBe(1000);
      expect(metrics.insertEventLatency[0]).toBe(1); // Erster wurde entfernt
      expect(metrics.insertEventLatency[999]).toBe(1000); // Letzter ist drin
    });
  });

  describe('recordError', () => {
    it('sollte Fehler aufzeichnen', () => {
      collector.recordError('component1', 'Error message 1', 'ticket-001');
      collector.recordError('component2', 'Error message 2');

      const metrics = collector.getMetrics();
      expect(metrics.errors.length).toBe(2);
      expect(metrics.errors[0].component).toBe('component1');
      expect(metrics.errors[0].message).toBe('Error message 1');
      expect(metrics.errors[0].ticketId).toBe('ticket-001');
      expect(metrics.errors[1].component).toBe('component2');
      expect(metrics.errors[1].ticketId).toBeUndefined();
    });

    it('sollte maxSamples für Fehler begrenzen (FIFO)', () => {
      for (let i = 0; i < 1001; i++) {
        collector.recordError('component', `Error ${i}`);
      }

      const metrics = collector.getMetrics();
      expect(metrics.errors.length).toBe(1000);
      expect(metrics.errors[0].message).toBe('Error 1'); // Erster wurde entfernt
      expect(metrics.errors[999].message).toBe('Error 1000'); // Letzter ist drin
    });
  });

  describe('getMetrics', () => {
    it('sollte autopatchSuccessRate korrekt berechnen', () => {
      collector.recordAutopatchSuccess();
      collector.recordAutopatchSuccess();
      collector.recordAutopatchFailed();

      const metrics = collector.getMetrics();
      expect(metrics.autopatchSuccessRate).toBe(2 / 3);
    });

    it('sollte autopatchSuccessRate 0 zurückgeben wenn keine Autopatches', () => {
      const metrics = collector.getMetrics();
      expect(metrics.autopatchSuccessRate).toBe(0);
    });

    it('sollte averageInsertLatency korrekt berechnen', () => {
      collector.recordLatency('insert', 100);
      collector.recordLatency('insert', 200);
      collector.recordLatency('insert', 300);

      const metrics = collector.getMetrics();
      expect(metrics.averageInsertLatency).toBe(200);
    });

    it('sollte averageInsertLatency 0 zurückgeben wenn keine Latenzen', () => {
      const metrics = collector.getMetrics();
      expect(metrics.averageInsertLatency).toBe(0);
    });

    it('sollte errorRate korrekt berechnen', () => {
      collector.recordTicketProcessed();
      collector.recordTicketProcessed();
      collector.recordError('component', 'Error 1');
      collector.recordError('component', 'Error 2');

      const metrics = collector.getMetrics();
      expect(metrics.errorRate).toBe(1); // 2 Fehler / 2 Tickets = 1
    });

    it('sollte errorRate 0 zurückgeben wenn keine Tickets', () => {
      collector.recordError('component', 'Error');

      const metrics = collector.getMetrics();
      expect(metrics.errorRate).toBe(0);
    });

    it('sollte recentErrors zurückgeben (letzte 10)', () => {
      for (let i = 0; i < 15; i++) {
        collector.recordError('component', `Error ${i}`);
      }

      const metrics = collector.getMetrics();
      expect(metrics.recentErrors.length).toBe(10);
      expect(metrics.recentErrors[0].message).toBe('Error 5'); // Letzte 10
      expect(metrics.recentErrors[9].message).toBe('Error 14');
    });
  });

  describe('getPrometheusMetrics', () => {
    it('sollte Prometheus-Format zurückgeben', () => {
      collector.recordTicketProcessed();
      collector.recordAutopatchSuccess();
      collector.recordAutopatchFailed();
      collector.recordLatency('insert', 100);
      collector.recordLatency('autofix', 500);
      collector.recordLatency('dispatch', 50);
      collector.recordError('component', 'Error');

      const prometheus = collector.getPrometheusMetrics();

      expect(prometheus).toContain('support_tickets_processed_total 1');
      expect(prometheus).toContain('support_autopatch_success_total 1');
      expect(prometheus).toContain('support_autopatch_failed_total 1');
      expect(prometheus).toContain('support_autopatch_success_rate 0.5');
      expect(prometheus).toContain('support_insert_event_latency_seconds');
      expect(prometheus).toContain('support_autofix_duration_seconds');
      expect(prometheus).toContain('support_dispatch_duration_seconds');
      expect(prometheus).toContain('support_error_rate');
    });
  });

  describe('reset', () => {
    it('sollte alle Metriken zurücksetzen', () => {
      collector.recordTicketProcessed();
      collector.recordAutopatchSuccess();
      collector.recordAutopatchFailed();
      collector.recordLatency('insert', 100);
      collector.recordError('component', 'Error');

      collector.reset();

      const metrics = collector.getMetrics();
      expect(metrics.ticketsProcessed).toBe(0);
      expect(metrics.autopatchSuccess).toBe(0);
      expect(metrics.autopatchFailed).toBe(0);
      expect(metrics.insertEventLatency.length).toBe(0);
      expect(metrics.errors.length).toBe(0);
    });
  });

  describe('singleton', () => {
    it('sollte Singleton-Instanz exportieren', () => {
      expect(metricsCollector).toBeInstanceOf(MetricsCollector);
    });
  });
});

