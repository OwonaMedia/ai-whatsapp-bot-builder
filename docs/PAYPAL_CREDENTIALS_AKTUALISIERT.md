# PayPal Credentials aktualisiert

## ✅ Aktualisierte Credentials

Die PayPal Live-Credentials wurden erfolgreich aktualisiert:

### Server-Konfiguration (`/var/www/whatsapp-bot-builder/frontend/.env.local`)

```bash
PAYPAL_CLIENT_ID=AeAnOdb23ogtaC-w_4vrnJSATXvZVFaCQjXN7YbNIXJ_ow7CRx8nVaVwgx5GdRPzVygs1LXzHH4VgStS
PAYPAL_CLIENT_SECRET=EA8YDH7zU7KRR7rj8R5m7vebDoT5ouMv8JgHaxk-xJm3IFn567PTGz6xtakqE3EZFZR8VcECM0zreRy3
PAYPAL_MODE=live
```

### MCP-Server-Konfiguration (`~/.cursor/mcp.json`)

Die PayPal MCP Server-Konfiguration wurde ebenfalls aktualisiert.

## 🔄 App neu gestartet

Die App wurde mit `--update-env` Flag neu gestartet, um die neuen Environment Variables zu laden.

## 📋 Nächste Schritte

1. ✅ PayPal Credentials aktualisiert
2. ✅ MCP-Server-Konfiguration aktualisiert
3. ✅ App neu gestartet
4. ⏳ **Webhook im PayPal Dashboard konfigurieren** (WICHTIG!)
   - URL: `https://whatsapp.owona.de/api/payments/paypal/webhook`
   - Events: `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`, `PAYMENT.CAPTURE.REFUNDED`, `CHECKOUT.ORDER.APPROVED`
5. ⏳ Test-Zahlung durchführen

## 🔒 Sicherheitshinweis

- Die Credentials sind im Live-Modus aktiv
- Echte Zahlungen werden verarbeitet
- Stelle sicher, dass die Webhook-URL korrekt konfiguriert ist
- Prüfe regelmäßig die PayPal-Transaktionen im Dashboard

## 📝 Webhook-Konfiguration

Gehe zu: https://developer.paypal.com/dashboard/

1. Wähle deine **Live**-App aus (nicht Sandbox)
2. Gehe zu **Webhooks**
3. Erstelle einen neuen Webhook oder bearbeite den bestehenden:
   - **Webhook URL**: `https://whatsapp.owona.de/api/payments/paypal/webhook`
   - **Event Types**:
     - ✅ `PAYMENT.CAPTURE.COMPLETED` (wichtig!)
     - ✅ `PAYMENT.CAPTURE.DENIED`
     - ✅ `PAYMENT.CAPTURE.REFUNDED`
     - ✅ `CHECKOUT.ORDER.APPROVED`
4. Speichere die Konfiguration

## 🧪 Testing

Nach der Webhook-Konfiguration kannst du eine Test-Zahlung durchführen:

1. Gehe zu: `https://whatsapp.owona.de/de/pricing`
2. Wähle einen Plan (z.B. Starter)
3. Wähle **PayPal** als Zahlungsmethode
4. Folge dem PayPal-Checkout-Flow
5. Prüfe die Server-Logs: `pm2 logs whatsapp-bot-builder`
6. Prüfe die Supabase `subscriptions` Tabelle

## 📊 Monitoring

Überwache die PayPal-Zahlungen:

- **PayPal Dashboard**: https://www.paypal.com/myaccount/money/transactions
- **Server-Logs**: `pm2 logs whatsapp-bot-builder | grep PayPal`
- **Supabase**: Prüfe `subscriptions` und `invoices` Tabellen

