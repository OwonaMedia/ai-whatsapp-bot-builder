# Payment Providers - Setup Guide

Diese Datei enthält alle implementierten Payment Provider mit Platzhaltern für Credentials.

## Übersicht

### Globale Provider
- **Stripe** - Kreditkarten, Apple Pay, Google Pay (weltweit)
- **PayPal** - PayPal, Venmo (weltweit)

### Europa
- **Mollie** - iDEAL (NL), Bancontact (BE), Giropay (DE), Sofort
- **Klarna** - Buy Now, Pay Later (EU, NA)

### Südamerika
- **Mercado Pago** - Brasilien, Argentinien, Chile, Kolumbien, Mexiko
- **Pix** - Instant Payments (Brasilien)

### Afrika
- **Flutterwave** - Westafrika, Ostafrika
- **Paystack** - Nigeria, Ghana
- **M-Pesa** - Kenia, Tansania, Ghana (Safaricom)
- **MTN Mobile Money** - Ghana, Uganda, Ruanda, Kenia
- **Airtel Money** - Kenia, Tansania, Uganda
- **Orange Money** - Westafrika, Zentralafrika

### Asien
- **WeChat Pay** - China
- **Alipay** - China
- **Paytm** - Indien
- **GrabPay** - Singapur, Malaysia, Thailand, Indonesien, Philippinen

## Environment Variables

Alle Provider benötigen Credentials, die als Environment Variables gesetzt werden müssen:

### Stripe
```bash
STRIPE_SECRET_KEY=sk_test_... # oder sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # oder pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

> Für Apple Pay muss zusätzlich die Domain-Verifizierung durchgeführt werden. Siehe `docs/APPLE_PAY_SETUP.md`.

### PayPal
```bash
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_MODE=sandbox # oder 'live'
```

### Mollie
```bash
MOLLIE_API_KEY=test_... # oder live_...
# Optional: MOLLIE_WEBHOOK_URL=https://<domain>/api/payments/mollie/webhook
```

- npm Paket: `npm install @mollie/api-client`
- Unterstützte Methoden aktuell: `ideal`, `bancontact`, `giropay`, `sofort`, `creditcard`
- Redirect-URL kann über `redirectUrl` gesetzt werden, Fallback ist `/[locale]/checkout/success?provider=mollie`

### Klarna
```bash
KLARNA_USERNAME=...
KLARNA_PASSWORD=...
KLARNA_REGION=EU # oder 'NA'
```

- Verwendung der REST API (kein zusätzliches npm Paket notwendig)
- Aktuell wird nur die Session-Erstellung unterstützt (Klarna-Widget folgt)
- Methodeneintrag im Checkout ist deaktiviert, bis die Frontend-Integration abgeschlossen ist

### Mercado Pago
```bash
MERCADO_PAGO_ACCESS_TOKEN=...
MERCADO_PAGO_PUBLIC_KEY=...
```

### Pix (Brasilien)
```bash
PIX_API_KEY=... # Meist über Stripe oder Mercado Pago
PIX_MERCHANT_ID=...
```

### Flutterwave
```bash
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST_... # oder FLWPUBK_...
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST_... # oder FLWSECK_...
FLUTTERWAVE_ENCRYPTION_KEY=...
```

### Paystack
```bash
PAYSTACK_SECRET_KEY=sk_test_... # oder sk_live_...
PAYSTACK_PUBLIC_KEY=pk_test_... # oder pk_live_...
```

### M-Pesa
```bash
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
MPESA_SHORTCODE=174379 # Business Shortcode
MPESA_PASSKEY=...
MPESA_ENVIRONMENT=sandbox # oder 'production'
```

### MTN Mobile Money
```bash
MTN_API_KEY=...
MTN_USER_ID=...
MTN_PRIMARY_KEY=...
MTN_ENVIRONMENT=sandbox # oder 'production'
```

### Airtel Money
```bash
AIRTEL_MONEY_CLIENT_ID=...
AIRTEL_MONEY_CLIENT_SECRET=...
AIRTEL_MONEY_MERCHANT_ID=...
AIRTEL_MONEY_ENVIRONMENT=sandbox # oder 'production'
```

### Orange Money
```bash
ORANGE_MONEY_MERCHANT_ID=...
ORANGE_MONEY_API_KEY=...
ORANGE_MONEY_API_SECRET=...
ORANGE_MONEY_ENVIRONMENT=sandbox # oder 'production'
```

### WeChat Pay
```bash
WECHAT_PAY_APP_ID=...
WECHAT_PAY_MCH_ID=...
WECHAT_PAY_API_KEY=...
WECHAT_PAY_CERT_PATH=... # Optional
```

### Alipay
```bash
ALIPAY_APP_ID=...
ALIPAY_PRIVATE_KEY=...
ALIPAY_PUBLIC_KEY=...
ALIPAY_GATEWAY=https://openapi.alipay.com/gateway.do # oder sandbox URL
```

### Paytm
```bash
PAYTM_MERCHANT_ID=...
PAYTM_MERCHANT_KEY=...
PAYTM_WEBSITE=WEBSTAGING # oder 'WEB'
PAYTM_INDUSTRY_TYPE=Retail
PAYTM_CHANNEL_ID=WEB
```

### GrabPay
```bash
GRABPAY_PARTNER_ID=...
GRABPAY_PARTNER_SECRET=...
GRABPAY_MERCHANT_ID=...
GRABPAY_ENVIRONMENT=sandbox # oder 'production'
```

## Nächste Schritte

1. **Registrierung bei den Anbietern** (wenn nötig)
   - Jeder Provider hat ein Developer Portal/Dashboard
   - Erstelle Accounts für die benötigten Märkte
   - Generiere API Keys/Credentials

2. **Credentials konfigurieren**
   - Setze alle Environment Variables auf dem Server
   - Verwende `.env.local` für lokale Entwicklung
   - Verwende Server Environment Variables für Production

3. **SDKs installieren** (wenn nötig)
   - Die meisten Provider benötigen npm Packages
   - Siehe TODO-Kommentare in den jeweiligen Dateien

4. **Webhooks konfigurieren**
   - Jeder Provider benötigt Webhook-Endpoints
   - Konfiguriere Callback URLs in den Provider-Dashboards

5. **Testing**
   - Teste alle Payment Flows im Sandbox-Modus
   - Validiere Webhook-Handling
   - Teste Error-Handling

## Apple Pay (Stripe Payment Element)

- Apple Pay wird über Stripe automatisch verfügbar, sobald die Domain verifiziert ist und ein unterstütztes Gerät/Browser genutzt wird.
- Die notwendige Datei `apple-developer-merchantid-domain-association` muss unter `public/.well-known/` liegen (Deployment beachten!).
- Detaillierte Schritt-für-Schritt-Anleitung: `../docs/APPLE_PAY_SETUP.md` (Projektwurzel `products/ai-whatsapp-bot-builder/docs`).
- Optionaler Ausbau: Payment Request Button (`PaymentRequestButtonElement`) für Express-Checkout.

## Hinweise

- Stripe & PayPal sind produktiv angebunden (inkl. Webhooks & Invoice-Flow)
- Mollie-Zahlungen werden über das offizielle SDK erstellt und leiten zum Mollie-Checkout
- Klarna-Sessions können erstellt werden; die UI-Integration folgt separat (aktuell deaktiviert)
- Für neue Provider unbedingt Sandbox-Tests durchführen, bevor `live_` Keys gesetzt werden


