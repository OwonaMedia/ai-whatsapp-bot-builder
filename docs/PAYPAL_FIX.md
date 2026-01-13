# PayPal Fehler behoben

## Problem

Bei PayPal-Zahlungen erschien die Fehlermeldung:
```
Zahlung fehlgeschlagen
Failed to create payment
```

## Ursachen

### 1. Ungültige Return-URL

**Fehler**: 
```
"field":"/application_context/return_url",
"value":"https://whatsapp.owona.de/checkout/success?session_id={CHECKOUT_SESSION_ID}",
"issue":"INVALID_PARAMETER_SYNTAX"
```

**Problem**: PayPal akzeptiert keine Platzhalter wie `{CHECKOUT_SESSION_ID}` in der Return-URL.

**Lösung**: Return-URL geändert zu:
```
https://whatsapp.owona.de/{locale}/checkout/paypal/success
```

PayPal fügt automatisch `?token=ORDER_ID&PayerID=PAYER_ID` hinzu.

### 2. Environment Variables nicht geladen

**Problem**: pm2 hat die `.env.local` nicht korrekt geladen.

**Lösung**: 
- App mit `pm2 stop` und `pm2 start` neu gestartet
- Alte Instanz (ID 49) gelöscht
- Neue Instanz (ID 50) läuft mit korrekten Environment Variables

## Änderungen

### `/api/payments/create/route.ts`

**Vorher**:
```typescript
const finalReturnUrl = returnUrl || `${appUrl}/${locale || 'de'}/checkout/paypal/success?session_id={CHECKOUT_SESSION_ID}`;
```

**Nachher**:
```typescript
const finalReturnUrl = returnUrl || `${appUrl}/${locale || 'de'}/checkout/paypal/success`;
```

### PayPal Success Handler (`/checkout/paypal/success/page.tsx`)

Extrahiert `token` (Order-ID) und `PayerID` aus URL-Parametern:
```typescript
const token = searchParams.get('token');
const payerId = searchParams.get('PayerID');
```

## PayPal-Zahlungsfluss

### 1. Zahlung erstellen (`/api/payments/create`)
```
POST /api/payments/create
{
  provider: "paypal",
  amount: 99,
  currency: "EUR",
  userId: "...",
  subscriptionId: "professional",
  locale: "de",
  billingCycle: "monthly"
}

Response:
{
  success: true,
  provider: "paypal",
  orderId: "ORDER_ID",
  approveUrl: "https://www.paypal.com/checkoutnow?token=ORDER_ID"
}
```

### 2. Weiterleitung zu PayPal
```
User wird zu approveUrl weitergeleitet
User zahlt bei PayPal
```

### 3. Rückkehr zur App
```
PayPal leitet weiter zu:
https://whatsapp.owona.de/de/checkout/paypal/success?token=ORDER_ID&PayerID=PAYER_ID
```

### 4. Order Capture (`/api/payments/paypal/capture`)
```
POST /api/payments/paypal/capture
{
  orderId: "ORDER_ID",
  payerId: "PAYER_ID"
}

Response:
{
  success: true,
  orderId: "ORDER_ID",
  status: "COMPLETED"
}
```

### 5. Webhook verarbeitet Event (`/api/payments/paypal/webhook`)
```
PayPal sendet:
Event: PAYMENT.CAPTURE.COMPLETED

Handler:
- Extrahiert Metadata aus custom_id
- Aktiviert Subscription
- Erstellt Rechnung
- Loggt Zahlung
```

## Testing

### Test-Ablauf

1. Gehe zu: `https://whatsapp.owona.de/de/pricing`
2. Klicke auf "Jetzt upgraden" bei Professional
3. Wähle **PayPal** als Zahlungsmethode
4. Klicke auf "Weiter"
5. Du wirst zu PayPal weitergeleitet ✅
6. Melde dich bei PayPal an
7. Bestätige die Zahlung
8. Du wirst zurück zur App geleitet ✅
9. Order wird automatisch captured ✅
10. Webhook aktiviert Subscription ✅
11. Rechnung wird erstellt ✅
12. Weiterleitung zum Dashboard ✅

### Erwartete Logs

```
[PayPal Payment Create] Creating order...
[PayPal] Order created: ORDER_ID
[PayPal Capture] Order captured successfully: ORDER_ID
[PayPal Webhook] Payment capture completed: CAPTURE_ID
[PayPal Webhook] Successfully activated subscription for user USER_ID
[PayPal Webhook] Invoice created for user USER_ID
```

## Verifikation

Nach erfolgreicher Zahlung prüfen:

### 1. Supabase `subscriptions` Tabelle
```sql
SELECT * FROM subscriptions WHERE user_id = 'USER_ID';
```

Erwartete Werte:
- `tier`: 'professional'
- `status`: 'active'
- `payment_provider`: 'paypal'
- `payment_provider_subscription_id`: CAPTURE_ID

### 2. Supabase `invoices` Tabelle
```sql
SELECT * FROM invoices WHERE user_id = 'USER_ID' ORDER BY created_at DESC LIMIT 1;
```

Erwartete Werte:
- `invoice_number`: '2025-0001' (Format: YYYY-NNNN)
- `amount`: 99.00
- `currency`: 'EUR'
- `payment_provider`: 'paypal'
- `pdf_path`: '/var/www/.../invoices/invoice_2025_0001.pdf'

### 3. Server-Dateisystem
```bash
ls -la /var/www/whatsapp-bot-builder/frontend/invoices/
```

Erwartete Datei:
- `invoice_2025_NNNN.pdf`

## Status

- ✅ Return-URL korrigiert
- ✅ App neu gestartet
- ✅ PayPal SDK funktioniert
- ✅ Environment Variables geladen
- ✅ Webhook aktiv (ID: 4NH36978YY491414D)
- ⏳ Bereit für Test-Zahlung

## Nächste Schritte

1. Teste PayPal-Zahlung auf `https://whatsapp.owona.de/de/pricing`
2. Prüfe Server-Logs während der Zahlung
3. Verifiziere Subscription-Aktivierung
4. Prüfe Rechnung im Dashboard (sobald implementiert)

