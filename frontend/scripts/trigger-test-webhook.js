/**
 * Script zum Senden eines Test-Webhook-Events
 * Erstellt einen Test-Payment Intent, der automatisch ein payment_intent.succeeded Event triggert
 */

const https = require('https');

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_REDACTED_FOR_SECURITY';

console.log('🧪 Erstelle Test-Payment Intent, um Webhook-Event zu triggern...');
console.log('');

// Erstelle einen Payment Intent mit automatischer Bestätigung
const postData = new URLSearchParams();
postData.append('amount', '2900'); // 29.00 EUR
postData.append('currency', 'eur');
postData.append('payment_method', 'pm_card_visa'); // Test Payment Method
postData.append('confirm', 'true');
postData.append('return_url', 'https://whatsapp.owona.de/checkout/success');
postData.append('metadata[test]', 'true');
postData.append('metadata[userId]', 'test-user-' + Date.now());
postData.append('metadata[tier]', 'starter');
postData.append('metadata[billingCycle]', 'monthly');

const options = {
  hostname: 'api.stripe.com',
  port: 443,
  path: '/v1/payment_intents',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': postData.toString().length,
  },
};

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
        console.error('   Code:', response.error.code);
        process.exit(1);
      }

      console.log('✅ Payment Intent erstellt!');
      console.log('');
      console.log('📋 Details:');
      console.log(`   ID: ${response.id}`);
      console.log(`   Amount: ${response.amount / 100} ${response.currency.toUpperCase()}`);
      console.log(`   Status: ${response.status}`);
      console.log('');
      
      if (response.status === 'succeeded') {
        console.log('✅ Payment Intent wurde erfolgreich bestätigt!');
        console.log('   → Stripe sollte jetzt ein payment_intent.succeeded Event an deinen Webhook senden');
        console.log('');
        console.log('🔍 Prüfe im Stripe Dashboard:');
        console.log('   1. Gehe zu: https://dashboard.stripe.com/webhooks');
        console.log('   2. Klicke auf deinen Webhook-Endpoint');
        console.log('   3. Prüfe den "Event deliveries" Tab');
        console.log('   4. Du solltest ein payment_intent.succeeded Event sehen');
        console.log('');
        console.log('📊 Prüfe Server-Logs:');
        console.log('   ssh root@91.99.232.126');
        console.log('   pm2 logs whatsapp-bot-builder');
      } else {
        console.log(`⚠️  Payment Intent Status: ${response.status}`);
        console.log('   Das Event wird möglicherweise nicht sofort getriggert.');
      }
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

