#!/bin/bash

# Quick Setup Script für Supabase-Konfiguration
# Usage: ./QUICK_SETUP.sh

echo "🔧 WhatsApp Bot Builder - Supabase Setup"
echo "=========================================="
echo ""
echo "Dieses Script hilft Ihnen, die Supabase-Umgebungsvariablen zu setzen."
echo ""
echo "⚠️  WICHTIG: Sie benötigen:"
echo "   1. Ihre Supabase Project URL (z.B. https://xxxxx.supabase.co)"
echo "   2. Ihren Supabase Anon Key (beginnt mit eyJ...)"
echo ""
echo "Diese finden Sie unter: https://supabase.com/dashboard/project/_/settings/api"
echo ""

# Eingabe der Supabase URL
read -p "📝 Geben Sie Ihre Supabase URL ein: " SUPABASE_URL

# Eingabe des Anon Keys
read -p "📝 Geben Sie Ihren Supabase Anon Key ein: " SUPABASE_ANON_KEY

# Validierung
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "❌ Fehler: Beide Werte müssen eingegeben werden!"
    exit 1
fi

# Prüfen ob PM2 installiert ist
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 ist nicht installiert!"
    exit 1
fi

# Variablen setzen
echo ""
echo "⚙️  Setze Umgebungsvariablen..."
pm2 set whatsapp-bot-builder NEXT_PUBLIC_SUPABASE_URL "$SUPABASE_URL"
pm2 set whatsapp-bot-builder NEXT_PUBLIC_SUPABASE_ANON_KEY "$SUPABASE_ANON_KEY"

# App neu starten
echo "🔄 Starte App neu..."
pm2 restart whatsapp-bot-builder

echo ""
echo "✅ Setup abgeschlossen!"
echo ""
echo "Die App sollte jetzt funktionieren. Prüfen Sie:"
echo "   - Login: https://whatsapp.owona.de/de/auth/login"
echo "   - Homepage: https://whatsapp.owona.de/de"
echo ""
echo "Falls Probleme auftreten, prüfen Sie die Logs mit:"
echo "   pm2 logs whatsapp-bot-builder"









