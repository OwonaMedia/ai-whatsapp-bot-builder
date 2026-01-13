#!/bin/bash

# Direktes Setzen von GROQ_API_KEY über Supabase Management API
# Nutzt die Service Role Key für direkten API-Zugriff

set -e

PROJECT_REF="ugsezgnkyhcmsdpohuwf"
GROQ_KEY="gsk_REDACTED_FOR_SECURITY"

echo "🔐 Setting GROQ_API_KEY via Supabase Management API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Suche Service Role Key
SERVICE_ROLE_KEY=""

if [ -f frontend/.env.local ]; then
    SERVICE_ROLE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY frontend/.env.local 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'" | xargs)
fi

if [ -z "$SERVICE_ROLE_KEY" ] && [ -f support-mcp-server/.env ]; then
    SERVICE_ROLE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY support-mcp-server/.env 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'" | xargs)
fi

if [ -z "$SERVICE_ROLE_KEY" ]; then
    echo "❌ SUPABASE_SERVICE_ROLE_KEY nicht gefunden"
    echo ""
    echo "Bitte setze GROQ_API_KEY manuell im Dashboard:"
    echo "   https://supabase.com/dashboard/project/$PROJECT_REF/settings/functions"
    echo ""
    echo "Oder nutze Supabase CLI (nach Login):"
    echo "   supabase login"
    echo "   supabase link --project-ref $PROJECT_REF"
    echo "   supabase secrets set GROQ_API_KEY=\"$GROQ_KEY\""
    exit 1
fi

echo "✅ Service Role Key gefunden"
echo "📤 Setze GROQ_API_KEY über Management API..."
echo ""

# Versuche über Management API zu setzen
# Hinweis: Die Management API für Secrets erfordert einen Access Token, nicht die Service Role Key
# Daher nutzen wir die CLI-Methode

echo "⚠️  Management API erfordert Access Token (nicht Service Role Key)"
echo ""
echo "📋 Bitte führe manuell aus:"
echo ""
echo "   1. Öffne: https://supabase.com/dashboard/project/$PROJECT_REF/settings/functions"
echo "   2. Scrolle zu 'Secrets'"
echo "   3. Klicke 'Add Secret'"
echo "   4. Name: GROQ_API_KEY"
echo "   5. Value: $GROQ_KEY"
echo "   6. Speichere"
echo ""
echo "Oder nutze Supabase CLI:"
echo "   supabase login"
echo "   supabase link --project-ref $PROJECT_REF"
echo "   supabase secrets set GROQ_API_KEY=\"$GROQ_KEY\""





