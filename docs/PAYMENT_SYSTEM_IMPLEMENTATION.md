# Payment System - Vollständige Implementierungs-Dokumentation

**Stand:** November 2025  
**Status:** ✅ Phase 1 (Stripe + PayPal) vollständig implementiert

---

## 📋 Inhaltsverzeichnis

1. [Übersicht](#übersicht)
2. [Architektur](#architektur)
3. [Frontend-Components](#frontend-components)
4. [Backend-Integration](#backend-integration)
5. [Supabase-Integration](#supabase-integration)
6. [Setup & Konfiguration](#setup--konfiguration)
7. [Testing](#testing)
8. [Screenshots](#screenshots)

---

## 📊 Übersicht

Das Payment-System unterstützt derzeit **Stripe** und **PayPal** als Zahlungsanbieter mit vollständiger Integration in das Subscription-System.

### ✅ Implementierte Features

- ✅ **Stripe Integration** - Payment Intents, Customer Management, Webhooks
- ✅ **PayPal Integration** - Orders, Captures, Webhooks
- ✅ **Payment Method Detection** - Automatische Erkennung basierend auf User-Location
- ✅ **Checkout Flow** - Vollständiger Checkout-Prozess mit UI
- ✅ **Subscription Activation** - Automatische Aktivierung nach erfolgreicher Zahlung
- ✅ **Payment Logging** - Vollständiges Payment-Tracking
- ✅ **Error Handling** - Umfassendes Error-Handling und Retry-Logic
- ✅ **Webhook Security** - Signature-Verifizierung für alle Webhooks

---

## 🏗️ Architektur

### Frontend-Struktur

```
frontend/
├── app/
│   └── [locale]/
│       └── checkout/
│           ├── page.tsx              # Haupt-Checkout-Seite
│           ├── success/
│           │   └── page.tsx          # Erfolgs-Seite
│           └── cancel/
│               └── page.tsx          # Abbruch-Seite
├── components/
│   └── payments/
│       ├── PaymentMethodCard.tsx     # Zahlungsmethoden-Karte
│       ├── PaymentMethodSelector.tsx # Zahlungsmethoden-Auswahl
│       ├── PaymentStatus.tsx         # Payment-Status-Anzeige
│       └── CheckoutForm.tsx          # Checkout-Formular
├── hooks/
│   ├── usePaymentMethods.ts          # Hook für Zahlungsmethoden
│   └── usePayment.ts                 # Hook für Zahlungserstellung
└── lib/
    ├── paymentDetection.ts           # Dynamische Zahlungsmethoden-Erkennung
    └── payments/
        ├── stripe.ts                 # Stripe Integration
        ├── paypal.ts                 # PayPal Integration
        └── subscription-activation.ts # Subscription-Aktivierung
```

### Backend-Struktur

```
frontend/
└── app/
    └── api/
        └── payments/
            ├── methods/
            │   └── route.ts          # GET: Verfügbare Zahlungsmethoden
            ├── create/
            │   └── route.ts          # POST: Zahlung erstellen
            ├── stripe/
            │   └── webhook/
            │       └── route.ts      # POST: Stripe Webhook Handler
            └── paypal/
                └── webhook/
                    └── route.ts      # POST: PayPal Webhook Handler
```

### Datenfluss

```
User → Checkout Page → Payment Method Selector
                        ↓
                    Payment Creation API
                        ↓
                    Stripe/PayPal API
                        ↓
                    Webhook Handler
                        ↓
                    Supabase (Subscription Activation)
```

---

## 🎨 Frontend-Components

### PaymentMethodSelector

**Datei:** `components/payments/PaymentMethodSelector.tsx`

**Features:**
- Lädt automatisch verfügbare Zahlungsmethoden basierend auf User-Location
- Zeigt Zahlungsmethoden mit Icons, Gebühren und Processing-Time
- Unterstützt manuelle Auswahl durch User
- Responsive Design

**Screenshot:** `docs/screenshots/payment-method-selector.png`

```tsx
<PaymentMethodSelector
  currency="EUR"
  country="DE"
  selectedMethod={selectedMethod}
  onSelect={handleMethodSelect}
  onContinue={handleContinue}
  showContinueButton={true}
/>
```

### PaymentMethodCard

**Datei:** `components/payments/PaymentMethodCard.tsx`

**Features:**
- Zeigt einzelne Zahlungsmethode mit Details
- Visuelle Auswahl-Indikator
- Icon, Name, Gebühren, Processing-Time
- Disabled-State für nicht verfügbare Methoden

**Screenshot:** `docs/screenshots/payment-method-card.png`

### CheckoutForm

**Datei:** `components/payments/CheckoutForm.tsx`

**Features:**
- Kompletter Checkout-Flow
- Integration mit Stripe Elements
- PayPal Redirect-Handling
- Order Summary
- Payment Status-Anzeige
- Error Handling

**Screenshot:** `docs/screenshots/checkout-form.png`

### PaymentStatus

**Datei:** `components/payments/PaymentStatus.tsx`

**Features:**
- Visuelle Status-Anzeige (pending, processing, success, failed, canceled)
- Icons und Farbcodierung
- Retry-Funktionalität
- User-Feedback

**Screenshot:** `docs/screenshots/payment-status.png`

---

## 🔌 Backend-Integration

### Payment Creation API

**Endpoint:** `POST /api/payments/create`

**Request:**
```json
{
  "provider": "stripe" | "paypal",
  "amount": 29.00,
  "currency": "EUR",
  "userId": "user-uuid",
  "subscriptionId": "starter",
  "description": "WhatsApp Bot Builder - Starter Plan",
  "customerEmail": "user@example.com",
  "customerName": "John Doe"
}
```

**Response (Stripe):**
```json
{
  "success": true,
  "provider": "stripe",
  "paymentIntentId": "pi_xxx",
  "clientSecret": "pi_xxx_secret_xxx",
  "amount": 29.00,
  "currency": "EUR",
  "status": "requires_payment_method"
}
```

**Response (PayPal):**
```json
{
  "success": true,
  "provider": "paypal",
  "orderId": "PAYPAL_ORDER_XXX",
  "approveUrl": "https://www.sandbox.paypal.com/checkoutnow?token=xxx",
  "amount": 29.00,
  "currency": "EUR",
  "status": "CREATED"
}
```

### Payment Methods API

**Endpoint:** `GET /api/payments/methods?currency=EUR&country=DE`

**Response:**
```json
{
  "success": true,
  "data": {
    "methods": [
      {
        "id": "stripe",
        "name": "Kreditkarte",
        "provider": "stripe",
        "icon": "💳",
        "priority": 1,
        "fees": {
          "percentage": 2.9,
          "fixed": 0.30,
          "currency": "EUR"
        },
        "processingTime": "instant",
        "supportedCountries": ["DE", "AT", "CH"],
        "supportedCurrencies": ["EUR"]
      }
    ],
    "currency": "EUR",
    "country": "DE"
  }
}
```

---

## 🔄 Supabase-Integration

### Subscription Activation

**Datei:** `lib/payments/subscription-activation.ts`

**Funktionen:**
- `activateSubscription()` - Aktiviert oder aktualisiert Subscription
- `deactivateSubscription()` - Deaktiviert Subscription (bei Refund/Cancellation)
- `logPayment()` - Protokolliert Payment-Events

**Subscription-Schema:**
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  tier TEXT NOT NULL, -- 'free', 'starter', 'professional', 'enterprise'
  status TEXT NOT NULL, -- 'active', 'cancelled', 'past_due', 'expired'
  billing_cycle TEXT NOT NULL, -- 'monthly', 'yearly'
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  payment_provider TEXT, -- 'stripe', 'paypal', 'manual'
  payment_provider_subscription_id TEXT,
  metadata JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Webhook-Handler

#### Stripe Webhook

**Endpoint:** `POST /api/payments/stripe/webhook`

**Unterstützte Events:**
- `payment_intent.succeeded` → Aktiviert Subscription
- `payment_intent.payment_failed` → Loggt fehlgeschlagene Zahlung
- `payment_intent.canceled` → Loggt abgebrochene Zahlung
- `customer.subscription.created` → Synchronisiert Subscription
- `customer.subscription.updated` → Aktualisiert Subscription
- `customer.subscription.deleted` → Deaktiviert Subscription

**Screenshot:** `docs/screenshots/stripe-webhook-config.png`

#### PayPal Webhook

**Endpoint:** `POST /api/payments/paypal/webhook`

**Unterstützte Events:**
- `PAYMENT.CAPTURE.COMPLETED` → Aktiviert Subscription
- `PAYMENT.CAPTURE.DENIED` → Loggt abgelehnte Zahlung
- `PAYMENT.CAPTURE.REFUNDED` → Deaktiviert Subscription
- `CHECKOUT.ORDER.APPROVED` → Order genehmigt

**Screenshot:** `docs/screenshots/paypal-webhook-config.png`

---

## ⚙️ Setup & Konfiguration

### 1. Environment Variables

Erstelle `.env.local` im `frontend/` Verzeichnis:

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PayPal
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_MODE=sandbox

# Supabase (für Subscription-Aktivierung)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

**Vollständige Liste:** Siehe `frontend/ENV_SETUP.md`

### 2. Stripe Account Setup

1. **Account erstellen:** https://dashboard.stripe.com/
2. **API Keys generieren:**
   - Developers → API keys
   - Test Keys kopieren (sk_test_... und pk_test_...)
3. **Webhook konfigurieren:**
   - Developers → Webhooks
   - Endpoint URL: `https://your-domain.com/api/payments/stripe/webhook`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`
   - Signing secret kopieren (whsec_...)

**Screenshot:** `docs/screenshots/stripe-dashboard.png`

### 3. PayPal Account Setup

1. **Account erstellen:** https://developer.paypal.com/
2. **App erstellen:**
   - Dashboard → My Apps & Credentials
   - Create App
   - Client ID und Secret kopieren
3. **Webhook konfigurieren:**
   - Dashboard → Webhooks
   - Add Webhook
   - URL: `https://your-domain.com/api/payments/paypal/webhook`
   - Events: `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`, `PAYMENT.CAPTURE.REFUNDED`

**Screenshot:** `docs/screenshots/paypal-dashboard.png`

### 4. SDK Installation

Die SDKs sind bereits installiert:

```bash
npm install stripe @paypal/checkout-server-sdk @stripe/stripe-js @stripe/react-stripe-js
```

---

## 🧪 Testing

### Test-Checkliste

#### Stripe Testing

- [ ] Test Payment Intent erstellen
- [ ] Payment Intent mit Test-Kreditkarte abschließen
- [ ] Webhook-Events empfangen und verarbeiten
- [ ] Subscription-Aktivierung prüfen
- [ ] Fehlerbehandlung testen

**Test-Kreditkarten:**
- Erfolgreich: `4242 4242 4242 4242`
- Fehlgeschlagen: `4000 0000 0000 0002`
- 3D Secure: `4000 0027 6000 3184`

**Screenshot:** `docs/screenshots/stripe-test-cards.png`

#### PayPal Testing

- [ ] Test Order erstellen
- [ ] PayPal Sandbox-Zahlung durchführen
- [ ] Webhook-Events empfangen
- [ ] Subscription-Aktivierung prüfen

**PayPal Sandbox:**
- Test-Account erstellen unter: https://developer.paypal.com/
- Sandbox-Modus verwenden für Tests

**Screenshot:** `docs/screenshots/paypal-sandbox.png`

### Integration Testing

```bash
# 1. Payment Method Detection testen
curl http://localhost:3000/api/payments/methods?currency=EUR&country=DE

# 2. Payment erstellen (Stripe)
curl -X POST http://localhost:3000/api/payments/create \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "stripe",
    "amount": 29.00,
    "currency": "EUR",
    "userId": "test-user-id",
    "subscriptionId": "starter"
  }'

# 3. Webhook testen (Stripe CLI)
stripe listen --forward-to localhost:3000/api/payments/stripe/webhook
stripe trigger payment_intent.succeeded
```

---

## 📸 Screenshots

### Screenshot-Generierung

Screenshots können automatisch generiert werden mit:

```bash
# Development Server muss laufen auf Port 3999
npm run screenshots:payment
```

Oder einzeln:

```bash
# Öffne Browser auf: http://localhost:3999/de/screenshots?section=checkout-page
# Mache Screenshot manuell
```

### Frontend Screenshots

#### Checkout-Seite
**Datei:** `public/docs/screenshots/checkout-page.png`  
**Beschreibung:** Haupt-Checkout-Seite mit Payment Method Selector und Order Summary  
**Erstellt:** Automatisch via `npm run screenshots:payment`

![Checkout Page](../../frontend/public/docs/screenshots/checkout-page.png)

#### Payment Method Selector
**Datei:** `public/docs/screenshots/payment-method-selector.png`  
**Beschreibung:** Auswahl verfügbarer Zahlungsmethoden basierend auf Location

![Payment Method Selector](../../frontend/public/docs/screenshots/payment-method-selector.png)

#### Payment Method Card
**Datei:** `public/docs/screenshots/payment-method-card.png`  
**Beschreibung:** Einzelne Zahlungsmethoden-Karte mit Auswahl-Indikator

![Payment Method Card](../../frontend/public/docs/screenshots/payment-method-card.png)

#### Checkout Form
**Datei:** `public/docs/screenshots/checkout-form.png`  
**Beschreibung:** Checkout-Formular mit Order Summary und Payment Method

![Checkout Form](../../frontend/public/docs/screenshots/checkout-form.png)

#### Payment Status Success
**Datei:** `public/docs/screenshots/payment-status-success.png`  
**Beschreibung:** Erfolgreiche Zahlung mit Bestätigung

![Payment Status Success](../../frontend/public/docs/screenshots/payment-status-success.png)

#### Payment Status Failed
**Datei:** `public/docs/screenshots/payment-status-failed.png`  
**Beschreibung:** Fehlgeschlagene Zahlung mit Retry-Option

![Payment Status Failed](../../frontend/public/docs/screenshots/payment-status-failed.png)

#### Checkout Success
**Datei:** `public/docs/screenshots/checkout-success.png`  
**Beschreibung:** Checkout Erfolgs-Seite nach erfolgreicher Zahlung

![Checkout Success](../../frontend/public/docs/screenshots/checkout-success.png)

#### Checkout Cancel
**Datei:** `public/docs/screenshots/checkout-cancel.png`  
**Beschreibung:** Checkout Abbruch-Seite wenn Zahlung abgebrochen wurde

![Checkout Cancel](../../frontend/public/docs/screenshots/checkout-cancel.png)

### Backend/Dashboard Screenshots

Diese Screenshots müssen manuell erstellt werden:

#### Stripe Dashboard
**Datei:** `public/docs/screenshots/stripe-dashboard.png`  
**Beschreibung:** Stripe Dashboard mit API Keys und Webhook-Konfiguration  
**Wie erstellen:** 
1. Öffne https://dashboard.stripe.com/
2. Gehe zu Developers → API keys
3. Mache Screenshot
4. Speichere als `public/docs/screenshots/stripe-dashboard.png`

#### PayPal Dashboard
**Datei:** `public/docs/screenshots/paypal-dashboard.png`  
**Beschreibung:** PayPal Developer Dashboard mit App-Credentials  
**Wie erstellen:**
1. Öffne https://developer.paypal.com/
2. Gehe zu Dashboard → My Apps & Credentials
3. Mache Screenshot
4. Speichere als `public/docs/screenshots/paypal-dashboard.png`

#### Stripe Webhook Config
**Datei:** `public/docs/screenshots/stripe-webhook-config.png`  
**Beschreibung:** Stripe Webhook-Konfiguration mit Endpoint-URL und Events  
**Wie erstellen:**
1. Öffne Stripe Dashboard → Developers → Webhooks
2. Erstelle neuen Webhook oder öffne existierenden
3. Mache Screenshot der Konfiguration
4. Speichere als `public/docs/screenshots/stripe-webhook-config.png`

#### PayPal Webhook Config
**Datei:** `public/docs/screenshots/paypal-webhook-config.png`  
**Beschreibung:** PayPal Webhook-Konfiguration mit Endpoint-URL und Events  
**Wie erstellen:**
1. Öffne PayPal Developer Dashboard → Webhooks
2. Erstelle neuen Webhook oder öffne existierenden
3. Mache Screenshot der Konfiguration
4. Speichere als `public/docs/screenshots/paypal-webhook-config.png`

### Supabase Screenshots

#### Subscription Table
**Datei:** `public/docs/screenshots/supabase-subscriptions.png`  
**Beschreibung:** Supabase subscriptions Tabelle mit aktivierten Subscriptions  
**Wie erstellen:**
1. Öffne Supabase Dashboard → Table Editor
2. Öffne `subscriptions` Tabelle
3. Mache Screenshot
4. Speichere als `public/docs/screenshots/supabase-subscriptions.png`

#### Payment Logs
**Datei:** `public/docs/screenshots/payment-logs.png`  
**Beschreibung:** Payment-Logs in Console/Supabase  
**Wie erstellen:**
1. Öffne Server-Logs oder Supabase Logs
2. Filtere nach Payment-Events
3. Mache Screenshot
4. Speichere als `public/docs/screenshots/payment-logs.png`

---

## 🔗 Wichtige Links

### Dokumentation
- [Stripe Docs](https://stripe.com/docs)
- [PayPal Docs](https://developer.paypal.com/docs)
- [Supabase Docs](https://supabase.com/docs)

### Developer Portals
- [Stripe Dashboard](https://dashboard.stripe.com/)
- [PayPal Developer](https://developer.paypal.com/)
- [Supabase Dashboard](https://supabase.com/dashboard)

### Projekt-Dokumentation
- [Payment System Status](./ZAHLUNGSSYSTEME_STATUS.md)
- [Payment Methods Analysis](./ZAHLUNGSMETHODEN_ANALYSE_2025.md)
- [Payment Provider Costs](./ZAHLUNGSANBIETER_KOSTEN_2025.md)
- [Environment Setup](../../frontend/ENV_SETUP.md)

---

## ⚠️ Wichtige Hinweise

1. **Security:**
   - Credentials niemals committen
   - Webhook-Signaturen immer verifizieren
   - Service Role Key nur Server-seitig verwenden

2. **Testing:**
   - Immer zuerst im Sandbox/Test-Modus testen
   - Webhook-Endpoints lokal mit Stripe CLI testen
   - Payment-Flows vollständig testen

3. **Error Handling:**
   - Alle Payment-Errors loggen
   - User-Feedback bei Fehlern
   - Retry-Logic implementieren

4. **Compliance:**
   - PCI-DSS Anforderungen beachten
   - GDPR-konformes Payment-Handling
   - Lokale Regulierungen beachten

---

## 📝 Nächste Schritte

### Kurzfristig
1. ✅ Stripe + PayPal Integration (abgeschlossen)
2. ⏳ Environment Variables konfigurieren
3. ⏳ Testing im Sandbox-Modus
4. ⏳ Screenshots aufnehmen

### Mittelfristig
1. ⏳ Mollie Integration (Europa)
2. ⏳ Paystack Integration (Afrika)
3. ⏳ Mercado Pago Integration (Südamerika)
4. ⏳ Payment-History-Tabelle in Supabase

### Langfristig
1. ⏳ Mobile Money Provider (M-Pesa, MTN, etc.)
2. ⏳ Asiatische Provider (WeChat Pay, Alipay, etc.)
3. ⏳ Recurring Payments/Subscriptions
4. ⏳ Payment-Analytics Dashboard

---

**Letzte Aktualisierung:** November 2025  
**Version:** 1.0.0

