#!/bin/bash

# Script zum automatischen Setzen von GROQ_API_KEY für Supabase Edge Functions
# Nutzt die Supabase CLI

set -e

PROJECT_REF="ugsezgnkyhcmsdpohuwf"
SUPABASE_URL="https://ugsezgnkyhcmsdpohuwf.supabase.co"

echo "🔐 Setting GROQ_API_KEY for Supabase Edge Functions"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Prüfe ob Supabase CLI installiert ist
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI nicht gefunden."
    echo "   Installiere: brew install supabase/tap/supabase"
    exit 1
fi

# Suche GROQ_API_KEY in verschiedenen .env Dateien
GROQ_KEY=""

# Versuche verschiedene .env Dateien
ENV_FILES=(
    "support-mcp-server/.env"
    "frontend/.env.local"
    ".env.local"
    ".env"
)

for env_file in "${ENV_FILES[@]}"; do
    if [ -f "$env_file" ]; then
        GROQ_KEY=$(grep -E "^GROQ_API_KEY=" "$env_file" 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'" | xargs)
        if [ -n "$GROQ_KEY" ] && [ "$GROQ_KEY" != "sk_your_groq_api_key" ] && [ "${#GROQ_KEY}" -gt 10 ]; then
            echo "✅ GROQ_API_KEY gefunden in: $env_file"
            break
        fi
    fi
done

# Prüfe ob Key gefunden wurde
if [ -z "$GROQ_KEY" ] || [ "$GROQ_KEY" = "sk_your_groq_api_key" ] || [ "${#GROQ_KEY}" -lt 10 ]; then
    echo "❌ GROQ_API_KEY nicht gefunden oder ungültig"
    echo ""
    echo "Bitte setze GROQ_API_KEY manuell:"
    echo "   1. Öffne: https://supabase.com/dashboard/project/$PROJECT_REF/settings/functions"
    echo "   2. Füge hinzu: GROQ_API_KEY = dein_groq_api_key"
    exit 1
fi

echo "✅ GROQ_API_KEY gefunden: ${GROQ_KEY:0:15}..."
echo ""

# Prüfe ob bereits eingeloggt
if ! supabase projects list &>/dev/null; then
    echo "⚠️  Nicht bei Supabase eingeloggt."
    echo "   Führe aus: supabase login"
    echo "   Dann führe dieses Script erneut aus."
    exit 1
fi

# Prüfe ob Projekt verknüpft ist
if [ ! -f .supabase/config.toml ]; then
    echo "⚠️  Projekt nicht verknüpft. Versuche zu verknüpfen..."
    supabase link --project-ref "$PROJECT_REF" || {
        echo "❌ Projekt-Verknüpfung fehlgeschlagen"
        echo "   Bitte manuell: supabase link --project-ref $PROJECT_REF"
        exit 1
    }
fi

# Setze Secret
echo "📤 Setze GROQ_API_KEY als Secret..."
supabase secrets set GROQ_API_KEY="$GROQ_KEY"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ GROQ_API_KEY erfolgreich gesetzt!"
    echo ""
    echo "📋 Nächste Schritte:"
    echo "   1. Die Edge Functions sollten jetzt LLM-Antworten zurückgeben"
    echo "   2. Teste den Chatbot auf https://whatsapp.owona.de/de"
    echo "   3. Prüfe Logs in Supabase Dashboard → Edge Functions → Logs"
    echo ""
    echo "🔍 Verifizierung:"
    echo "   supabase secrets list"
else
    echo ""
    echo "❌ Fehler beim Setzen des Secrets"
    echo ""
    echo "Bitte manuell setzen:"
    echo "   1. Öffne: https://supabase.com/dashboard/project/$PROJECT_REF/settings/functions"
    echo "   2. Füge hinzu: GROQ_API_KEY = $GROQ_KEY"
    exit 1
fi





