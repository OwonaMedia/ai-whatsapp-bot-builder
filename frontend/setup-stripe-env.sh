#!/bin/bash
# Stripe Environment Variables Setup Script
# Führt die Stripe Credentials in .env.local ein

ENV_FILE=".env.local"

echo "🔧 Setting up Stripe Environment Variables..."

# Prüfe ob .env.local bereits existiert
if [ -f "$ENV_FILE" ]; then
    echo "⚠️  .env.local already exists. Backing up to .env.local.backup"
    cp "$ENV_FILE" "$ENV_FILE.backup"
fi

# Stripe Credentials
cat >> "$ENV_FILE" << EOF

# Stripe Payment Provider Configuration
# Test Mode Keys (für Entwicklung)
STRIPE_SECRET_KEY=sk_test_REDACTED_FOR_SECURITY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_REDACTED_FOR_SECURITY
STRIPE_WEBHOOK_SECRET=whsec_REDACTED_FOR_SECURITY

# App Configuration
NEXT_PUBLIC_APP_URL=https://whatsapp.owona.de
EOF
NEXT_PUBLIC_APP_NAME=WhatsApp Bot Builder
EOF

echo "✅ Stripe Environment Variables added to $ENV_FILE"
echo ""
echo "📋 Webhook URL für Stripe Dashboard:"
echo "   https://whatsapp.owona.de/api/payments/stripe/webhook"
echo ""
echo "⚠️  WICHTIG: .env.local ist bereits in .gitignore und wird nicht committed!"

