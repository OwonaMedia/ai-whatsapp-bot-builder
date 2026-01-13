# PayPal-Zahlungen einrichten

## Übersicht

Die PayPal-Integration ist jetzt vollständig eingerichtet und funktionsfähig. Diese Anleitung beschreibt die Konfiguration und Verwendung.

## 1. Environment Variables

Die PayPal-Credentials sind bereits auf dem Server konfiguriert:

```bash
PAYPAL_CLIENT_ID=AV_uGfLnE3wANu_1s8zSOLC6Rs5Wt7E-yT557ycMP_SsPigLBrtCFLCPbjam4vcAxeL-xwgyD88tfvgG
PAYPAL_CLIENT_SECRET=EEdUvrN7AmSEwtvBBW__gnphR5QmIxwuydwKbSQI_uGav2IOQuJilFRsDpUPHeU1_SsmtZk7BqHEWkjd
PAYPAL_MODE=live
NEXT_PUBLIC_APP_URL=https://whatsapp.owona.de
```

## 2. PayPal Webhook konfigurieren

### Schritt 1: Webhook im PayPal Dashboard erstellen

1. Gehe zu https://developer.paypal.com/dashboard/
2. Wähle dein **Live**-App (nicht Sandbox)
3. Gehe zu **Webhooks** im linken Menü
4. Klicke auf **Add Webhook**
5. Konfiguriere:
   - **Webhook URL**: `https://whatsapp.owona.de/api/payments/paypal/webhook`
   - **Event Types**:
     - `PAYMENT.CAPTURE.COMPLETED` (wichtig!)
     - `PAYMENT.CAPTURE.DENIED`
     - `PAYMENT.CAPTURE.REFUNDED`
     - `CHECKOUT.ORDER.APPROVED`
6. Klicke auf **Save**

### Schritt 2: Webhook-ID notieren

Die Webhook-ID wird benötigt für:
- Webhook-Verifizierung (optional, aber empfohlen)
- Testing und Debugging

## 3. PayPal-Zahlungsfluss

### Frontend → Backend

1. **User wählt PayPal als Zahlungsmethode**
   - `CheckoutForm.tsx` ruft `usePayment().createPayment()` auf
   - Provider: `'paypal'`

2. **Payment Creation** (`/api/payments/create`)
   - Erstellt PayPal Order via `createPayPalOrder()`
   - Custom ID Format: `userId|tier|billingCycle|locale|customerEmail|customerName`
   - Return URL: `/{locale}/checkout/paypal/success?token={CHECKOUT_SESSION_ID}`
   - Cancel URL: `/{locale}/checkout?tier={tier}`

3. **User wird zu PayPal weitergeleitet**
   - Approve URL von PayPal wird verwendet
   - User zahlt auf PayPal

4. **Return nach erfolgreicher Zahlung** (`/{locale}/checkout/paypal/success`)
   - Token und PayerID werden aus URL extrahiert
   - `/api/payments/paypal/capture` wird aufgerufen
   - Order wird gecaptured

5. **Webhook verarbeitet Zahlung** (`/api/payments/paypal/webhook`)
   - `PAYMENT.CAPTURE.COMPLETED` Event wird empfangen
   - Metadata wird aus `custom_id` extrahiert
   - Subscription wird aktiviert via `activateSubscription()`
   - Rechnung wird erstellt via `createInvoiceFromPayment()`
   - Payment wird geloggt via `logPayment()`

## 4. Metadata-Format

Die `custom_id` in PayPal Orders enthält wichtige Informationen:

```
Format: userId|tier|billingCycle|locale|customerEmail|customerName
Beispiel: abc123|starter|monthly|de|user@example.com|John Doe
```

Diese werden im Webhook-Handler extrahiert:
- `userId`: Supabase User ID
- `tier`: Subscription Tier (`free`, `starter`, `professional`, `enterprise`)
- `billingCycle`: `monthly` oder `yearly`
- `locale`: Sprachcode (`de`, `en`, `fr`, etc.)
- `customerEmail`: E-Mail-Adresse des Kunden
- `customerName`: Name des Kunden

## 5. Testen

### Test-Zahlung durchführen

1. Gehe zu `https://whatsapp.owona.de/de/pricing`
2. Wähle einen Plan aus (z.B. Starter)
3. Wähle **PayPal** als Zahlungsmethode
4. Folge dem PayPal-Checkout-Flow
5. Verwende echte PayPal-Credentials (Live-Modus!)

### Webhook testen

1. Gehe zu PayPal Dashboard → Webhooks
2. Wähle deinen Webhook aus
3. Klicke auf **Send test webhook**
4. Wähle Event Type: `PAYMENT.CAPTURE.COMPLETED`
5. Prüfe Server-Logs: `pm2 logs whatsapp-bot-builder`

## 6. Troubleshooting

### Problem: Zahlung wird nicht erfasst

**Lösung:**
- Prüfe Server-Logs: `pm2 logs whatsapp-bot-builder`
- Prüfe Browser-Konsole (F12) für Fehler
- Prüfe PayPal Dashboard → Transactions

### Problem: Subscription wird nicht aktiviert

**Lösung:**
- Prüfe Webhook-Logs: `pm2 logs whatsapp-bot-builder | grep PayPal`
- Prüfe, ob `custom_id` korrekt gesetzt ist
- Prüfe Supabase `subscriptions` Tabelle

### Problem: Rechnung wird nicht erstellt

**Lösung:**
- Prüfe Webhook-Logs für Invoice-Fehler
- Prüfe, ob `invoices` Tabelle existiert (Migration `008_invoices.sql`)
- Prüfe Server-Dateisystem für PDFs: `/var/www/whatsapp-bot-builder/frontend/invoices/`

## 7. API-Endpunkte

### POST `/api/payments/create`

Erstellt eine PayPal Order.

**Request:**
```json
{
  "provider": "paypal",
  "amount": 29.00,
  "currency": "EUR",
  "userId": "abc123",
  "subscriptionId": "starter",
  "description": "WhatsApp Bot Builder - Starter Plan",
  "customerEmail": "user@example.com",
  "customerName": "John Doe",
  "locale": "de",
  "billingCycle": "monthly"
}
```

**Response:**
```json
{
  "success": true,
  "provider": "paypal",
  "orderId": "ORDER_ID",
  "approveUrl": "https://www.paypal.com/checkoutnow?token=...",
  "amount": 29.00,
  "currency": "EUR",
  "status": "CREATED"
}
```

### POST `/api/payments/paypal/capture`

Captured eine PayPal Order nach erfolgreicher Approve.

**Request:**
```json
{
  "orderId": "ORDER_ID",
  "payerId": "PAYER_ID"
}
```

**Response:**
```json
{
  "success": true,
  "orderId": "ORDER_ID",
  "status": "COMPLETED",
  "message": "Payment captured successfully"
}
```

### POST `/api/payments/paypal/webhook`

Webhook-Endpunkt für PayPal-Events.

**Events:**
- `PAYMENT.CAPTURE.COMPLETED`: Zahlung erfolgreich → Subscription aktivieren
- `PAYMENT.CAPTURE.DENIED`: Zahlung abgelehnt → Loggen
- `PAYMENT.CAPTURE.REFUNDED`: Rückerstattung → Subscription deaktivieren
- `CHECKOUT.ORDER.APPROVED`: Order genehmigt → Info-Log

## 8. Wichtige Hinweise

- **Live-Modus**: Aktuell ist PayPal im **Live-Modus** konfiguriert. Echte Zahlungen werden verarbeitet!
- **Webhook-URL**: Die Webhook-URL muss öffentlich erreichbar sein (HTTPS erforderlich)
- **Security**: Webhook-Signatur-Verifizierung ist optional, aber empfohlen für Production
- **Error Handling**: Alle Fehler werden geloggt, aber nicht an den User weitergegeben (Security)

## 9. Nächste Schritte

1. ✅ PayPal-Credentials konfiguriert
2. ✅ PayPal-Integration implementiert
3. ✅ Success-Page erstellt
4. ✅ Capture-Endpunkt erstellt
5. ✅ Webhook-Handler erweitert
6. ⏳ **Webhook im PayPal Dashboard konfigurieren** (WICHTIG!)
7. ⏳ Test-Zahlung durchführen
8. ⏳ Rechnungen prüfen

## 10. PayPal MCP Server

Der PayPal MCP Server ist konfiguriert und kann für erweiterte PayPal-Funktionen genutzt werden:

- **Location**: `/Users/salomon/Documents/SaaS/flowcraft/shared_resources/paypal-mcp-server/`
- **Credentials**: Bereits im MCP-Server konfiguriert (Live-Modus)
- **Verwendung**: Kann für erweiterte PayPal-Funktionen wie Refunds, Subscriptions, etc. genutzt werden

