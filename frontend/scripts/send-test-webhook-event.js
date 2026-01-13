/**
 * Script zum Senden eines Test-Webhook-Events an unseren Webhook-Endpoint
 */

const https = require('https');

const WEBHOOK_URL = 'https://whatsapp.owona.de/api/payments/stripe/webhook';
const WEBHOOK_SECRET = 'whsec_xjJ7WnsKcGXYsD3hVnZeIt8t0MgOHnkL';

// Test Event: payment_intent.succeeded
const testEvent = {
  id: 'evt_test_' + Date.now(),
  object: 'event',
  api_version: '2024-11-20.acacia',
  created: Math.floor(Date.now() / 1000),
  data: {
    object: {
      id: 'pi_test_' + Date.now(),
      object: 'payment_intent',
      amount: 2900, // 29.00 EUR
      currency: 'eur',
      status: 'succeeded',
      metadata: {
        userId: 'test-user-' + Date.now(),
        tier: 'starter',
        billingCycle: 'monthly',
        subscriptionId: 'starter',
      },
      customer: 'cus_test_' + Date.now(),
    },
  },
  livemode: false,
  pending_webhooks: 1,
  request: {
    id: 'req_test_' + Date.now(),
    idempotency_key: null,
  },
  type: 'payment_intent.succeeded',
};

// Erstelle Stripe-Signatur (vereinfacht für Test)
// In Production sollte dies mit der Stripe-Bibliothek gemacht werden
const timestamp = Math.floor(Date.now() / 1000);
const payload = JSON.stringify(testEvent);
const signedPayload = `${timestamp}.${payload}`;

// Für echte Tests sollten wir die Stripe CLI verwenden oder die Stripe-Bibliothek
// Dies ist nur ein Beispiel-Script
console.log('🧪 Test-Webhook-Event:');
console.log(`   Type: ${testEvent.type}`);
console.log(`   Payment Intent ID: ${testEvent.data.object.id}`);
console.log(`   Amount: ${testEvent.data.object.amount / 100} ${testEvent.data.object.currency.toUpperCase()}`);
console.log('');
console.log('⚠️  Hinweis: Für echte Tests verwende:');
console.log('   1. Stripe Dashboard → Webhook → "Send test webhook"');
console.log('   2. Stripe CLI: stripe trigger payment_intent.succeeded');
console.log('   3. Oder verwende die Stripe-Bibliothek für Signatur-Generierung');
console.log('');
console.log('📋 Event-Daten:');
console.log(JSON.stringify(testEvent, null, 2));

