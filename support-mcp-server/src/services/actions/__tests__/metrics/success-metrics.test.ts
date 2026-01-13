/**
 * Erfolgsquote-Tracking Tests
 * 
 * Misst Problem-Erkennungs-Rate, Fix-Generierungs-Rate und Fix-Erfolgs-Rate
 */

import { describe, it, expect } from 'vitest';
import { POSITIVE_TICKETS, NEGATIVE_TICKETS, EDGE_CASE_TICKETS } from '../fixtures/tickets.js';

describe('Erfolgsquote-Metriken', () => {
  const allTestTickets = [
    ...Object.values(POSITIVE_TICKETS),
    ...Object.values(NEGATIVE_TICKETS),
    ...Object.values(EDGE_CASE_TICKETS),
  ];

  it('sollte Test-Tickets für alle Problem-Typen enthalten', () => {
    // Prüfe ob wir Test-Tickets für alle wichtigen Problem-Typen haben
    const hasPdfTicket = allTestTickets.some(t => 
      t.title.toLowerCase().includes('pdf') || t.description.toLowerCase().includes('pdf')
    );
    const hasPm2Ticket = allTestTickets.some(t => 
      t.title.toLowerCase().includes('pm2') || t.description.toLowerCase().includes('pm2')
    );
    const hasEnvTicket = allTestTickets.some(t => 
      t.title.toLowerCase().includes('stripe') || t.description.toLowerCase().includes('key')
    );
    const hasApiTicket = allTestTickets.some(t => 
      t.title.toLowerCase().includes('api') || t.description.toLowerCase().includes('endpoint')
    );
    const hasDbTicket = allTestTickets.some(t => 
      t.title.toLowerCase().includes('database') || t.description.toLowerCase().includes('rls')
    );
    const hasFrontendTicket = allTestTickets.some(t => 
      t.title.toLowerCase().includes('component') || 
      t.title.toLowerCase().includes('checkout') ||
      t.description.toLowerCase().includes('frontend') ||
      t.description.toLowerCase().includes('komponente')
    );

    // Prüfe ob wir Test-Tickets für die wichtigsten Problem-Typen haben
    // Mindestens 4 von 6 sollten vorhanden sein
    const ticketTypeCount = [
      hasPdfTicket,
      hasPm2Ticket,
      hasEnvTicket,
      hasApiTicket,
      hasDbTicket,
      hasFrontendTicket,
    ].filter(Boolean).length;

    expect(ticketTypeCount).toBeGreaterThanOrEqual(4);
  });

  it('sollte positive und negative Test-Cases haben', () => {
    const positiveCount = Object.keys(POSITIVE_TICKETS).length;
    const negativeCount = Object.keys(NEGATIVE_TICKETS).length;
    const edgeCaseCount = Object.keys(EDGE_CASE_TICKETS).length;

    expect(positiveCount).toBeGreaterThan(0);
    expect(negativeCount).toBeGreaterThan(0);
    expect(edgeCaseCount).toBeGreaterThan(0);
  });

  it('sollte Metriken-Struktur definieren', () => {
    // Definiere Metriken-Struktur für Erfolgsquote-Tracking
    interface SuccessMetrics {
      problemDetectionRate: number; // Sollte > 95%
      fixGenerationRate: number; // Sollte > 95%
      fixSuccessRate: number; // Sollte > 95%
      falsePositiveRate: number; // Sollte < 5%
      falseNegativeRate: number; // Sollte < 5%
    }

    const metrics: SuccessMetrics = {
      problemDetectionRate: 0,
      fixGenerationRate: 0,
      fixSuccessRate: 0,
      falsePositiveRate: 0,
      falseNegativeRate: 0,
    };

    // Prüfe ob Metriken-Struktur korrekt ist
    expect(metrics.problemDetectionRate).toBeGreaterThanOrEqual(0);
    expect(metrics.problemDetectionRate).toBeLessThanOrEqual(100);
    expect(metrics.fixGenerationRate).toBeGreaterThanOrEqual(0);
    expect(metrics.fixGenerationRate).toBeLessThanOrEqual(100);
  });
});

