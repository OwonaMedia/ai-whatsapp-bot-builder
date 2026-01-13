#!/bin/bash

# Script zum Setzen von GROQ_API_KEY für Supabase Edge Functions
# Nutzt die Supabase Management API direkt

set -e

echo "🔐 Setting GROQ_API_KEY for Supabase Edge Functions via API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

PROJECT_REF="ugsezgnkyhcmsdpohuwf"
SUPABASE_URL="https://ugsezgnkyhcmsdpohuwf.supabase.co"

# Suche GROQ_API_KEY in .env Dateien
GROQ_KEY=""

if [ -f support-mcp-server/.env ]; then
    GROQ_KEY=$(grep -E "^GROQ_API_KEY=" support-mcp-server/.env 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'" | xargs)
fi

if [ -z "$GROQ_KEY" ] && [ -f frontend/.env.local ]; then
    GROQ_KEY=$(grep -E "^GROQ_API_KEY=" frontend/.env.local 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'" | xargs)
fi

# Prüfe ob Key gefunden wurde
if [ -z "$GROQ_KEY" ] || [ "$GROQ_KEY" = "sk_your_groq_api_key" ] || [ "$GROQ_KEY" = "" ]; then
    echo "❌ GROQ_API_KEY nicht gefunden in .env Dateien"
    echo ""
    echo "Bitte setze GROQ_API_KEY manuell im Supabase Dashboard:"
    echo "   1. Öffne: https://supabase.com/dashboard/project/$PROJECT_REF/settings/functions"
    echo "   2. Füge hinzu: GROQ_API_KEY = dein_groq_api_key"
    exit 1
fi

echo "✅ GROQ_API_KEY gefunden: ${GROQ_KEY:0:15}..."
echo ""
echo "⚠️  Hinweis: Secrets müssen über Supabase Dashboard gesetzt werden."
echo ""
echo "📋 Manuelle Schritte:"
echo "   1. Öffne: https://supabase.com/dashboard/project/$PROJECT_REF/settings/functions"
echo "   2. Scrolle zu 'Secrets' oder 'Environment Variables'"
echo "   3. Füge hinzu:"
echo "      Key: GROQ_API_KEY"
echo "      Value: $GROQ_KEY"
echo "   4. Speichere"
echo ""
echo "Oder nutze Supabase CLI (nach Login):"
echo "   supabase login"
echo "   supabase link --project-ref $PROJECT_REF"
echo "   supabase secrets set GROQ_API_KEY=\"$GROQ_KEY\""





