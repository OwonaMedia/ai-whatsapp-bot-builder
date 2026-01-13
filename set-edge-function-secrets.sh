#!/bin/bash

# Script zum Setzen von GROQ_API_KEY für Supabase Edge Functions
# Nutzt die Supabase CLI

set -e

echo "🔐 Setting GROQ_API_KEY for Supabase Edge Functions"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Prüfe ob Supabase CLI installiert ist
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI nicht gefunden. Bitte installieren:"
    echo "   brew install supabase/tap/supabase"
    exit 1
fi

# Prüfe ob Projekt verknüpft ist
if [ ! -f .supabase/config.toml ]; then
    echo "⚠️  Projekt nicht verknüpft. Versuche zu verknüpfen..."
    echo "   Bitte führe manuell aus: supabase link --project-ref ugsezgnkyhcmsdpohuwf"
    echo "   Oder: supabase login && supabase link"
    exit 1
fi

# Suche GROQ_API_KEY in verschiedenen .env Dateien
GROQ_KEY=""

if [ -f support-mcp-server/.env ]; then
    GROQ_KEY=$(grep -E "^GROQ_API_KEY=" support-mcp-server/.env | cut -d '=' -f2- | tr -d '"' | tr -d "'" | xargs)
fi

if [ -z "$GROQ_KEY" ] && [ -f frontend/.env.local ]; then
    GROQ_KEY=$(grep -E "^GROQ_API_KEY=" frontend/.env.local | cut -d '=' -f2- | tr -d '"' | tr -d "'" | xargs)
fi

if [ -z "$GROQ_KEY" ] && [ -f .env.local ]; then
    GROQ_KEY=$(grep -E "^GROQ_API_KEY=" .env.local | cut -d '=' -f2- | tr -d '"' | tr -d "'" | xargs)
fi

# Prüfe ob Key gefunden wurde
if [ -z "$GROQ_KEY" ] || [ "$GROQ_KEY" = "sk_your_groq_api_key" ] || [ "$GROQ_KEY" = "" ]; then
    echo "❌ GROQ_API_KEY nicht gefunden in .env Dateien"
    echo ""
    echo "Bitte setze GROQ_API_KEY manuell:"
    echo "   supabase secrets set GROQ_API_KEY=dein_groq_api_key"
    echo ""
    echo "Oder füge ihn zu einer .env Datei hinzu:"
    echo "   support-mcp-server/.env"
    echo "   frontend/.env.local"
    exit 1
fi

echo "✅ GROQ_API_KEY gefunden: ${GROQ_KEY:0:15}..."
echo ""

# Setze Secret für Edge Functions
echo "📤 Setze GROQ_API_KEY als Secret für Edge Functions..."
supabase secrets set GROQ_API_KEY="$GROQ_KEY"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ GROQ_API_KEY erfolgreich gesetzt!"
    echo ""
    echo "📋 Nächste Schritte:"
    echo "   1. Die Edge Functions sollten jetzt LLM-Antworten zurückgeben"
    echo "   2. Teste den Chatbot auf https://whatsapp.owona.de/de"
    echo "   3. Prüfe Logs in Supabase Dashboard → Edge Functions → Logs"
else
    echo ""
    echo "❌ Fehler beim Setzen des Secrets"
    echo ""
    echo "Bitte manuell setzen:"
    echo "   supabase secrets set GROQ_API_KEY=\"$GROQ_KEY\""
    exit 1
fi





