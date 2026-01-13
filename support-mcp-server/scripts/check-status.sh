#!/bin/bash
# Prüft den Status des MCP Support-Servers

echo "🔍 MCP SUPPORT SERVER STATUS-CHECK"
echo "=================================="
echo ""

# Prüfe PM2
echo "1. PM2 Status:"
if command -v pm2 &> /dev/null; then
    pm2 list | grep -i support || echo "   ❌ support-mcp-server läuft nicht"
else
    echo "   ⚠️  PM2 nicht installiert"
fi

echo ""

# Prüfe Health-Check
echo "2. Health-Check Endpoint:"
HEALTH_PORT=${HEALTH_CHECK_PORT:-3002}
if curl -s -f "http://localhost:${HEALTH_PORT}/health" > /dev/null 2>&1; then
    echo "   ✅ Health-Check erreichbar (Port ${HEALTH_PORT})"
    curl -s "http://localhost:${HEALTH_PORT}/health" | jq '.' 2>/dev/null || curl -s "http://localhost:${HEALTH_PORT}/health"
else
    echo "   ❌ Health-Check nicht erreichbar (Port ${HEALTH_PORT})"
fi

echo ""

# Prüfe Logs
echo "3. Letzte Log-Einträge:"
if command -v pm2 &> /dev/null; then
    pm2 logs support-mcp-server --lines 5 --nostream 2>/dev/null || echo "   ⚠️  Keine Logs gefunden"
else
    echo "   ⚠️  PM2 nicht verfügbar - Logs können nicht geprüft werden"
fi

echo ""

# Prüfe Prozess
echo "4. Prozess-Status:"
if pgrep -f "support-mcp-server" > /dev/null; then
    echo "   ✅ Prozess läuft"
    ps aux | grep -i "support-mcp-server" | grep -v grep | head -1
else
    echo "   ❌ Prozess läuft nicht"
fi

echo ""
echo "=================================="
echo "💡 Server starten:"
echo "   cd support-mcp-server"
echo "   pm2 start ecosystem.config.js"
echo ""
echo "💡 Server stoppen:"
echo "   pm2 stop support-mcp-server"
echo ""
echo "💡 Logs anzeigen:"
echo "   pm2 logs support-mcp-server"

