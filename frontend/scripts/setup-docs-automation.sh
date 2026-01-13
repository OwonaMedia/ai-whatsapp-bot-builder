#!/bin/bash

# Setup-Script für Dokumentations-Automatisierung
# Installiert alle Abhängigkeiten und startet Services

echo "🚀 Setup Dokumentations-Automatisierung..."

cd /var/www/whatsapp-bot-builder/frontend || exit 1

# Installiere Abhängigkeiten
echo "📦 Installiere Abhängigkeiten..."
npm install chokidar @modelcontextprotocol/sdk --save-dev --legacy-peer-deps

# Erstelle Verzeichnisse
echo "📁 Erstelle Verzeichnisse..."
mkdir -p mcp-servers
mkdir -p scripts
mkdir -p public/docs/screenshots

# Setze Berechtigungen
echo "🔐 Setze Berechtigungen..."
chmod +x scripts/generate-screenshots.js
chmod +x scripts/watch-docs.js
chmod +x mcp-servers/docs-automation-server.js

# Starte MCP Server als PM2 Service
echo "🔄 Starte MCP Server..."
pm2 delete docs-automation-mcp 2>/dev/null || true
pm2 start mcp-servers/docs-automation-server.js \
  --name docs-automation-mcp \
  --interpreter node \
  --max-restarts 10 \
  --min-uptime 1000

# Starte Watcher als PM2 Service
echo "🔄 Starte Dokumentations-Watcher..."
pm2 delete docs-watcher 2>/dev/null || true
pm2 start scripts/watch-docs.js \
  --name docs-watcher \
  --interpreter node \
  --max-restarts 10 \
  --min-uptime 1000

# Speichere PM2 Konfiguration
pm2 save

echo ""
echo "✅ Setup abgeschlossen!"
echo ""
echo "📊 PM2 Status:"
pm2 list | grep -E "(docs-automation|docs-watcher)"
echo ""
echo "💡 Befehle:"
echo "  - Logs anzeigen: pm2 logs docs-automation-mcp"
echo "  - Watcher-Logs: pm2 logs docs-watcher"
echo "  - Neustart: pm2 restart docs-automation-mcp docs-watcher"
echo "  - Stoppen: pm2 stop docs-automation-mcp docs-watcher"

