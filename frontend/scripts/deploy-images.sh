#!/bin/bash

# Script zur automatischen Bild-Synchronisation beim Deployment
# Wird von deploy-remote.sh oder anderen Deployment-Scripts aufgerufen

set -e

REMOTE_HOST="${REMOTE_HOST:-root@whatsapp.owona.de}"
REMOTE_PATH="${REMOTE_PATH:-/var/www/whatsapp-bot-builder/products/ai-whatsapp-bot-builder/frontend/public}"
LOCAL_PATH="$(cd "$(dirname "$0")/.." && pwd)/public"

echo "🖼️  Synchronisiere Bilder beim Deployment..."

# Prüfe ob lokale Verzeichnisse existieren
if [ ! -d "$LOCAL_PATH/screenshots" ]; then
  echo "⚠️  Warnung: Lokales Verzeichnis $LOCAL_PATH/screenshots existiert nicht"
fi

if [ ! -d "$LOCAL_PATH/docs/screenshots" ]; then
  echo "⚠️  Warnung: Lokales Verzeichnis $LOCAL_PATH/docs/screenshots existiert nicht"
fi

# Erstelle Remote-Verzeichnisse falls nicht vorhanden
ssh "$REMOTE_HOST" "mkdir -p $REMOTE_PATH/screenshots $REMOTE_PATH/docs/screenshots" || {
  echo "❌ Fehler beim Erstellen der Remote-Verzeichnisse"
  exit 1
}

# Synchronisiere Screenshots (nur wenn Verzeichnisse existieren)
if [ -d "$LOCAL_PATH/screenshots" ]; then
  echo "📤 Synchronisiere Hauptseite-Screenshots..."
  rsync -avz --delete "$LOCAL_PATH/screenshots/" "$REMOTE_HOST:$REMOTE_PATH/screenshots/" || {
    echo "⚠️  Warnung: Fehler beim Synchronisieren der Hauptseite-Screenshots"
  }
fi

if [ -d "$LOCAL_PATH/docs/screenshots" ]; then
  echo "📤 Synchronisiere Dokumentations-Screenshots..."
  rsync -avz --delete "$LOCAL_PATH/docs/screenshots/" "$REMOTE_HOST:$REMOTE_PATH/docs/screenshots/" || {
    echo "⚠️  Warnung: Fehler beim Synchronisieren der Dokumentations-Screenshots"
  }
fi

# Setze Dateiberechtigungen
echo "🔐 Setze Dateiberechtigungen..."
ssh "$REMOTE_HOST" "chmod -R 644 $REMOTE_PATH/screenshots/* $REMOTE_PATH/docs/screenshots/* 2>/dev/null || true"
ssh "$REMOTE_HOST" "chmod 755 $REMOTE_PATH/screenshots $REMOTE_PATH/docs/screenshots"

echo "✅ Bild-Synchronisation abgeschlossen"

