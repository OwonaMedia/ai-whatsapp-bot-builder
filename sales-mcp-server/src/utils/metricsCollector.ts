/**
 * Metrics Collector für System-Monitoring
 * Sammelt Erfolgsrate, Latenz, Fehlerrate
 */

export interface SystemMetrics {
  ticketsProcessed: number;
  autopatchSuccess: number;
  autopatchFailed: number;
  insertEventLatency: number[];
  autofixDuration: number[];
  dispatchDuration: number[];
  errors: Array<{
    timestamp: Date;
    component: string;
    message: string;
    ticketId?: string;
  }>;
}

export class MetricsCollector {
  private metrics: SystemMetrics = {
    ticketsProcessed: 0,
    autopatchSuccess: 0,
    autopatchFailed: 0,
    insertEventLatency: [],
    autofixDuration: [],
    dispatchDuration: [],
    errors: [],
  };

  private readonly maxSamples = 1000; // Max. Samples für Histogramme

  /**
   * Zeichnet verarbeitetes Ticket auf
   */
  recordTicketProcessed(): void {
    this.metrics.ticketsProcessed++;
  }

  /**
   * Zeichnet erfolgreichen Autopatch auf
   */
  recordAutopatchSuccess(): void {
    this.metrics.autopatchSuccess++;
  }

  /**
   * Zeichnet fehlgeschlagenen Autopatch auf
   */
  recordAutopatchFailed(): void {
    this.metrics.autopatchFailed++;
  }

  /**
   * Zeichnet Latenz für Operation auf
   */
  recordLatency(operation: 'insert' | 'autofix' | 'dispatch', duration: number): void {
    const array = 
      operation === 'insert' ? this.metrics.insertEventLatency :
      operation === 'autofix' ? this.metrics.autofixDuration :
      this.metrics.dispatchDuration;
    
    array.push(duration);
    
    // Begrenze auf maxSamples (FIFO)
    if (array.length > this.maxSamples) {
      array.shift();
    }
  }

  /**
   * Zeichnet Fehler auf
   */
  recordError(component: string, message: string, ticketId?: string): void {
    this.metrics.errors.push({
      timestamp: new Date(),
      component,
      message,
      ticketId,
    });
    
    // Begrenze auf maxSamples
    if (this.metrics.errors.length > this.maxSamples) {
      this.metrics.errors.shift();
    }
  }

  /**
   * Gibt aktuelle Metrics zurück
   */
  getMetrics(): SystemMetrics & {
    autopatchSuccessRate: number;
    averageInsertLatency: number;
    averageAutofixDuration: number;
    averageDispatchDuration: number;
    errorRate: number;
    recentErrors: Array<{
      timestamp: Date;
      component: string;
      message: string;
      ticketId?: string;
    }>;
  } {
    const totalAutopatch = this.metrics.autopatchSuccess + this.metrics.autopatchFailed;
    const autopatchSuccessRate = totalAutopatch > 0
      ? this.metrics.autopatchSuccess / totalAutopatch
      : 0;

    const averageInsertLatency = this.metrics.insertEventLatency.length > 0
      ? this.metrics.insertEventLatency.reduce((a, b) => a + b, 0) / this.metrics.insertEventLatency.length
      : 0;

    const averageAutofixDuration = this.metrics.autofixDuration.length > 0
      ? this.metrics.autofixDuration.reduce((a, b) => a + b, 0) / this.metrics.autofixDuration.length
      : 0;

    const averageDispatchDuration = this.metrics.dispatchDuration.length > 0
      ? this.metrics.dispatchDuration.reduce((a, b) => a + b, 0) / this.metrics.dispatchDuration.length
      : 0;

    const errorRate = this.metrics.ticketsProcessed > 0
      ? this.metrics.errors.length / this.metrics.ticketsProcessed
      : 0;

    // Letzte 10 Fehler
    const recentErrors = this.metrics.errors.slice(-10);

    return {
      ...this.metrics,
      autopatchSuccessRate,
      averageInsertLatency,
      averageAutofixDuration,
      averageDispatchDuration,
      errorRate,
      recentErrors,
    };
  }

  /**
   * Gibt Metrics im Prometheus-Format zurück
   */
  getPrometheusMetrics(): string {
    const metrics = this.getMetrics();
    
    return `# HELP support_tickets_processed_total Total number of tickets processed
# TYPE support_tickets_processed_total counter
support_tickets_processed_total ${metrics.ticketsProcessed}

# HELP support_autopatch_success_total Total number of successful autopatches
# TYPE support_autopatch_success_total counter
support_autopatch_success_total ${metrics.autopatchSuccess}

# HELP support_autopatch_failed_total Total number of failed autopatches
# TYPE support_autopatch_failed_total counter
support_autopatch_failed_total ${metrics.autopatchFailed}

# HELP support_autopatch_success_rate Autopatch success rate (0-1)
# TYPE support_autopatch_success_rate gauge
support_autopatch_success_rate ${metrics.autopatchSuccessRate}

# HELP support_insert_event_latency_seconds Average latency for INSERT events
# TYPE support_insert_event_latency_seconds gauge
support_insert_event_latency_seconds ${metrics.averageInsertLatency / 1000}

# HELP support_autofix_duration_seconds Average duration for AutoFix execution
# TYPE support_autofix_duration_seconds gauge
support_autofix_duration_seconds ${metrics.averageAutofixDuration / 1000}

# HELP support_dispatch_duration_seconds Average duration for dispatch
# TYPE support_dispatch_duration_seconds gauge
support_dispatch_duration_seconds ${metrics.averageDispatchDuration / 1000}

# HELP support_error_rate Error rate (errors per ticket)
# TYPE support_error_rate gauge
support_error_rate ${metrics.errorRate}
`;
  }

  /**
   * Setzt alle Metrics zurück (für Tests)
   */
  reset(): void {
    this.metrics = {
      ticketsProcessed: 0,
      autopatchSuccess: 0,
      autopatchFailed: 0,
      insertEventLatency: [],
      autofixDuration: [],
      dispatchDuration: [],
      errors: [],
    };
  }
}

// Singleton-Instanz
export const metricsCollector = new MetricsCollector();

