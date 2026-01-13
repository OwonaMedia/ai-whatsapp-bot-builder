#!/bin/bash

# Build Script mit Supabase-Umgebungsvariablen
# Dieses Script lädt die Variablen aus .env.local und baut die App

cd /var/www/whatsapp-bot-builder/frontend

# Lade Variablen aus .env.local im Hauptverzeichnis
if [ -f ../.env.local ]; then
    echo "📝 Lade Umgebungsvariablen aus ../.env.local..."
    export $(grep -v '^#' ../.env.local | xargs)
fi

# Build mit Variablen
echo "🔨 Baue App mit Supabase-Variablen..."
npm run build

echo "✅ Build abgeschlossen!"









