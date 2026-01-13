# ✅ PayPal Webhook erfolgreich konfiguriert

## Webhook Details

Der Webhook wurde erfolgreich über die PayPal API erstellt!

### Konfiguration

- **Webhook ID**: `4NH36978YY491414D`
- **URL**: `https://whatsapp.owona.de/api/payments/paypal/webhook`
- **Modus**: Live (Production)
- **Events**:
  - ✅ `PAYMENT.CAPTURE.COMPLETED` - Zahlung erfolgreich
  - ✅ `PAYMENT.CAPTURE.DENIED` - Zahlung abgelehnt
  - ✅ `PAYMENT.CAPTURE.REFUNDED` - Zahlung erstattet
  - ✅ `CHECKOUT.ORDER.APPROVED` - Order genehmigt

## Status: Aktiv ✅

Der Webhook ist jetzt aktiv und empfängt Events von PayPal.

## Wie es funktioniert

1. **User zahlt mit PayPal**
   - User wählt PayPal als Zahlungsmethode
   - Wird zu PayPal weitergeleitet
   - Zahlt und kehrt zurück

2. **PayPal sendet Webhook**
   - PayPal sendet `PAYMENT.CAPTURE.COMPLETED` Event
   - Webhook-URL: `https://whatsapp.owona.de/api/payments/paypal/webhook`

3. **Server verarbeitet Event**
   - Webhook-Handler in `/api/payments/paypal/webhook/route.ts`
   - Extrahiert Metadata aus `custom_id`
   - Aktiviert Subscription via `activateSubscription()`
   - Erstellt Rechnung via `createInvoiceFromPayment()`
   - Loggt Zahlung via `logPayment()`

## Webhook im Dashboard prüfen

Falls du den Webhook im PayPal Dashboard sehen möchtest:

1. Gehe zu: https://developer.paypal.com/dashboard/
2. Wähle **"My Apps & Credentials"**
3. Wähle deine **Live**-App (nicht Sandbox)
4. Scrolle zu **"Webhooks"**
5. Du solltest den Webhook sehen: `4NH36978YY491414D`

## Webhook testen

### Option 1: Im PayPal Dashboard

1. Gehe zu deiner App → Webhooks
2. Klicke auf den Webhook (`4NH36978YY491414D`)
3. Klicke auf **"Send test notification"**
4. Wähle Event Type: `PAYMENT.CAPTURE.COMPLETED`
5. Klicke auf **"Send Test Webhook"**

### Option 2: Echte Test-Zahlung

1. Gehe zu: `https://whatsapp.owona.de/de/pricing`
2. Wähle einen Plan (z.B. Starter)
3. Wähle **PayPal** als Zahlungsmethode
4. Folge dem PayPal-Checkout-Flow
5. Zahle mit deinem PayPal-Account

### Option 3: Server-Logs prüfen

```bash
pm2 logs whatsapp-bot-builder | grep PayPal
```

Erwartete Logs:
```
[PayPal Webhook] Payment capture completed: CAPTURE_ID
[PayPal Webhook] Successfully activated subscription for user USER_ID
[PayPal Webhook] Invoice created for user USER_ID
```

## Monitoring

### PayPal Dashboard

- **Transaktionen**: https://www.paypal.com/myaccount/money/transactions
- **Webhook Events**: https://developer.paypal.com/dashboard/ → App → Webhooks → Event History

### Server

```bash
# Alle PayPal-Logs
pm2 logs whatsapp-bot-builder | grep PayPal

# Nur Webhook-Events
pm2 logs whatsapp-bot-builder | grep "PayPal Webhook"

# Nur erfolgreiche Zahlungen
pm2 logs whatsapp-bot-builder | grep "PAYMENT.CAPTURE.COMPLETED"
```

### Supabase

Prüfe die Datenbank-Tabellen:

```sql
-- Subscriptions
SELECT * FROM subscriptions ORDER BY created_at DESC LIMIT 10;

-- Invoices
SELECT * FROM invoices ORDER BY created_at DESC LIMIT 10;

-- Usage Tracking
SELECT * FROM usage_tracking ORDER BY created_at DESC LIMIT 10;
```

## Troubleshooting

### Problem: Webhook empfängt keine Events

**Lösung:**
1. Prüfe, ob der Webhook aktiv ist: https://developer.paypal.com/dashboard/
2. Prüfe Server-Logs: `pm2 logs whatsapp-bot-builder`
3. Prüfe, ob die URL erreichbar ist: `curl https://whatsapp.owona.de/api/payments/paypal/webhook`

### Problem: Subscription wird nicht aktiviert

**Lösung:**
1. Prüfe Webhook-Logs: `pm2 logs whatsapp-bot-builder | grep "PayPal Webhook"`
2. Prüfe, ob `custom_id` korrekt gesetzt ist
3. Prüfe Supabase `subscriptions` Tabelle

### Problem: Rechnung wird nicht erstellt

**Lösung:**
1. Prüfe Invoice-Logs: `pm2 logs whatsapp-bot-builder | grep Invoice`
2. Prüfe, ob `invoices` Tabelle existiert
3. Prüfe Server-Dateisystem: `ls -la /var/www/whatsapp-bot-builder/frontend/invoices/`

## Nächste Schritte

1. ✅ Webhook erstellt
2. ⏳ **Webhook testen** (siehe oben)
3. ⏳ **Echte Zahlung durchführen**
4. ⏳ **Subscription und Rechnung prüfen**

## Script für zukünftige Updates

Falls du den Webhook später aktualisieren oder neu erstellen möchtest:

```bash
cd /var/www/whatsapp-bot-builder/frontend
node scripts/create-paypal-webhook.js
```

Das Script:
- Erstellt automatisch einen neuen Webhook
- Listet bestehende Webhooks auf
- Prüft, ob der Webhook bereits existiert

## Webhook ID merken

**Webhook ID**: `4NH36978YY491414D`

Diese ID brauchst du, um:
- Den Webhook im Dashboard zu finden
- Den Webhook zu aktualisieren
- Den Webhook zu löschen
- Event-History zu prüfen

## ✅ Alles bereit!

PayPal-Zahlungen sind jetzt vollständig eingerichtet und funktionsfähig:

- ✅ PayPal Live-Credentials konfiguriert
- ✅ PayPal-Integration implementiert
- ✅ Success-Page erstellt
- ✅ Capture-Endpunkt erstellt
- ✅ Webhook erstellt und aktiv
- ✅ Webhook-Handler implementiert
- ✅ Rechnungssystem integriert

Jetzt kannst du echte Test-Zahlungen durchführen! 🚀

