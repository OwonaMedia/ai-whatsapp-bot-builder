/**
 * Quick Script zum Erstellen eines Stripe Webhook-Endpoints
 * Verwendet die Stripe API direkt
 */

const https = require('https');

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_REDACTED_FOR_SECURITY';
const WEBHOOK_URL = 'https://whatsapp.owona.de/api/payments/stripe/webhook';

const events = [
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'payment_intent.canceled',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
];

const postData = new URLSearchParams();
postData.append('url', WEBHOOK_URL);
postData.append('description', 'WhatsApp Bot Builder - Payment Webhook');
events.forEach(event => {
  postData.append('enabled_events[]', event);
});

const options = {
  hostname: 'api.stripe.com',
  port: 443,
  path: '/v1/webhook_endpoints',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': postData.toString().length,
  },
};

console.log('🔧 Erstelle Stripe Webhook-Endpoint...');
console.log(`📍 URL: ${WEBHOOK_URL}`);
console.log(`📋 Events: ${events.join(', ')}`);
console.log('');

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      if (response.error) {
        console.error('❌ Fehler:', response.error.message);
        if (response.error.code === 'resource_already_exists') {
          console.log('\n💡 Webhook existiert bereits. Prüfe das Dashboard:');
          console.log('   https://dashboard.stripe.com/webhooks');
        }
        process.exit(1);
      }

      console.log('✅ Webhook-Endpoint erfolgreich erstellt!');
      console.log('');
      console.log('📋 Details:');
      console.log(`   ID: ${response.id}`);
      console.log(`   URL: ${response.url}`);
      console.log(`   Status: ${response.status}`);
      console.log('');
      console.log('🔐 Signing Secret:');
      console.log(`   ${response.secret}`);
      console.log('');
      console.log('⚠️  WICHTIG: Falls der Secret anders ist als in deinen Environment Variables, aktualisiere sie!');
      console.log(`   Aktuell gesetzt: whsec_jCwvAuy7tcmuVeRlQQica37xNgeBaXvB`);
      console.log(`   Neuer Secret: ${response.secret}`);
      console.log('');
      console.log('✅ Webhook ist jetzt aktiv und empfängt Events!');
    } catch (error) {
      console.error('❌ Fehler beim Parsen der Antwort:', error.message);
      console.error('Response:', data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Fehler bei der Anfrage:', error.message);
  process.exit(1);
});

req.write(postData.toString());
req.end();

