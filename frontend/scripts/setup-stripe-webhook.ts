/**
 * Script zum Erstellen eines Stripe Webhook-Endpoints
 * 
 * Verwendung:
 *   npx tsx scripts/setup-stripe-webhook.ts
 * 
 * Oder mit ts-node:
 *   npx ts-node scripts/setup-stripe-webhook.ts
 */

import Stripe from 'stripe';

// Environment Variables laden
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://whatsapp.owona.de/api/payments/stripe/webhook';

if (!STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY ist nicht gesetzt!');
  console.error('Bitte setze STRIPE_SECRET_KEY in deinen Environment Variables.');
  process.exit(1);
}

// Stripe Client initialisieren
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-10-29.clover' as any,
});

// Webhook Events, die wir empfangen wollen
const WEBHOOK_EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'payment_intent.canceled',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
];

async function createWebhookEndpoint() {
  try {
    console.log('🔧 Erstelle Stripe Webhook-Endpoint...');
    console.log(`📍 URL: ${WEBHOOK_URL}`);
    console.log(`📋 Events: ${WEBHOOK_EVENTS.join(', ')}`);
    console.log('');

    // Prüfe ob bereits ein Webhook mit dieser URL existiert
    const existingEndpoints = await stripe.webhookEndpoints.list({
      limit: 100,
    });

    const existingEndpoint = existingEndpoints.data.find(
      (endpoint) => endpoint.url === WEBHOOK_URL
    );

    if (existingEndpoint) {
      console.log('⚠️  Webhook-Endpoint existiert bereits!');
      console.log(`   ID: ${existingEndpoint.id}`);
      console.log(`   URL: ${existingEndpoint.url}`);
      console.log(`   Status: ${existingEndpoint.status}`);
      console.log('');
      console.log('📋 Signing Secret:');
      console.log(`   ${existingEndpoint.secret || 'Nicht verfügbar (bitte im Dashboard prüfen)'}`);
      console.log('');
      console.log('💡 Um den Webhook zu aktualisieren, lösche ihn zuerst im Dashboard oder verwende:');
      console.log(`   stripe webhook_endpoints update ${existingEndpoint.id} --enabled-events ${WEBHOOK_EVENTS.join(',')}`);
      return;
    }

    // Erstelle neuen Webhook-Endpoint
    const webhookEndpoint = await stripe.webhookEndpoints.create({
      url: WEBHOOK_URL,
      enabled_events: WEBHOOK_EVENTS,
      description: 'WhatsApp Bot Builder - Payment Webhook',
      metadata: {
        app: 'whatsapp-bot-builder',
        created_by: 'setup-script',
      },
    });

    console.log('✅ Webhook-Endpoint erfolgreich erstellt!');
    console.log('');
    console.log('📋 Details:');
    console.log(`   ID: ${webhookEndpoint.id}`);
    console.log(`   URL: ${webhookEndpoint.url}`);
    console.log(`   Status: ${webhookEndpoint.status}`);
    console.log(`   Events: ${webhookEndpoint.enabled_events.join(', ')}`);
    console.log('');
    console.log('🔐 Signing Secret:');
    console.log(`   ${webhookEndpoint.secret}`);
    console.log('');
    console.log('⚠️  WICHTIG: Kopiere den Signing Secret und füge ihn zu deinen Environment Variables hinzu:');
    console.log(`   STRIPE_WEBHOOK_SECRET=${webhookEndpoint.secret}`);
    console.log('');
    console.log('✅ Webhook ist jetzt aktiv und empfängt Events!');
  } catch (error: any) {
    console.error('❌ Fehler beim Erstellen des Webhook-Endpoints:');
    console.error(error.message);
    
    if (error.type === 'StripeInvalidRequestError') {
      console.error('');
      console.error('💡 Mögliche Lösungen:');
      console.error('   1. Prüfe ob die URL öffentlich erreichbar ist (HTTPS erforderlich)');
      console.error('   2. Prüfe ob du die richtigen API-Keys verwendest (Test vs. Live)');
      console.error('   3. Prüfe ob du Admin-Rechte in deinem Stripe Account hast');
    }
    
    process.exit(1);
  }
}

// Script ausführen
createWebhookEndpoint();

