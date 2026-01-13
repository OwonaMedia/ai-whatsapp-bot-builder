#!/bin/bash

# Script zur Synchronisation aller Screenshots auf den Server
# Verwendung: ./scripts/sync-images.sh

set -e

REMOTE_HOST="root@whatsapp.owona.de"
REMOTE_PATH="/var/www/whatsapp-bot-builder/products/ai-whatsapp-bot-builder/frontend/public"
LOCAL_PATH="$(cd "$(dirname "$0")/.." && pwd)/public"

echo "🖼️  Synchronisiere Screenshots auf Server..."

# Prüfe ob lokale Verzeichnisse existieren
if [ ! -d "$LOCAL_PATH/screenshots" ]; then
  echo "❌ Lokales Verzeichnis $LOCAL_PATH/screenshots existiert nicht"
  exit 1
fi

if [ ! -d "$LOCAL_PATH/docs/screenshots" ]; then
  echo "❌ Lokales Verzeichnis $LOCAL_PATH/docs/screenshots existiert nicht"
  exit 1
fi

# Erstelle Remote-Verzeichnisse falls nicht vorhanden
echo "📁 Erstelle Remote-Verzeichnisse..."
ssh "$REMOTE_HOST" "mkdir -p $REMOTE_PATH/screenshots $REMOTE_PATH/docs/screenshots"

# Synchronisiere Screenshots
echo "📤 Synchronisiere Hauptseite-Screenshots..."
rsync -avz --progress "$LOCAL_PATH/screenshots/" "$REMOTE_HOST:$REMOTE_PATH/screenshots/"

echo "📤 Synchronisiere Dokumentations-Screenshots..."
rsync -avz --progress "$LOCAL_PATH/docs/screenshots/" "$REMOTE_HOST:$REMOTE_PATH/docs/screenshots/"

# Setze Dateiberechtigungen
echo "🔐 Setze Dateiberechtigungen..."
ssh "$REMOTE_HOST" "chmod -R 644 $REMOTE_PATH/screenshots/* $REMOTE_PATH/docs/screenshots/* 2>/dev/null || true"
ssh "$REMOTE_HOST" "chmod 755 $REMOTE_PATH/screenshots $REMOTE_PATH/docs/screenshots"

# Validiere Bild-Existenz
echo "✅ Validiere Bild-Existenz..."
LOCAL_COUNT=$(find "$LOCAL_PATH/screenshots" -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" \) | wc -l | tr -d ' ')
REMOTE_COUNT=$(ssh "$REMOTE_HOST" "find $REMOTE_PATH/screenshots -type f \( -name '*.png' -o -name '*.jpg' -o -name '*.jpeg' \) 2>/dev/null | wc -l" | tr -d ' ')

LOCAL_DOCS_COUNT=$(find "$LOCAL_PATH/docs/screenshots" -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" \) | wc -l | tr -d ' ')
REMOTE_DOCS_COUNT=$(ssh "$REMOTE_HOST" "find $REMOTE_PATH/docs/screenshots -type f \( -name '*.png' -o -name '*.jpg' -o -name '*.jpeg' \) 2>/dev/null | wc -l" | tr -d ' ')

echo ""
echo "📊 Synchronisation abgeschlossen:"
echo "   Hauptseite: $LOCAL_COUNT lokale → $REMOTE_COUNT remote"
echo "   Dokumentation: $LOCAL_DOCS_COUNT lokale → $REMOTE_DOCS_COUNT remote"

if [ "$LOCAL_COUNT" -eq "$REMOTE_COUNT" ] && [ "$LOCAL_DOCS_COUNT" -eq "$REMOTE_DOCS_COUNT" ]; then
  echo "✅ Alle Bilder erfolgreich synchronisiert!"
  exit 0
else
  echo "⚠️  Warnung: Anzahl der Bilder stimmt nicht überein"
  exit 1
fi

