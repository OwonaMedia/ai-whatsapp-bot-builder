#!/usr/bin/env node
/**
 * PayPal Webhook programmatisch erstellen
 * 
 * Dieses Script erstellt einen Webhook über die PayPal API,
 * falls die UI im PayPal Dashboard nicht funktioniert.
 * 
 * Usage:
 *   node scripts/create-paypal-webhook.js
 */

const https = require('https');

// PayPal Credentials (aus Environment Variables oder direkt hier)
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || 'AeAnOdb23ogtaC-w_4vrnJSATXvZVFaCQjXN7YbNIXJ_ow7CRx8nVaVwgx5GdRPzVygs1LXzHH4VgStS';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || 'EA8YDH7zU7KRR7rj8R5m7vebDoT5ouMv8JgHaxk-xJm3IFn567PTGz6xtakqE3EZFZR8VcECM0zreRy3';
const PAYPAL_MODE = process.env.PAYPAL_MODE || 'live';
const WEBHOOK_URL = process.env.NEXT_PUBLIC_APP_URL 
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/paypal/webhook`
  : 'https://whatsapp.owona.de/api/payments/paypal/webhook';

const BASE_URL = PAYPAL_MODE === 'live' 
  ? 'api-m.paypal.com' 
  : 'api-m.sandbox.paypal.com';

/**
 * PayPal Access Token erhalten
 */
async function getAccessToken() {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
    
    const options = {
      hostname: BASE_URL,
      path: '/v1/oauth2/token',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en_US',
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
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
          if (response.access_token) {
            console.log('✅ Access Token erhalten');
            resolve(response.access_token);
          } else {
            reject(new Error('No access token in response'));
          }
        } catch (error) {
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write('grant_type=client_credentials');
    req.end();
  });
}

/**
 * Webhook erstellen
 */
async function createWebhook(accessToken) {
  return new Promise((resolve, reject) => {
    const webhookData = JSON.stringify({
      url: WEBHOOK_URL,
      event_types: [
        { name: 'PAYMENT.CAPTURE.COMPLETED' },
        { name: 'PAYMENT.CAPTURE.DENIED' },
        { name: 'PAYMENT.CAPTURE.REFUNDED' },
        { name: 'CHECKOUT.ORDER.APPROVED' },
      ],
    });
    
    const options = {
      hostname: BASE_URL,
      path: '/v1/notifications/webhooks',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Length': Buffer.byteLength(webhookData),
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
          if (res.statusCode === 201 || res.statusCode === 200) {
            console.log('✅ Webhook erfolgreich erstellt!');
            console.log('\nWebhook Details:');
            console.log('  ID:', response.id);
            console.log('  URL:', response.url);
            console.log('  Events:', response.event_types.map(e => e.name).join(', '));
            resolve(response);
          } else if (res.statusCode === 400 && data.includes('WEBHOOK_URL_ALREADY_EXISTS')) {
            console.log('⚠️  Webhook existiert bereits!');
            console.log('Response:', data);
            resolve({ already_exists: true });
          } else {
            console.error('❌ Fehler beim Erstellen des Webhooks');
            console.error('Status Code:', res.statusCode);
            console.error('Response:', data);
            reject(new Error(`Failed to create webhook: ${data}`));
          }
        } catch (error) {
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.write(webhookData);
    req.end();
  });
}

/**
 * Alle Webhooks auflisten
 */
async function listWebhooks(accessToken) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      path: '/v1/notifications/webhooks',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
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
          if (res.statusCode === 200) {
            console.log('\n📋 Bestehende Webhooks:');
            if (response.webhooks && response.webhooks.length > 0) {
              response.webhooks.forEach((webhook, index) => {
                console.log(`\n  Webhook ${index + 1}:`);
                console.log(`    ID: ${webhook.id}`);
                console.log(`    URL: ${webhook.url}`);
                console.log(`    Events: ${webhook.event_types.map(e => e.name).join(', ')}`);
              });
            } else {
              console.log('  Keine Webhooks gefunden');
            }
            resolve(response.webhooks || []);
          } else {
            console.error('❌ Fehler beim Abrufen der Webhooks');
            console.error('Response:', data);
            reject(new Error(`Failed to list webhooks: ${data}`));
          }
        } catch (error) {
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🚀 PayPal Webhook Setup wird gestartet...\n');
    console.log(`Mode: ${PAYPAL_MODE}`);
    console.log(`Webhook URL: ${WEBHOOK_URL}\n`);
    
    // 1. Access Token erhalten
    console.log('1️⃣  Access Token wird abgerufen...');
    const accessToken = await getAccessToken();
    
    // 2. Bestehende Webhooks auflisten
    console.log('\n2️⃣  Bestehende Webhooks werden geprüft...');
    await listWebhooks(accessToken);
    
    // 3. Neuen Webhook erstellen
    console.log('\n3️⃣  Neuer Webhook wird erstellt...');
    const webhook = await createWebhook(accessToken);
    
    console.log('\n✅ Setup abgeschlossen!');
    console.log('\nNächste Schritte:');
    console.log('1. Teste den Webhook im PayPal Dashboard');
    console.log('2. Führe eine Test-Zahlung durch');
    console.log('3. Prüfe die Server-Logs: pm2 logs whatsapp-bot-builder\n');
  } catch (error) {
    console.error('\n❌ Fehler beim Setup:', error.message);
    console.error('\nBitte prüfe:');
    console.error('1. PayPal Credentials sind korrekt');
    console.error('2. PAYPAL_MODE ist korrekt gesetzt (live oder sandbox)');
    console.error('3. Webhook-URL ist erreichbar');
    console.error('4. Du hast die nötigen Berechtigungen im PayPal Account\n');
    process.exit(1);
  }
}

// Script ausführen
main();

