#!/bin/bash

# Deployment-Script für Support MCP Server auf Remote-Server
# Verwendet rsync um Code auf den Server zu kopieren

set -e

# Konfiguration
REMOTE_HOST="whatsapp.owona.de"
REMOTE_USER="root"
REMOTE_PATH="/var/www/whatsapp-bot-builder/support-mcp-server"
LOCAL_PATH="$(cd "$(dirname "$0")" && pwd)"

echo "🚀 DEPLOY SUPPORT MCP SERVER"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📍 Lokaler Pfad: $LOCAL_PATH"
echo "🌐 Remote: $REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH"
echo ""

# 1. Build lokal
echo "1️⃣  Build lokal..."
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Build fehlgeschlagen!"
  exit 1
fi
echo "✅ Build erfolgreich"
echo ""

# 2. Code auf Server kopieren (rsync)
echo "2️⃣  Kopiere Code auf Server..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '*.log' \
  --exclude 'dist' \
  --exclude '.env*' \
  "$LOCAL_PATH/" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/"

# dist/ separat kopieren (wichtig!)
rsync -avz \
  "$LOCAL_PATH/dist/" "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/dist/"

if [ $? -ne 0 ]; then
  echo "❌ rsync fehlgeschlagen!"
  exit 1
fi
echo "✅ Code kopiert"
echo ""

# 3. Auf Server: npm install und PM2 restart
echo "3️⃣  Installiere Dependencies und starte PM2 neu..."
ssh "$REMOTE_USER@$REMOTE_HOST" << 'ENDSSH'
  cd /var/www/whatsapp-bot-builder/support-mcp-server
  
  # Installiere Dependencies
  echo "→ npm install..."
  npm install --omit=dev --legacy-peer-deps
  
  # PM2 neu starten mit aktualisierten Umgebungsvariablen
  echo "→ PM2 restart..."
  pm2 restart support-mcp-server --update-env
  pm2 restart file-writer-worker --update-env
  
  # Status prüfen
  echo "→ PM2 Status:"
  pm2 list | grep -E "(support-mcp-server|file-writer-worker)"
  
  echo "✅ Deployment abgeschlossen"
ENDSSH

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ DEPLOYMENT ERFOLGREICH"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Nächste Schritte:"
echo "   1. Prüfe Logs: pm2 logs support-mcp-server"
echo "   2. Prüfe Health: curl http://localhost:3002/health"
echo "   3. Teste Ticket-Verarbeitung mit einem neuen Ticket"

