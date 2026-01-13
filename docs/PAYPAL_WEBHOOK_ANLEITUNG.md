# PayPal Webhook Konfiguration - Schritt für Schritt

## Problem: Webhook kann nur getestet, aber nicht gespeichert werden

Das passiert, wenn du im falschen Bereich bist. Hier ist die korrekte Anleitung:

## ✅ Richtige Vorgehensweise

### Option 1: REST API Apps (Empfohlen)

1. **Gehe zu PayPal Developer Dashboard**
   - URL: https://developer.paypal.com/dashboard/
   - Stelle sicher, dass du eingeloggt bist

2. **Wähle "Apps & Credentials"**
   - Im linken Menü: **Dashboard** → **My Apps & Credentials**

3. **Wechsle zu "Live"**
   - Oben rechts: Klicke auf **"Live"** (nicht "Sandbox")
   - Wichtig: Du musst im Live-Modus sein!

4. **Wähle oder erstelle deine App**
   - Du solltest eine App sehen (z.B. "Default App" oder deine eigene App)
   - Wenn nicht, klicke auf **"Create App"** und erstelle eine neue App

5. **Scrolle nach unten zu "Webhooks"**
   - In den App-Details gibt es einen Abschnitt **"Webhooks"**
   - Klicke auf **"Add Webhook"**

6. **Webhook konfigurieren**
   - **Webhook URL**: `https://whatsapp.owona.de/api/payments/paypal/webhook`
   - **Event types**: Klicke auf **"Select All Event types"** ODER wähle manuell:
     - ✅ `PAYMENT.CAPTURE.COMPLETED`
     - ✅ `PAYMENT.CAPTURE.DENIED`
     - ✅ `PAYMENT.CAPTURE.REFUNDED`
     - ✅ `CHECKOUT.ORDER.APPROVED`
   - Klicke auf **"Save"**

### Option 2: Über Business Account (Alternative)

Falls Option 1 nicht funktioniert:

1. **Gehe zu PayPal Business Account**
   - URL: https://www.paypal.com/businessmanage/account/aboutBusiness
   - Logge dich in dein **Business Account** ein

2. **Gehe zu Account Settings**
   - Klicke auf das Zahnrad-Symbol (⚙️) oben rechts
   - Wähle **"Account Settings"**

3. **Website Payments**
   - Im linken Menü: **"Website Payments"**
   - Dann: **"Instant Payment Notifications"**

4. **IPN (Instant Payment Notifications) aktivieren**
   - Notification URL: `https://whatsapp.owona.de/api/payments/paypal/webhook`
   - Klicke auf **"Choose IPN Settings"**
   - Aktiviere: **"Receive IPN messages (Enabled)"**
   - Klicke auf **"Save"**

## ⚠️ Häufige Probleme

### Problem 1: "Webhook kann nur getestet werden"

**Ursache**: Du bist im Bereich "Webhooks" im Developer Dashboard, aber nicht in der App-Konfiguration.

**Lösung**: 
- Gehe zu **"My Apps & Credentials"** → Wähle deine App → Scrolle zu "Webhooks"
- NICHT: "Webhooks" im Hauptmenü (das ist nur zum Testen)

### Problem 2: "Save-Button ist nicht da"

**Ursache**: Du hast keine App ausgewählt oder bist im falschen Modus (Sandbox statt Live).

**Lösung**:
- Stelle sicher, dass du im **Live-Modus** bist
- Stelle sicher, dass du eine App ausgewählt hast

### Problem 3: "Access Denied" oder "Unauthorized"

**Ursache**: Dein Account hat nicht die nötigen Berechtigungen.

**Lösung**:
- Stelle sicher, dass du der **Account Owner** bist
- Oder bitte den Account Owner, dir die Berechtigung zu geben

## 🔄 Alternative: Webhooks programmatisch erstellen

Falls die UI nicht funktioniert, können wir den Webhook auch über die PayPal API erstellen:

```bash
# 1. Access Token erhalten
curl -v https://api-m.paypal.com/v1/oauth2/token \
  -H "Accept: application/json" \
  -H "Accept-Language: en_US" \
  -u "AeAnOdb23ogtaC-w_4vrnJSATXvZVFaCQjXN7YbNIXJ_ow7CRx8nVaVwgx5GdRPzVygs1LXzHH4VgStS:EA8YDH7zU7KRR7rj8R5m7vebDoT5ouMv8JgHaxk-xJm3IFn567PTGz6xtakqE3EZFZR8VcECM0zreRy3" \
  -d "grant_type=client_credentials"

# 2. Webhook erstellen (nutze den Access Token aus Schritt 1)
curl -v -X POST https://api-m.paypal.com/v1/notifications/webhooks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -d '{
    "url": "https://whatsapp.owona.de/api/payments/paypal/webhook",
    "event_types": [
      {"name": "PAYMENT.CAPTURE.COMPLETED"},
      {"name": "PAYMENT.CAPTURE.DENIED"},
      {"name": "PAYMENT.CAPTURE.REFUNDED"},
      {"name": "CHECKOUT.ORDER.APPROVED"}
    ]
  }'
```

## 📝 Webhook verifizieren

Nach der Konfiguration kannst du den Webhook testen:

1. **Im PayPal Dashboard**:
   - Gehe zu deiner App → Webhooks
   - Klicke auf den Webhook
   - Klicke auf **"Send test notification"**
   - Wähle Event Type: `PAYMENT.CAPTURE.COMPLETED`

2. **Server-Logs prüfen**:
   ```bash
   pm2 logs whatsapp-bot-builder | grep PayPal
   ```

3. **Webhook-URL manuell testen**:
   ```bash
   curl -X POST https://whatsapp.owona.de/api/payments/paypal/webhook \
     -H "Content-Type: application/json" \
     -d '{
       "event_type": "PAYMENT.CAPTURE.COMPLETED",
       "resource": {
         "id": "test-capture-id",
         "amount": {"value": "29.00", "currency_code": "EUR"}
       }
     }'
   ```

## 🆘 Hilfe benötigt?

Falls du immer noch Probleme hast:

1. **Screenshots machen**: Mache einen Screenshot von dem Bereich, wo du bist
2. **Account-Typ prüfen**: Stelle sicher, dass du ein **Business Account** hast
3. **App-Details prüfen**: Stelle sicher, dass deine App im **Live-Modus** ist

## ✅ Erfolgreiche Konfiguration

Du weißt, dass es funktioniert hat, wenn:

1. Du eine **Webhook ID** siehst (z.B. `WH-xxxxx-xxxxx`)
2. Du eine **Webhook Signature Key** siehst
3. Du Test-Notifications senden kannst
4. Server-Logs die Webhook-Events empfangen

## 🔒 Sicherheit

Nach erfolgreicher Konfiguration:

- Die Webhook-URL ist nun aktiv
- PayPal sendet Events an deine URL
- Alle Zahlungen werden automatisch verarbeitet
- Subscriptions werden automatisch aktiviert

## 📞 PayPal Support

Falls du nicht weiterkommst, kontaktiere den PayPal Support:

- **Developer Support**: https://developer.paypal.com/support/
- **Business Support**: https://www.paypal.com/businesshelp/
- **Telefon**: Suche die PayPal-Hotline für dein Land

