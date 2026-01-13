/**
 * Mock Data
 * 
 * Enthält Mock-Implementierungen für Services
 */

import type { KnowledgeDocument } from '../../../../knowledgeBase.js';
import type { ResolutionAction } from '../../../../llmClient.js';

// Mock Knowledge Documents
export const MOCK_KNOWLEDGE_DOCS: KnowledgeDocument[] = [
  {
    id: 'doc-001',
    title: 'PDF Upload Configuration',
    content: 'PDF Upload verwendet parsePdfBuffer aus lib/pdf/parsePdf.ts. Worker-Modul-Referenzen sollten entfernt werden.',
    metadata: { type: 'configuration' },
  },
  {
    id: 'doc-002',
    title: 'PM2 Deployment',
    content: 'PM2 Prozesse können mit pm2 restart neu gestartet werden. Bei Problemen: pm2 logs prüfen.',
    metadata: { type: 'deployment' },
  },
  {
    id: 'doc-003',
    title: 'Stripe Payment Integration',
    content: 'Stripe erfordert STRIPE_SECRET_KEY in .env.local. Format: sk_test_... oder sk_live_...',
    metadata: { type: 'payment' },
  },
];

// Mock Resolution Actions
export const MOCK_RESOLUTION_ACTIONS: ResolutionAction[] = [
  {
    type: 'code-modify',
    file: 'lib/pdf/parsePdf.ts',
    description: 'Entferne Worker-Modul-Referenzen',
  },
  {
    type: 'hetzner-command',
    command: 'pm2 restart whatsapp-bot-builder',
    description: 'PM2 Prozess neu starten',
  },
  {
    type: 'env-add-placeholder',
    key: 'STRIPE_SECRET_KEY',
    value: 'sk_test_...',
    comment: 'Stripe Secret Key',
    file: '.env.local',
  },
];

