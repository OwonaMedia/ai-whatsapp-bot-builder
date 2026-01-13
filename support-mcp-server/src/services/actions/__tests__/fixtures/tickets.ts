/**
 * Test Ticket Fixtures
 * 
 * Enthält Test-Tickets für alle Problem-Typen
 */

import type { MinimalTicket } from '../../autopatchPatterns.js';

// Positive Test-Cases (Problem existiert)
export const POSITIVE_TICKETS: Record<string, MinimalTicket> = {
  pdfUploadWorkerNotFound: {
    id: 'ticket-pdf-001',
    title: 'PDF Upload funktioniert nicht - Worker-Modul nicht gefunden',
    description: 'Beim Hochladen einer PDF-Datei erscheint der Fehler "Cannot find module pdf.worker.mjs". Der Upload schlägt fehl.',
    status: 'new',
    priority: 'high',
    category: 'technical',
  },

  pm2RestartRequired: {
    id: 'ticket-pm2-001',
    title: 'WhatsApp Bot reagiert nicht - PM2 Restart erforderlich',
    description: 'Der WhatsApp Bot reagiert nicht mehr auf Nachrichten. PM2 Prozess muss neu gestartet werden.',
    status: 'new',
    priority: 'high',
    category: 'technical',
  },

  missingStripeKey: {
    id: 'ticket-env-001',
    title: 'Zahlung schlägt fehl - Stripe Key fehlt',
    description: 'Bei der Zahlung mit Stripe erscheint der Fehler "STRIPE_SECRET_KEY is not defined". Zahlungen funktionieren nicht.',
    status: 'new',
    priority: 'high',
    category: 'payment',
  },

  apiEndpointMissing: {
    id: 'ticket-api-001',
    title: 'Payment API Endpoint fehlt',
    description: 'Der Endpoint /api/payments/checkout existiert nicht. Zahlungen können nicht verarbeitet werden.',
    status: 'new',
    priority: 'high',
    category: 'payment',
  },

  databaseRlsPolicyMissing: {
    id: 'ticket-db-001',
    title: 'Zugriff auf Knowledge Base verweigert - Database RLS Policy fehlt',
    description: 'Beim Zugriff auf die Knowledge Base erscheint der Fehler "new row violates row-level security policy". Database RLS Policy fehlt. Daten können nicht abgerufen werden.',
    status: 'new',
    priority: 'high',
    category: 'technical',
  },

  frontendComponentMissing: {
    id: 'ticket-frontend-001',
    title: 'Checkout-Komponente fehlt',
    description: 'Die Checkout-Komponente wird nicht gefunden. Die Zahlungsseite kann nicht angezeigt werden.',
    status: 'new',
    priority: 'high',
    category: 'frontend',
  },
};

// Negative Test-Cases (Problem existiert nicht)
export const NEGATIVE_TICKETS: Record<string, MinimalTicket> = {
  noProblem: {
    id: 'ticket-negative-001',
    title: 'Alles funktioniert gut',
    description: 'Das System funktioniert einwandfrei. Keine Probleme.',
    status: 'new',
    priority: 'low',
    category: 'other',
  },

  unrelatedIssue: {
    id: 'ticket-negative-002',
    title: 'Frage zur Dokumentation',
    description: 'Ich habe eine Frage zur API-Dokumentation. Wo finde ich die Details?',
    status: 'new',
    priority: 'low',
    category: 'question',
  },
};

// Edge-Cases (mehrdeutige Beschreibungen)
export const EDGE_CASE_TICKETS: Record<string, MinimalTicket> = {
  ambiguousDescription: {
    id: 'ticket-edge-001',
    title: 'Etwas funktioniert nicht',
    description: 'Es gibt ein Problem, aber ich weiß nicht genau was. Vielleicht PDF oder Payment?',
    status: 'new',
    priority: 'medium',
    category: 'technical',
  },

  multipleIssues: {
    id: 'ticket-edge-002',
    title: 'Mehrere Probleme',
    description: 'PDF Upload funktioniert nicht UND Payment schlägt fehl. Beide Probleme müssen behoben werden.',
    status: 'new',
    priority: 'high',
    category: 'technical',
  },

  vagueError: {
    id: 'ticket-edge-003',
    title: 'Fehler beim Hochladen',
    description: 'Beim Hochladen passiert etwas. Der Fehler ist unklar.',
    status: 'new',
    priority: 'medium',
    category: 'technical',
  },
};

// Alle Test-Tickets
export const ALL_TEST_TICKETS = {
  ...POSITIVE_TICKETS,
  ...NEGATIVE_TICKETS,
  ...EDGE_CASE_TICKETS,
};

