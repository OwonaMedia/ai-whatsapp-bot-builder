/**
 * Configuration Fixtures
 * 
 * Enthält Beispiel-Konfigurationen für alle 5 Config-Typen
 */

import type { ConfigurationItem } from '../../reverseEngineeringAnalyzer.js';

export const ENV_VAR_CONFIGS: ConfigurationItem[] = [
  {
    type: 'env_var',
    name: 'STRIPE_SECRET_KEY',
    description: 'Stripe Secret Key für Payment-Integration',
    location: '.env.local',
    potentialIssues: [
      'fehlt in .env.local',
      'ist nicht gesetzt',
      'hat falsches Format',
      'ist abgelaufen',
    ],
    fixStrategies: [
      'Füge STRIPE_SECRET_KEY zu .env.local hinzu',
      'Prüfe Stripe Dashboard für korrekten Key',
      'Validiere Key-Format (sk_test_... oder sk_live_...)',
    ],
  },
  {
    type: 'env_var',
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    description: 'Supabase Service Role Key für Backend-Zugriff',
    location: '.env.local',
    potentialIssues: [
      'fehlt in .env.local',
      'ist nicht gesetzt',
      'hat falsche Berechtigungen',
    ],
    fixStrategies: [
      'Füge SUPABASE_SERVICE_ROLE_KEY zu .env.local hinzu',
      'Prüfe Supabase Dashboard für korrekten Key',
    ],
  },
];

export const API_ENDPOINT_CONFIGS: ConfigurationItem[] = [
  {
    type: 'api_endpoint',
    name: '/api/knowledge/upload',
    description: 'API Endpoint für PDF-Upload',
    location: 'app/api/knowledge/upload/route.ts',
    potentialIssues: [
      'Route-Datei fehlt',
      'POST-Handler fehlt',
      'parsePdfBuffer wird nicht aufgerufen',
      'Error Handling fehlt',
    ],
    fixStrategies: [
      'Erstelle Route-Datei app/api/knowledge/upload/route.ts',
      'Implementiere POST-Handler',
      'Füge parsePdfBuffer-Aufruf hinzu',
      'Implementiere Error Handling',
    ],
  },
  {
    type: 'api_endpoint',
    name: '/api/payments/checkout',
    description: 'API Endpoint für Payment-Checkout',
    location: 'app/api/payments/checkout/route.ts',
    potentialIssues: [
      'Route-Datei fehlt',
      'POST-Handler fehlt',
      'Stripe-Integration fehlt',
      'Webhook-Handler fehlt',
    ],
    fixStrategies: [
      'Erstelle Route-Datei app/api/payments/checkout/route.ts',
      'Implementiere POST-Handler mit Stripe-Integration',
      'Füge Webhook-Handler hinzu',
    ],
  },
];

export const DATABASE_SETTING_CONFIGS: ConfigurationItem[] = [
  {
    type: 'database_setting',
    name: 'knowledge_sources RLS Policy',
    description: 'Row Level Security Policy für knowledge_sources Tabelle',
    location: 'supabase/migrations',
    potentialIssues: [
      'RLS-Policy fehlt',
      'Policy erlaubt keinen Zugriff',
      'Policy hat falsche Bedingungen',
    ],
    fixStrategies: [
      'Erstelle RLS-Policy für knowledge_sources',
      'Prüfe Policy-Bedingungen',
      'Teste Policy mit verschiedenen User-Rollen',
    ],
  },
];

export const FRONTEND_CONFIG_CONFIGS: ConfigurationItem[] = [
  {
    type: 'frontend_config',
    name: 'lib/pdf/parsePdf.ts',
    description: 'PDF-Parsing-Konfiguration',
    location: 'lib/pdf/parsePdf.ts',
    potentialIssues: [
      'Datei fehlt',
      'Worker-Modul-Referenz existiert',
      'pdf-parse Import fehlt',
      'Error Handling fehlt',
    ],
    fixStrategies: [
      'Entferne Worker-Modul-Referenzen',
      'Prüfe pdf-parse Import',
      'Füge Error Handling hinzu',
    ],
  },
  {
    type: 'frontend_config',
    name: 'components/checkout/CheckoutForm.tsx',
    description: 'Checkout-Formular-Komponente',
    location: 'components/checkout/CheckoutForm.tsx',
    potentialIssues: [
      'Komponente fehlt',
      'Stripe-Elemente fehlen',
      'Form-Validation fehlt',
    ],
    fixStrategies: [
      'Erstelle CheckoutForm-Komponente',
      'Füge Stripe-Elemente hinzu',
      'Implementiere Form-Validation',
    ],
  },
];

export const DEPLOYMENT_CONFIG_CONFIGS: ConfigurationItem[] = [
  {
    type: 'deployment_config',
    name: 'PM2 Configuration',
    description: 'PM2 Prozess-Management-Konfiguration',
    location: 'ecosystem.config.js',
    potentialIssues: [
      'PM2 Prozess läuft nicht',
      'Prozess hängt',
      'Prozess startet nicht',
      'Prozess crasht',
    ],
    fixStrategies: [
      'Führe pm2 restart aus',
      'Prüfe PM2 Logs',
      'Validiere ecosystem.config.js',
      'Prüfe Server-Ressourcen',
    ],
  },
  {
    type: 'deployment_config',
    name: 'Docker Configuration',
    description: 'Docker Container-Konfiguration',
    location: 'docker-compose.yml',
    potentialIssues: [
      'Container läuft nicht',
      'Container startet nicht',
      'Container crasht',
    ],
    fixStrategies: [
      'Führe docker restart aus',
      'Prüfe Docker Logs',
      'Validiere docker-compose.yml',
    ],
  },
];

// Alle Konfigurationen
export const ALL_CONFIGS: ConfigurationItem[] = [
  ...ENV_VAR_CONFIGS,
  ...API_ENDPOINT_CONFIGS,
  ...DATABASE_SETTING_CONFIGS,
  ...FRONTEND_CONFIG_CONFIGS,
  ...DEPLOYMENT_CONFIG_CONFIGS,
];

