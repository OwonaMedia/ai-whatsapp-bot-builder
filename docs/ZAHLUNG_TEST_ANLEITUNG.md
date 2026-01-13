# Zahlungsfunktion Test-Anleitung ✅

**Datum:** November 2025

---

## 🎯 Test-Ziele

1. ✅ Stripe Payment Intent erstellen
2. ✅ Zahlung mit Test-Karte durchführen
3. ✅ Webhook-Events prüfen
4. ✅ Subscription-Aktivierung verifizieren

---

## 📋 Voraussetzungen

- ✅ Stripe Test-Account konfiguriert
- ✅ Environment Variables gesetzt:
  - `STRIPE_SECRET_KEY=sk_test_...`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...`
  - `STRIPE_WEBHOOK_SECRET=whsec_...`
- ✅ Webhook konfiguriert: `https://whatsapp.owona.de/api/payments/stripe/webhook`
- ✅ Benutzer eingeloggt

---

## 🧪 Test-Schritte

### 1. Checkout-Seite öffnen

```
https://whatsapp.owona.de/de/checkout?tier=starter
```

**Erwartetes Verhalten:**
- Seite lädt ohne Fehler
- Bestellübersicht zeigt: "WhatsApp Bot Builder - starter Plan (monthly)" - €29,00
- Zahlungsmethoden werden angezeigt

---

### 2. Zahlungsmethode auswählen

**Schritte:**
1. Klicke auf "Kreditkarte" (Stripe)
2. Klicke auf "Weiter"

**Erwartetes Verhalten:**
- Payment Intent wird erstellt
- Stripe Payment Element wird angezeigt
- Formular für Kreditkartendaten erscheint

---

### 3. Test-Zahlung durchführen

**Stripe Test-Karten:**
- **Erfolgreich:** `4242 4242 4242 4242`
- **3D Secure:** `4000 0025 0000 3155`
- **Fehlgeschlagen:** `4000 0000 0000 0002`

**Schritte:**
1. Karte: `4242 4242 4242 4242`
2. Ablaufdatum: Beliebige zukünftige Daten (z.B. `12/25`)
3. CVC: Beliebige 3 Ziffern (z.B. `123`)
4. Name: Beliebiger Name
5. Klicke auf "Jetzt zahlen"

**Erwartetes Verhalten:**
- Zahlung wird verarbeitet
- Erfolgsmeldung wird angezeigt
- Weiterleitung zu `/de/checkout/success` oder Dashboard

---

### 4. Webhook-Events prüfen

**Stripe Dashboard:**
1. Gehe zu: https://dashboard.stripe.com/test/webhooks
2. Klicke auf den Webhook-Endpoint
3. Prüfe die Events:
   - `payment_intent.succeeded` ✅
   - `payment_intent.created` ✅

**Server-Logs:**
```bash
ssh root@91.99.232.126
cd /var/www/whatsapp-bot-builder/frontend
pm2 logs whatsapp-bot-builder --lines 50
```

**Erwartete Logs:**
```
[Stripe Webhook] Payment succeeded: pi_...
[Subscription Activation] Created subscription for user ... with tier starter
```

---

### 5. Subscription-Aktivierung verifizieren

**Supabase Dashboard:**
1. Gehe zu: https://supabase.com/dashboard
2. Öffne die `subscriptions` Tabelle
3. Prüfe:
   - `user_id` entspricht dem eingeloggten Benutzer
   - `tier` = `starter`
   - `status` = `active`
   - `billing_cycle` = `monthly`
   - `current_period_end` ist in 1 Monat

**App-Dashboard:**
1. Gehe zu: https://whatsapp.owona.de/de/dashboard
2. Prüfe, ob der Subscription-Status aktualisiert wurde

---

## 🔍 Troubleshooting

### Problem: Payment Intent wird nicht erstellt

**Lösung:**
- Prüfe Server-Logs auf Fehler
- Prüfe, ob `STRIPE_SECRET_KEY` korrekt gesetzt ist
- Prüfe API-Route: `/api/payments/create`

### Problem: Webhook-Events werden nicht empfangen

**Lösung:**
1. Prüfe Webhook-URL in Stripe Dashboard
2. Prüfe `STRIPE_WEBHOOK_SECRET` Environment Variable
3. Teste Webhook manuell:
   ```bash
   curl -X POST https://whatsapp.owona.de/api/payments/stripe/webhook \
     -H "stripe-signature: ..." \
     -d @test-event.json
   ```

### Problem: Subscription wird nicht aktiviert

**Lösung:**
- Prüfe Webhook-Handler-Logs
- Prüfe, ob `userId` und `tier` in Payment Intent Metadata vorhanden sind
- Prüfe Supabase Service Role Key

---

## ✅ Erfolgs-Kriterien

- [x] Payment Intent wird erfolgreich erstellt
- [x] Zahlung mit Test-Karte funktioniert
- [x] Webhook-Events werden empfangen
- [x] Subscription wird in Supabase aktiviert
- [x] Dashboard zeigt aktualisierten Subscription-Status

---

## 📝 Test-Karten Referenz

| Karte | Szenario | Erwartetes Ergebnis |
|-------|----------|---------------------|
| `4242 4242 4242 4242` | Erfolgreiche Zahlung | ✅ Payment succeeded |
| `4000 0025 0000 3155` | 3D Secure | 🔐 3D Secure Challenge |
| `4000 0000 0000 0002` | Fehlgeschlagen | ❌ Payment failed |
| `4000 0000 0000 9995` | Insufficient Funds | ❌ Payment declined |

---

## 🔗 Nützliche Links

- [Stripe Test Cards](https://stripe.com/docs/testing)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Payment Element](https://stripe.com/docs/payments/payment-element)

---

**Status:** ✅ Bereit für Tests

