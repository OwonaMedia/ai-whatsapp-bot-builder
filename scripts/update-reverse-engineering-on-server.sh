#!/bin/bash

# Script zum Aktualisieren des Reverse Engineering auf dem Server
# Aktualisiert die Reverse Engineering Dokumentation im MCP Support System

set -e

# Server-Konfiguration (kann via ENV überschrieben werden)
SERVER_USER="${SERVER_USER:-root}"
SERVER_HOST="${SERVER_HOST:-91.99.232.126}"
SERVER_PATH="${SERVER_PATH:-/var/www/whatsapp-bot-builder}"

REVERSE_ENG_DIR="reverse-engineering"
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "🔄 Aktualisiere Reverse Engineering auf dem Server..."
echo "   Server: ${SERVER_USER}@${SERVER_HOST}"
echo "   Pfad: ${SERVER_PATH}"
echo ""

# 1. Aktualisiere Reverse Engineering lokal
echo "📝 Schritt 1/3: Aktualisiere Reverse Engineering lokal..."
cd "$SCRIPT_DIR"
npx tsx scripts/update-reverse-engineering.ts

# 2. Prüfe ob Reverse Engineering Verzeichnis existiert
if [ ! -d "$REVERSE_ENG_DIR" ]; then
  echo "❌ Reverse Engineering Verzeichnis nicht gefunden: $REVERSE_ENG_DIR"
  exit 1
fi

# 3. Upload Reverse Engineering zum Server
echo ""
echo "📤 Schritt 2/3: Lade Reverse Engineering zum Server hoch..."
rsync -avz --delete \
  -e "ssh -o StrictHostKeyChecking=no" \
  "$REVERSE_ENG_DIR/" \
  "${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/${REVERSE_ENG_DIR}/"

# 4. Prüfe ob Support MCP Server läuft und neu starten
echo ""
echo "🔄 Schritt 3/3: Neustarte Support MCP Server (Knowledge Base wird neu geladen)..."
ssh -o StrictHostKeyChecking=no "${SERVER_USER}@${SERVER_HOST}" << EOF
  cd ${SERVER_PATH}/support-mcp-server
  
  # Prüfe ob PM2 läuft
  if pm2 list | grep -q "support-mcp"; then
    echo "🔄 Neustarte Support MCP Server..."
    pm2 restart support-mcp || pm2 start support-mcp || true
    sleep 2
    pm2 status support-mcp
  else
    echo "⚠️ Support MCP Server läuft nicht unter PM2"
    echo "   Versuche zu starten..."
    cd ${SERVER_PATH}/support-mcp-server
    pm2 start dist/index.js --name support-mcp || npm start &
  fi
EOF

echo ""
echo "✅ Reverse Engineering auf dem Server aktualisiert!"
echo "📋 Das MCP Support System hat die aktualisierten Dokumente geladen."
echo ""
echo "🔗 Prüfe Logs: ssh ${SERVER_USER}@${SERVER_HOST} 'pm2 logs support-mcp --lines 20'"

