/**
 * Event-Deduplizierung für Realtime-Events
 * Verhindert doppelte Verarbeitung von Events
 */

export class EventDeduplicator {
  private processed = new Map<string, Date>();
  private readonly ttlMs: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(ttlMs: number = 60000) {
    this.ttlMs = ttlMs;
    // Cleanup alle 5 Minuten
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Prüft, ob ein Event bereits verarbeitet wurde
   */
  isDuplicate(eventId: string): boolean {
    const processed = this.processed.get(eventId);
    if (!processed) {
      return false;
    }
    
    // Event ist abgelaufen
    if (Date.now() - processed.getTime() > this.ttlMs) {
      this.processed.delete(eventId);
      return false;
    }
    
    return true;
  }

  /**
   * Markiert ein Event als verarbeitet
   */
  markProcessed(eventId: string): void {
    this.processed.set(eventId, new Date());
  }

  /**
   * Generiert eine eindeutige Event-ID
   */
  generateEventId(ticketId: string, eventType: string, timestamp?: number): string {
    const ts = timestamp ?? Date.now();
    return `${eventType}:${ticketId}:${ts}`;
  }

  /**
   * Bereinigt abgelaufene Events
   */
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [id, timestamp] of this.processed.entries()) {
      if (now - timestamp.getTime() > this.ttlMs) {
        this.processed.delete(id);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[EventDeduplicator] Cleaned up ${cleaned} expired events`);
    }
  }

  /**
   * Gibt Statistiken zurück
   */
  getStats(): { total: number; oldest: Date | null } {
    let oldest: Date | null = null;
    
    for (const timestamp of this.processed.values()) {
      if (!oldest || timestamp < oldest) {
        oldest = timestamp;
      }
    }
    
    return {
      total: this.processed.size,
      oldest,
    };
  }

  /**
   * Bereinigt alle Events (für Tests)
   */
  clear(): void {
    this.processed.clear();
  }

  /**
   * Stoppt den Cleanup-Interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

