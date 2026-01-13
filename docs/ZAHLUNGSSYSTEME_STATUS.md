# Zahlungssysteme - Aktueller Stand & Einrichtungs-Checkliste

**Stand:** November 2025  
**Status:** ✅ Phase 1 (Stripe + PayPal) implementiert, ⏳ Credentials konfigurieren  
**Aktiv im Produkt:** Stripe (Kreditkarte) & PayPal – alle übrigen Provider vorerst deaktiviert, bis Live-Credentials vorliegen.  
**UI-Verhalten:** Ist ein Provider nicht konfiguriert (z. B. PayPal ohne Client ID/Secret), erscheint die Option im Checkout als „Demnächst verfügbar“ und kann nicht ausgewählt werden. Dadurch vermeiden wir fehlschlagende Zahlungen.

---

## ✅ Was bereits implementiert ist

### 1. Payment Detection System
- ✅ `lib/paymentDetection.ts` - Dynamische Zahlungsmethoden-Erkennung
- ✅ IP-Geolocation, Browser-Sprache, User-Auswahl
- ✅ Regionale Konfigurationen für alle wichtigen Märkte
- ✅ API Route: `/api/payments/methods`

### 2. Payment Provider Backend (20+ Provider)
Alle Provider sind mit Platzhaltern implementiert:

#### 🌍 Globale Provider
- ✅ `lib/payments/stripe.ts` - Stripe Integration
- ✅ `lib/payments/paypal.ts` - PayPal Integration

#### 🇪🇺 Europa
- ✅ `lib/payments/mollie.ts` - Mollie (iDEAL, Bancontact, Giropay)
- ✅ `lib/payments/klarna.ts` - Klarna (Buy Now, Pay Later)

#### 🇧🇷 Südamerika
- ✅ `lib/payments/mercado-pago.ts` - Mercado Pago
- ✅ `lib/payments/pix.ts` - Pix (Brasilien)

#### 🇿🇦 Afrika
- ✅ `lib/payments/paystack.ts` - Paystack (Nigeria, Ghana)
- ✅ `lib/payments/flutterwave.ts` - Flutterwave (Westafrika, Ostafrika)
- ✅ `lib/payments/mpesa.ts` - M-Pesa (Kenia, Tansania, Ghana)
- ✅ `lib/payments/mtn-mobile-money.ts` - MTN Mobile Money
- ✅ `lib/payments/airtel-money.ts` - Airtel Money
- ✅ `lib/payments/orange-money.ts` - Orange Money

#### 🇨🇳 Asien
- ✅ `lib/payments/wechat-pay.ts` - WeChat Pay (China)
- ✅ `lib/payments/alipay.ts` - Alipay (China)
- ✅ `lib/payments/paytm.ts` - Paytm (Indien)
- ✅ `lib/payments/grabpay.ts` - GrabPay (Südostasien)

### 3. Dokumentation
- ✅ `docs/ZAHLUNGSMETHODEN_ANALYSE_2025.md` - Marktanalyse
- ✅ `docs/ZAHLUNGSANBIETER_KOSTEN_2025.md` - Kostenübersicht
- ✅ `lib/payments/README.md` - Setup Guide

### 4. Optimierungen
- ✅ Überschneidungen entfernt (keine doppelten Provider pro Land)
- ✅ Regionale Priorisierung implementiert
- ✅ 2-4 Zahlungsmethoden pro Land (optimiert)

---

## ⏳ Was noch zu tun ist

### Phase 1: Credentials konfigurieren ✅ ABGESCHLOSSEN (für Stripe + PayPal)

#### 1.1 Environment Variables setzen

Erstelle `.env.local` (lokal) und Server Environment Variables (Production):
Siehe `frontend/ENV_SETUP.md` für vollständige Anleitung.

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_... # oder sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # oder pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PayPal
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_MODE=sandbox # oder 'live'

# Mollie
MOLLIE_API_KEY=test_... # oder live_...

# Klarna
KLARNA_USERNAME=...
KLARNA_PASSWORD=...
KLARNA_REGION=EU # oder 'NA'

# Mercado Pago
MERCADO_PAGO_ACCESS_TOKEN=...
MERCADO_PAGO_PUBLIC_KEY=...

# Pix (Brasilien)
PIX_API_KEY=... # Meist über Stripe oder Mercado Pago
PIX_MERCHANT_ID=...

# Flutterwave
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST_... # oder FLWPUBK_...
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST_... # oder FLWSECK_...
FLUTTERWAVE_ENCRYPTION_KEY=...

# Paystack
PAYSTACK_SECRET_KEY=sk_test_... # oder sk_live_...
PAYSTACK_PUBLIC_KEY=pk_test_... # oder pk_live_...

# M-Pesa
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
MPESA_SHORTCODE=174379 # Business Shortcode
MPESA_PASSKEY=...
MPESA_ENVIRONMENT=sandbox # oder 'production'

# MTN Mobile Money
MTN_API_KEY=...
MTN_USER_ID=...
MTN_PRIMARY_KEY=...
MTN_ENVIRONMENT=sandbox # oder 'production'

# Airtel Money
AIRTEL_MONEY_CLIENT_ID=...
AIRTEL_MONEY_CLIENT_SECRET=...
AIRTEL_MONEY_MERCHANT_ID=...
AIRTEL_MONEY_ENVIRONMENT=sandbox # oder 'production'

# Orange Money
ORANGE_MONEY_MERCHANT_ID=...
ORANGE_MONEY_API_KEY=...
ORANGE_MONEY_API_SECRET=...
ORANGE_MONEY_ENVIRONMENT=sandbox # oder 'production'

# WeChat Pay
WECHAT_PAY_APP_ID=...
WECHAT_PAY_MCH_ID=...
WECHAT_PAY_API_KEY=...
WECHAT_PAY_CERT_PATH=... # Optional

# Alipay
ALIPAY_APP_ID=...
ALIPAY_PRIVATE_KEY=...
ALIPAY_PUBLIC_KEY=...
ALIPAY_GATEWAY=https://openapi.alipay.com/gateway.do # oder sandbox URL

# Paytm
PAYTM_MERCHANT_ID=...
PAYTM_MERCHANT_KEY=...
PAYTM_WEBSITE=WEBSTAGING # oder 'WEB'
PAYTM_INDUSTRY_TYPE=Retail
PAYTM_CHANNEL_ID=WEB

# GrabPay
GRABPAY_PARTNER_ID=...
GRABPAY_PARTNER_SECRET=...
GRABPAY_MERCHANT_ID=...
GRABPAY_ENVIRONMENT=sandbox # oder 'production'
```

#### 1.2 Provider Accounts erstellen

**Priorität 1 (Wichtigste Märkte):**
- [ ] Stripe Account erstellen (https://stripe.com)
- [ ] PayPal Business Account erstellen (https://www.paypal.com/business)
- [ ] Mollie Account erstellen (https://www.mollie.com) - für Europa

**Priorität 2 (Regionale Provider):**
- [ ] Paystack Account (https://paystack.com) - Nigeria, Ghana
- [ ] Flutterwave Account (https://flutterwave.com) - Afrika
- [ ] Mercado Pago Account (https://www.mercadopago.com) - Südamerika

**Priorität 3 (Mobile Money - wenn benötigt):**
- [ ] M-Pesa Developer Account (https://developer.safaricom.co.ke/)
- [ ] MTN Mobile Money Developer Account (https://momodeveloper.mtn.com/)
- [ ] Airtel Money Developer Account (https://developer.airtel.com/)
- [ ] Orange Money Developer Account (https://developer.orange.com/)

**Priorität 4 (Asien - wenn benötigt):**
- [ ] WeChat Pay Merchant Account (https://pay.weixin.qq.com/)
- [ ] Alipay Open Platform Account (https://open.alipay.com/)
- [ ] Paytm Merchant Account (https://developer.paytm.com/)
- [ ] GrabPay Partner Account (https://developer.grab.com/)

### Phase 2: SDKs installieren ✅ ABGESCHLOSSEN

```bash
# Stripe ✅
npm install stripe

# PayPal ✅
npm install @paypal/checkout-server-sdk
```
**Status:** Beide SDKs sind installiert (mit --legacy-peer-deps wegen React 19 Kompatibilität)

# Mollie
npm install @mollie/api-client

# Klarna
npm install klarna-checkout

# Mercado Pago
npm install mercadopago

# Flutterwave
npm install flutterwave-node-v3

# Paystack
npm install paystack

# WeChat Pay
npm install wechatpay-node-v3

# Alipay
npm install alipay-sdk

# Paytm
npm install paytmchecksum

# M-Pesa, MTN, Airtel, Orange
# Meist REST API, kein spezielles SDK nötig
```

### Phase 3: Provider-Integration implementieren ✅ ABGESCHLOSSEN (für Stripe + PayPal)

#### 3.1 Platzhalter durch echte SDK-Calls ersetzen

**Dateien zu aktualisieren:**
- [x] `lib/payments/stripe.ts` - Stripe SDK Integration ✅
- [x] `lib/payments/paypal.ts` - PayPal SDK Integration ✅

**Implementierte Funktionen:**
- ✅ `createStripePaymentIntent()` - Payment Intent erstellen
- ✅ `getStripePaymentIntent()` - Payment Intent abrufen
- ✅ `verifyStripeWebhook()` - Webhook-Signatur verifizieren
- ✅ `createStripeCustomer()` - Customer erstellen
- ✅ `createPayPalOrder()` - PayPal Order erstellen
- ✅ `getPayPalOrder()` - PayPal Order abrufen
- ✅ `capturePayPalOrder()` - PayPal Order capturen
- [x] `lib/payments/mollie.ts` - Mollie SDK Integration ✅
- [ ] `lib/payments/klarna.ts` - Klarna SDK Integration (Session vorhanden, UI folgt)
- [ ] `lib/payments/mercado-pago.ts` - Mercado Pago SDK Integration
- [ ] `lib/payments/pix.ts` - Pix Integration (über Stripe/Mercado Pago)
- [ ] `lib/payments/flutterwave.ts` - Flutterwave SDK Integration
- [ ] `lib/payments/paystack.ts` - Paystack SDK Integration
- [ ] `lib/payments/mpesa.ts` - M-Pesa REST API Integration
- [ ] `lib/payments/mtn-mobile-money.ts` - MTN REST API Integration
- [ ] `lib/payments/airtel-money.ts` - Airtel REST API Integration
- [ ] `lib/payments/orange-money.ts` - Orange REST API Integration
- [ ] `lib/payments/wechat-pay.ts` - WeChat Pay SDK Integration
- [ ] `lib/payments/alipay.ts` - Alipay SDK Integration
- [ ] `lib/payments/paytm.ts` - Paytm SDK Integration
- [ ] `lib/payments/grabpay.ts` - GrabPay REST API Integration

#### 3.2 Webhook-Handler erstellen ✅ ABGESCHLOSSEN

**API Routes zu erstellen:**
- [x] `app/api/payments/stripe/webhook/route.ts` ✅
- [x] `app/api/payments/paypal/webhook/route.ts` ✅
- [x] `app/api/payments/create/route.ts` ✅ (Payment-Erstellung)

**Implementierte Webhook-Events:**
- ✅ Stripe: `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`, `customer.subscription.*`
- ✅ PayPal: `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`, `PAYMENT.CAPTURE.REFUNDED`, `CHECKOUT.ORDER.APPROVED`

**Hinweis:** Webhook-Handler enthalten TODOs für Supabase-Integration (Subscription-Aktivierung, etc.)
- [ ] `app/api/payments/mollie/webhook/route.ts`
- [ ] `app/api/payments/klarna/webhook/route.ts`
- [ ] `app/api/payments/mercado-pago/webhook/route.ts`
- [ ] `app/api/payments/paystack/webhook/route.ts`
- [ ] `app/api/payments/flutterwave/webhook/route.ts`
- [ ] `app/api/payments/mpesa/webhook/route.ts`
- [ ] `app/api/payments/mtn-mobile-money/webhook/route.ts`
- [ ] `app/api/payments/airtel-money/webhook/route.ts`
- [ ] `app/api/payments/orange-money/webhook/route.ts`
- [ ] `app/api/payments/wechat-pay/webhook/route.ts`
- [ ] `app/api/payments/alipay/webhook/route.ts`
- [ ] `app/api/payments/paytm/webhook/route.ts`
- [ ] `app/api/payments/grabpay/webhook/route.ts`

### Phase 4: Frontend Integration

#### 4.1 Payment Components erstellen
- [ ] `components/payments/PaymentMethodSelector.tsx` - Zahlungsmethoden-Auswahl
- [ ] `components/payments/PaymentMethodCard.tsx` - Zahlungsmethoden-Karte
- [ ] `components/payments/CheckoutForm.tsx` - Checkout-Formular
- [ ] `components/payments/PaymentStatus.tsx` - Payment Status Anzeige

#### 4.2 Payment Hooks erstellen
- [ ] `hooks/usePaymentMethods.ts` - Payment Methods Hook
- [ ] `hooks/usePayment.ts` - Payment Processing Hook

#### 4.3 Checkout-Seite erstellen
- [ ] `app/[locale]/checkout/page.tsx` - Checkout-Seite
- [ ] Integration mit Subscription System
- [ ] Payment Method Detection Integration

### Phase 5: Testing

#### 5.1 Sandbox Testing
- [ ] Stripe Test Mode
- [ ] PayPal Sandbox
- [ ] Mollie Test Mode
- [ ] Alle anderen Provider im Test-Modus

#### 5.2 Integration Testing
- [ ] Payment Flow End-to-End
- [ ] Webhook Handling
- [ ] Error Handling
- [ ] Refund Testing
- [ ] Chargeback Testing

#### 5.3 Production Testing
- [ ] Kleine Test-Transaktionen
- [ ] Webhook Validierung
- [ ] Monitoring Setup

---

## 📋 Nächste Schritte (Priorität)

### Sofort (Priorität 1)
1. **Stripe Account erstellen** - Wichtigster globaler Provider
2. **PayPal Business Account erstellen** - Zweitwichtigster globaler Provider
3. **Environment Variables setzen** - Für Stripe und PayPal
4. **SDKs installieren** - Stripe und PayPal
5. **Stripe Integration implementieren** - Echte SDK-Calls
6. **PayPal Integration implementieren** - Echte SDK-Calls
7. **Webhook-Handler erstellen** - Für Stripe und PayPal
8. **Frontend Components** - Payment Method Selector
9. **Checkout-Seite** - Mit Stripe und PayPal Integration

### Kurzfristig (Priorität 2)
1. **Mollie Account** - Für Europa (iDEAL, Bancontact, Giropay)
2. **Paystack Account** - Für Nigeria/Ghana
3. **Mercado Pago Account** - Für Südamerika
4. **Integration dieser Provider**

### Mittelfristig (Priorität 3)
1. **Mobile Money Provider** - M-Pesa, MTN, Airtel, Orange (wenn benötigt)
2. **Asiatische Provider** - WeChat Pay, Alipay, Paytm (wenn benötigt)
3. **Klarna** - Buy Now, Pay Later (wenn benötigt)

---

## 📁 Dateistruktur

```
frontend/
├── lib/
│   ├── paymentDetection.ts ✅
│   └── payments/
│       ├── index.ts ✅
│       ├── stripe.ts ✅
│       ├── paypal.ts ✅
│       ├── mollie.ts ✅
│       ├── klarna.ts ✅
│       ├── mercado-pago.ts ✅
│       ├── pix.ts ✅
│       ├── flutterwave.ts ✅
│       ├── paystack.ts ✅
│       ├── mpesa.ts ✅
│       ├── mtn-mobile-money.ts ✅
│       ├── airtel-money.ts ✅
│       ├── orange-money.ts ✅
│       ├── wechat-pay.ts ✅
│       ├── alipay.ts ✅
│       ├── paytm.ts ✅
│       ├── grabpay.ts ✅
│       └── README.md ✅
├── app/
│   └── api/
│       └── payments/
│           ├── methods/
│           │   └── route.ts ✅
│           ├── create/
│           │   └── route.ts ✅ (NEU)
│           ├── stripe/
│           │   └── webhook/
│           │       └── route.ts ✅ (NEU)
│           └── paypal/
│               └── webhook/
│                   └── route.ts ✅ (NEU)
├── ENV_SETUP.md ✅ (NEU - Environment Variables Guide)
└── docs/
    ├── ZAHLUNGSMETHODEN_ANALYSE_2025.md ✅
    ├── ZAHLUNGSANBIETER_KOSTEN_2025.md ✅
    └── ZAHLUNGSSYSTEME_STATUS.md ✅ (diese Datei)
```

---

## 🔗 Wichtige Links

### Developer Portals
- Stripe: https://dashboard.stripe.com/
- PayPal: https://developer.paypal.com/
- Mollie: https://www.mollie.com/dashboard
- Klarna: https://merchants.klarna.com/
- Mercado Pago: https://www.mercadopago.com/developers/panel
- Paystack: https://dashboard.paystack.com/
- Flutterwave: https://dashboard.flutterwave.com/
- M-Pesa: https://developer.safaricom.co.ke/
- MTN Mobile Money: https://momodeveloper.mtn.com/
- WeChat Pay: https://pay.weixin.qq.com/
- Alipay: https://open.alipay.com/
- Paytm: https://developer.paytm.com/
- GrabPay: https://developer.grab.com/

---

## 🛠️ Bekannte Fehler & Fixes

### Stripe Payment Element – „Could not retrieve elements store due to unexpected error“

- **Symptom:** Kreditkarten-Eingabe erscheint nicht, der Button „Jetzt zahlen“ bleibt deaktiviert. In der Browser-Konsole erscheint die Stripe-Fehlermeldung „Could not retrieve elements store due to unexpected error“.
- **Root Cause 1 (2025-11-10):** Unsere Content-Security-Policy blockierte Stripe-Domains (`js.stripe.com`, `api.stripe.com`, `m.stripe.network`, `q.stripe.com`, `hooks.stripe.com`, `checkout.stripe.com`). Dadurch konnte das Stripe Payment Element keine Ressourcen laden und initialisieren.
  - ✅ Fix: `frontend/next.config.js` > CSP erweitert (alle Stripe-Domains whitelisted), Build + PM2-Restart durchgeführt.
  - ✅ Ergebnis: Stripe-Skripte laden wieder ohne CSP-Verstoß.
- **Root Cause 2 (2025-11-11):** Das Stripe-Konto läuft noch auf einer älteren API-Version, welche den Endpunkt `/v1/elements/sessions` nicht kennt. Stripe JS versucht diesen Endpunkt aufzurufen und erhält 401/404 → Payment Element initialisiert nicht.
  - ✅ Sofortmaßnahme: Wechsel auf das klassische `CardElement` (legacy flow). Kein `/v1/elements/sessions` mehr notwendig, Kartenzahlungen funktionieren wieder zuverlässig.
  - ⏳ Dauerhafte Lösung: Stripe API-Version im Dashboard auf ≥ `2024-08-21` anheben und Payment Element später wieder aktivieren.
- **Nachkontrolle:** Checkout-Seite im Browser mit Hard-Reload (`Cmd+Shift+R` oder `Ctrl+Shift+R`) öffnen. In der DevTools-Konsole prüfen:
  - keine CSP-Verstöße,
  - keine 401/404-Requests gegen `api.stripe.com/elements/sessions`,
  - `CardElement` sichtbar und Eingabefelder aktiv.

### Dokumentation
- Stripe Docs: https://stripe.com/docs
- PayPal Docs: https://developer.paypal.com/docs
- Mollie Docs: https://docs.mollie.com/
- Alle anderen Provider-Dokumentationen siehe `lib/payments/README.md`

---

## ⚠️ Wichtige Hinweise

1. **Sandbox/Test Mode zuerst** - Alle Provider im Test-Modus testen
2. **Webhook URLs konfigurieren** - In Provider-Dashboards eintragen
3. **Security** - Credentials niemals committen, nur Environment Variables
4. **Error Handling** - Umfassendes Error Handling implementieren
5. **Logging** - Payment-Logs für Debugging und Compliance
6. **Compliance** - PCI-DSS, GDPR, lokale Regulierungen beachten
7. **Monitoring** - Payment-Monitoring und Alerts einrichten

---

## 📝 Notizen

- ✅ **Stripe + PayPal SDK-Integration abgeschlossen** (Phase 1)
- ✅ **Webhook-Handler implementiert** für Stripe und PayPal
- ✅ **Payment-Erstellung API Route** (`/api/payments/create`)
- ✅ **Environment Variables Dokumentation** (`frontend/ENV_SETUP.md`)
- ✅ **Mollie Checkout aktiv** (iDEAL/Bancontact/Giropay via Redirect)
- ✅ **Frontend-Integration (Stripe/PayPal/Mollie) funktionsfähig**
- ✅ **Supabase-Integration in Webhooks** (Subscription-Aktivierung)
- ✅ **Payment Components erstellt** (PaymentMethodSelector, CheckoutForm, PaymentStatus)
- ✅ **Checkout-Seiten erstellt** (checkout, success, cancel)
- ✅ **Payment Hooks erstellt** (usePaymentMethods, usePayment)
- ✅ **Screenshot-System erweitert** für Payment-Screenshots
- ⏳ **Error-Handling und Retry-Logic** können noch verbessert werden
- ⏳ **Weitere Provider** (Paystack, Flutterwave, Mercado Pago, etc.) verwenden noch Platzhalter
- ⏳ **Screenshots erstellen** (siehe `docs/PAYMENT_SCREENSHOTS_ANLEITUNG.md`)

---

## 🎉 Phase 1 Fortschritt (Stripe + PayPal)

### ✅ Abgeschlossen:
1. ✅ SDKs installiert (`stripe`, `@paypal/checkout-server-sdk`)
2. ✅ Stripe Integration implementiert (echte SDK-Calls)
3. ✅ PayPal Integration implementiert (echte SDK-Calls)
4. ✅ Webhook-Handler für Stripe erstellt
5. ✅ Webhook-Handler für PayPal erstellt
6. ✅ Payment-Erstellung API Route erstellt
7. ✅ Environment Variables Dokumentation erstellt

### ⏳ Noch zu tun:
1. ⏳ Environment Variables konfigurieren (Stripe + PayPal Credentials)
2. ⏳ Testing im Sandbox-Modus
3. ⏳ Stripe Payment Element nach API-Upgrades reaktivieren (derzeit Legacy Card Element aktiv)

### ✅ Abgeschlossen (neu):
1. ✅ Frontend Components erstellt (Payment Method Selector, Checkout, Payment Status)
2. ✅ Payment Hooks erstellt (usePaymentMethods, usePayment)
3. ✅ Checkout-Seite erstellt (`/[locale]/checkout`)
4. ✅ Checkout Success/Cancel Seiten erstellt
5. ✅ Supabase-Integration in Webhooks (Subscription-Aktivierung)
6. ✅ Subscription Activation Helper erstellt
7. ✅ Payment-Logging implementiert

---

**Nächste Session:** 
1. Credentials konfigurieren (Stripe + PayPal Accounts erstellen)
2. Frontend Components erstellen (Payment UI)
3. Supabase-Integration in Webhooks


