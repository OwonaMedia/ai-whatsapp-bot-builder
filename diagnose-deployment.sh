#!/bin/bash
# Diagnose-Skript für Deployment-Probleme
# Verwendung: ./diagnose-deployment.sh

# Farben
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

SERVER="goneo-server"
SERVER_DIR="/var/www/whatsapp-bot-builder"
APP_NAME="whatsapp-bot-builder"
DOMAIN="whatsapp.owona.de"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}🔍 Deployment-Diagnose${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. PM2 Status
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}1. PM2 Status${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ssh "$SERVER" "pm2 status" 2>&1
echo ""

# 2. PM2 Logs (letzte 30 Zeilen)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}2. PM2 Logs (letzte 30 Zeilen)${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ssh "$SERVER" "pm2 logs $APP_NAME --lines 30 --nostream" 2>&1
echo ""

# 3. Port 3000 prüfen
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}3. Port 3000 Status${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ssh "$SERVER" "netstat -tulpn | grep 3000 || ss -tulpn | grep 3000 || echo 'Port 3000 nicht aktiv'" 2>&1
echo ""

# 4. Build-Verzeichnis prüfen
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}4. Build-Verzeichnis${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ssh "$SERVER" "cd $SERVER_DIR && ls -la .next/ 2>/dev/null | head -10 || echo 'Build-Verzeichnis nicht gefunden'" 2>&1
echo ""

# 5. Localhost Health-Check
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}5. Localhost Health-Check${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ssh "$SERVER" "curl -s http://localhost:3000/api/health || curl -s http://127.0.0.1:3000/api/health || echo 'Health-Check fehlgeschlagen'" 2>&1
echo ""

# 6. Caddy Status
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}6. Caddy/Nginx Status${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ssh "$SERVER" "systemctl status caddy --no-pager -l 2>/dev/null || systemctl status nginx --no-pager -l 2>/dev/null || echo 'Caddy/Nginx nicht gefunden'" 2>&1
echo ""

# 7. Caddy Config prüfen
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}7. Caddy Config${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ssh "$SERVER" "cat /etc/caddy/Caddyfile 2>/dev/null | grep -A 10 '$DOMAIN' || echo 'Caddyfile nicht gefunden oder Domain nicht konfiguriert'" 2>&1
echo ""

# 8. Verzeichnisstruktur
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}8. Verzeichnisstruktur${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ssh "$SERVER" "cd $SERVER_DIR && echo 'Hauptverzeichnis:' && pwd && echo '' && echo 'Inhalt:' && ls -la | head -15" 2>&1
echo ""

# 9. Ecosystem Config
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}9. PM2 Ecosystem Config${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ssh "$SERVER" "cd $SERVER_DIR && cat ecosystem.config.js 2>/dev/null || echo 'ecosystem.config.js nicht gefunden'" 2>&1
echo ""

# 10. Node/NPM Version
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}10. Node/NPM Version${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ssh "$SERVER" "node --version && npm --version" 2>&1
echo ""

# 11. Externer Test
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}11. Externer Test${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Testing: https://$DOMAIN"
curl -s -I "https://$DOMAIN" | head -10
echo ""
echo "Testing: https://$DOMAIN/api/health"
curl -s "https://$DOMAIN/api/health" || echo "Health-Check fehlgeschlagen"
echo ""

# Zusammenfassung
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}📊 Diagnose-Zusammenfassung${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Prüfe die obigen Ausgaben auf:"
echo "  - PM2 Status (sollte 'online' sein)"
echo "  - Port 3000 (sollte aktiv sein)"
echo "  - Build-Verzeichnis (sollte existieren)"
echo "  - Caddy Config (sollte Domain enthalten)"
echo "  - Health-Check (sollte funktionieren)"
echo ""











