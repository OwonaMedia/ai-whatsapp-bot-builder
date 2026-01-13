#!/bin/bash
# Script zum Erstellen eines Stripe Webhook-Endpoints
# Verwendet die Stripe API direkt

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Environment Variables
STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY:-}"
WEBHOOK_URL="${WEBHOOK_URL:-https://whatsapp.owona.de/api/payments/stripe/webhook}"

# Prüfe ob STRIPE_SECRET_KEY gesetzt ist
if [ -z "$STRIPE_SECRET_KEY" ]; then
    echo -e "${RED}❌ STRIPE_SECRET_KEY ist nicht gesetzt!${NC}"
    echo "Bitte setze STRIPE_SECRET_KEY in deinen Environment Variables."
    echo ""
    echo "Beispiel:"
    echo "  export STRIPE_SECRET_KEY=sk_test_..."
    echo "  ./scripts/setup-stripe-webhook.sh"
    exit 1
fi

echo -e "${GREEN}🔧 Erstelle Stripe Webhook-Endpoint...${NC}"
echo "📍 URL: $WEBHOOK_URL"
echo ""

# Webhook Events
EVENTS='payment_intent.succeeded,payment_intent.payment_failed,payment_intent.canceled,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted'

# Erstelle Webhook-Endpoint mit curl
RESPONSE=$(curl -s -X POST https://api.stripe.com/v1/webhook_endpoints \
  -u "$STRIPE_SECRET_KEY:" \
  -d "url=$WEBHOOK_URL" \
  -d "enabled_events[]=payment_intent.succeeded" \
  -d "enabled_events[]=payment_intent.payment_failed" \
  -d "enabled_events[]=payment_intent.canceled" \
  -d "enabled_events[]=customer.subscription.created" \
  -d "enabled_events[]=customer.subscription.updated" \
  -d "enabled_events[]=customer.subscription.deleted" \
  -d "description=WhatsApp Bot Builder - Payment Webhook")

# Prüfe ob Fehler aufgetreten ist
if echo "$RESPONSE" | grep -q '"error"'; then
    echo -e "${RED}❌ Fehler beim Erstellen des Webhook-Endpoints:${NC}"
    echo "$RESPONSE" | jq -r '.error.message' 2>/dev/null || echo "$RESPONSE"
    exit 1
fi

# Extrahiere Webhook-Details
WEBHOOK_ID=$(echo "$RESPONSE" | jq -r '.id' 2>/dev/null)
WEBHOOK_SECRET=$(echo "$RESPONSE" | jq -r '.secret' 2>/dev/null)

if [ -z "$WEBHOOK_ID" ] || [ "$WEBHOOK_ID" = "null" ]; then
    echo -e "${RED}❌ Konnte Webhook-Details nicht extrahieren${NC}"
    echo "$RESPONSE"
    exit 1
fi

echo -e "${GREEN}✅ Webhook-Endpoint erfolgreich erstellt!${NC}"
echo ""
echo "📋 Details:"
echo "   ID: $WEBHOOK_ID"
echo "   URL: $WEBHOOK_URL"
echo ""
echo -e "${YELLOW}🔐 Signing Secret:${NC}"
echo "   $WEBHOOK_SECRET"
echo ""
echo -e "${YELLOW}⚠️  WICHTIG: Kopiere den Signing Secret und füge ihn zu deinen Environment Variables hinzu:${NC}"
echo "   STRIPE_WEBHOOK_SECRET=$WEBHOOK_SECRET"
echo ""
echo -e "${GREEN}✅ Webhook ist jetzt aktiv und empfängt Events!${NC}"

