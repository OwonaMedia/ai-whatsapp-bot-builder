# Environment Variables Setup Guide

Kopiere diese Datei als `.env.local` im `frontend/` Verzeichnis und fülle die Werte aus.

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Internal Support Portal
INTERNAL_PORTAL_EMAIL=sm@owona.de
INTERNAL_PORTAL_PASSWORD_HASH=$2b$10$hXjnroQACOeLo63HE7pz0eSGvQlpZERiND20cptxqmk0ibAfuhMES
INTERNAL_PORTAL_SECRET=set_a_long_random_string_here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=WhatsApp Bot Builder

# Stripe Payment Provider
# Get your keys from: https://dashboard.stripe.com/apikeys
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
# For production, use: sk_live_... and pk_live_...

# PayPal Payment Provider
# Get your credentials from: https://developer.paypal.com/
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_MODE=sandbox
# For production, use: PAYPAL_MODE=live

# Mollie (Europa - Optional)
# MOLLIE_API_KEY=test_...
# For production, use: live_...

# Klarna (Europa - Optional)
# KLARNA_USERNAME=...
# KLARNA_PASSWORD=...
# KLARNA_REGION=EU

# Mercado Pago (Südamerika - Optional)
# MERCADO_PAGO_ACCESS_TOKEN=...
# MERCADO_PAGO_PUBLIC_KEY=...

# Pix (Brasilien - Optional)
# PIX_API_KEY=...
# PIX_MERCHANT_ID=...

# Flutterwave (Afrika - Optional)
# FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST_...
# FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST_...
# FLUTTERWAVE_ENCRYPTION_KEY=...

# Paystack (Nigeria, Ghana - Optional)
# PAYSTACK_SECRET_KEY=sk_test_...
# PAYSTACK_PUBLIC_KEY=pk_test_...

# M-Pesa (Kenia, Tansania - Optional)
# MPESA_CONSUMER_KEY=...
# MPESA_CONSUMER_SECRET=...
# MPESA_SHORTCODE=174379
# MPESA_PASSKEY=...
# MPESA_ENVIRONMENT=sandbox

# MTN Mobile Money (Optional)
# MTN_API_KEY=...
# MTN_USER_ID=...
# MTN_PRIMARY_KEY=...
# MTN_ENVIRONMENT=sandbox

# Airtel Money (Optional)
# AIRTEL_MONEY_CLIENT_ID=...
# AIRTEL_MONEY_CLIENT_SECRET=...
# AIRTEL_MONEY_MERCHANT_ID=...
# AIRTEL_MONEY_ENVIRONMENT=sandbox

# Orange Money (Optional)
# ORANGE_MONEY_MERCHANT_ID=...
# ORANGE_MONEY_API_KEY=...
# ORANGE_MONEY_API_SECRET=...
# ORANGE_MONEY_ENVIRONMENT=sandbox

# WeChat Pay (China - Optional)
# WECHAT_PAY_APP_ID=...
# WECHAT_PAY_MCH_ID=...
# WECHAT_PAY_API_KEY=...
# WECHAT_PAY_CERT_PATH=...

# Alipay (China - Optional)
# ALIPAY_APP_ID=...
# ALIPAY_PRIVATE_KEY=...
# ALIPAY_PUBLIC_KEY=...
# ALIPAY_GATEWAY=https://openapi.alipay.com/gateway.do

# Paytm (Indien - Optional)
# PAYTM_MERCHANT_ID=...
# PAYTM_MERCHANT_KEY=...
# PAYTM_WEBSITE=WEBSTAGING
# PAYTM_INDUSTRY_TYPE=Retail
# PAYTM_CHANNEL_ID=WEB

# GrabPay (Südostasien - Optional)
# GRABPAY_PARTNER_ID=...
# GRABPAY_PARTNER_SECRET=...
# GRABPAY_MERCHANT_ID=...
# GRABPAY_ENVIRONMENT=sandbox
```

## Quick Start (Stripe + PayPal)

### 1. Stripe Setup

1. Gehe zu https://dashboard.stripe.com/ und erstelle einen Account
2. Gehe zu **Developers > API keys**
3. Kopiere die **Secret key** (beginnend mit `sk_test_`) → `STRIPE_SECRET_KEY`
4. Kopiere die **Publishable key** (beginnend mit `pk_test_`) → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
5. Für Webhooks: Gehe zu **Developers > Webhooks** und erstelle einen neuen Webhook
   - URL: `https://your-domain.com/api/payments/stripe/webhook`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`
   - Kopiere den **Signing secret** (beginnend mit `whsec_`) → `STRIPE_WEBHOOK_SECRET`

### 2. PayPal Setup

1. Gehe zu https://developer.paypal.com/ und erstelle einen Account
2. Gehe zu **Dashboard > My Apps & Credentials**
3. Erstelle eine neue App (oder verwende die Sandbox-App)
4. Kopiere die **Client ID** → `PAYPAL_CLIENT_ID`
5. Kopiere das **Secret** → `PAYPAL_CLIENT_SECRET`
6. Für Webhooks: Gehe zu **Dashboard > Webhooks** und erstelle einen neuen Webhook
   - URL: `https://your-domain.com/api/payments/paypal/webhook`
   - Events: `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.DENIED`, `CHECKOUT.ORDER.APPROVED`

## Wichtige Hinweise

- **NIEMALS** `.env.local` committen! Diese Datei ist bereits in `.gitignore`
- Für Production: Verwende `sk_live_...` und `pk_live_...` für Stripe
- Für Production: Setze `PAYPAL_MODE=live` für PayPal
- Teste zuerst im Sandbox/Test-Modus, bevor du zu Production wechselst




