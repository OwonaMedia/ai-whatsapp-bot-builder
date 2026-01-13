#!/bin/bash
# Vollständiges automatisches Deployment für whatsapp.owona.de
# Verwendung: ./deploy-full-automated.sh

set -e

# Farben für Output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Server-Konfiguration
SERVER="goneo-server"
SERVER_DIR="/var/www/whatsapp-bot-builder"
APP_NAME="whatsapp-bot-builder"
DOMAIN="whatsapp.owona.de"

# Log-Datei
LOG_FILE="/tmp/deployment_$(date +%Y%m%d_%H%M%S).log"
echo "Deployment-Log: $LOG_FILE" | tee "$LOG_FILE"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}🚀 Vollständiges automatisches Deployment${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Funktion: SSH-Befehl ausführen
run_ssh() {
    local cmd="$1"
    local description="$2"
    
    echo -e "${YELLOW}▶ $description${NC}"
    echo "Befehl: $cmd" | tee -a "$LOG_FILE"
    
    if ssh "$SERVER" "$cmd" 2>&1 | tee -a "$LOG_FILE"; then
        echo -e "${GREEN}✓ $description erfolgreich${NC}"
        echo ""
        return 0
    else
        echo -e "${RED}✗ $description fehlgeschlagen${NC}"
        echo ""
        return 1
    fi
}

# Schritt 1: SSH-Verbindung testen
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Schritt 1: SSH-Verbindung testen${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if ssh -o ConnectTimeout=5 "$SERVER" "echo 'SSH-Verbindung OK'" &>/dev/null; then
    echo -e "${GREEN}✓ SSH-Verbindung erfolgreich${NC}"
    SERVER_INFO=$(ssh "$SERVER" "hostname && uname -a" 2>/dev/null)
    echo "Server: $SERVER_INFO"
    echo ""
else
    echo -e "${RED}✗ SSH-Verbindung fehlgeschlagen${NC}"
    echo ""
    echo "Bitte manuell verbinden: ssh $SERVER"
    exit 1
fi

# Schritt 2: Ins Projekt-Verzeichnis wechseln und Status prüfen
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Schritt 2: Status prüfen${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

run_ssh "cd $SERVER_DIR && pwd" "Verzeichnis prüfen"

# PM2 Status
echo -e "${YELLOW}▶ PM2 Status${NC}"
ssh "$SERVER" "pm2 status" 2>&1 | tee -a "$LOG_FILE"
echo ""

# Prüfe Build-Verzeichnis
echo -e "${YELLOW}▶ Prüfe Build-Verzeichnis${NC}"
ssh "$SERVER" "cd $SERVER_DIR && ls -la .next/ 2>/dev/null || echo 'Kein Build vorhanden'" | tee -a "$LOG_FILE"
echo ""

# Prüfe Verzeichnisstruktur
echo -e "${YELLOW}▶ Prüfe Verzeichnisstruktur${NC}"
ssh "$SERVER" "cd $SERVER_DIR && ls -la products/ai-whatsapp-bot-builder/frontend/ 2>/dev/null || echo 'Verzeichnis nicht gefunden'" | tee -a "$LOG_FILE"
echo ""

# Schritt 3: TypeScript-Cache und Build löschen
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Schritt 3: Cache und Build-Artefakte löschen${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

run_ssh "cd $SERVER_DIR && rm -rf .next tsconfig.tsbuildinfo products/ai-whatsapp-bot-builder/frontend/.next products/ai-whatsapp-bot-builder/frontend/tsconfig.tsbuildinfo && echo 'Cache gelöscht'" "Cache und Build-Artefakte löschen"

# Schritt 4: Build durchführen
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Schritt 4: Build durchführen${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo -e "${YELLOW}▶ Starte Build-Prozess...${NC}"
echo "Dies kann einige Minuten dauern..."
echo ""

# Build ohne timeout (macOS-kompatibel)
if ssh "$SERVER" "cd $SERVER_DIR && npm run build" 2>&1 | tee -a "$LOG_FILE"; then
    echo ""
    echo -e "${GREEN}✓ Build erfolgreich abgeschlossen${NC}"
    echo ""
    
    # Prüfe ob Build erstellt wurde
    if ssh "$SERVER" "cd $SERVER_DIR && test -d .next && echo 'Build-Verzeichnis vorhanden'" &>/dev/null; then
        echo -e "${GREEN}✓ Build-Verzeichnis erstellt${NC}"
        BUILD_SIZE=$(ssh "$SERVER" "cd $SERVER_DIR && du -sh .next 2>/dev/null | cut -f1")
        echo "Build-Größe: $BUILD_SIZE"
    else
        echo -e "${RED}✗ Build-Verzeichnis nicht gefunden${NC}"
    fi
else
    echo ""
    echo -e "${RED}✗ Build fehlgeschlagen${NC}"
    echo ""
    echo "Bitte Logs prüfen: $LOG_FILE"
    echo "Oder manuell auf Server: ssh $SERVER"
    exit 1
fi

# Schritt 5: PM2 neu starten
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Schritt 5: PM2 neu starten${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Prüfe ob PM2-App existiert
if ssh "$SERVER" "pm2 list | grep -q $APP_NAME" 2>/dev/null; then
    echo -e "${YELLOW}▶ PM2 App existiert, starte neu...${NC}"
    run_ssh "pm2 restart $APP_NAME" "PM2 App neu starten"
else
    echo -e "${YELLOW}▶ PM2 App existiert nicht, starte neu...${NC}"
    run_ssh "cd $SERVER_DIR && pm2 start ecosystem.config.js" "PM2 App starten"
fi

# PM2 speichern
run_ssh "pm2 save" "PM2 Konfiguration speichern"

# PM2 Status
echo -e "${YELLOW}▶ PM2 Status nach Neustart${NC}"
ssh "$SERVER" "pm2 status" 2>&1 | tee -a "$LOG_FILE"
echo ""

# Warte kurz, damit App starten kann
echo -e "${YELLOW}▶ Warte 5 Sekunden für App-Start...${NC}"
sleep 5

# Schritt 6: Health-Check
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Schritt 6: Health-Check${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Lokaler Health-Check
echo -e "${YELLOW}▶ Lokaler Health-Check (localhost:3000)${NC}"
HEALTH_RESPONSE=$(ssh "$SERVER" "curl -s http://localhost:3000/api/health 2>/dev/null || echo 'FEHLER'" 2>&1)
echo "$HEALTH_RESPONSE" | tee -a "$LOG_FILE"

if echo "$HEALTH_RESPONSE" | grep -q "status.*ok"; then
    echo -e "${GREEN}✓ Health-Check erfolgreich${NC}"
else
    echo -e "${YELLOW}⚠ Health-Check nicht erfolgreich oder App noch nicht bereit${NC}"
    echo "Prüfe PM2 Logs:"
    ssh "$SERVER" "pm2 logs $APP_NAME --lines 20 --nostream" 2>&1 | tee -a "$LOG_FILE"
fi
echo ""

# Externer Health-Check (falls Domain konfiguriert)
echo -e "${YELLOW}▶ Externer Health-Check ($DOMAIN)${NC}"
EXTERNAL_HEALTH=$(curl -s "https://$DOMAIN/api/health" 2>/dev/null || echo "FEHLER")
echo "$EXTERNAL_HEALTH" | tee -a "$LOG_FILE"

if echo "$EXTERNAL_HEALTH" | grep -q "status.*ok"; then
    echo -e "${GREEN}✓ Externer Health-Check erfolgreich${NC}"
else
    echo -e "${YELLOW}⚠ Externer Health-Check nicht erfolgreich${NC}"
fi
echo ""

# Schritt 7: PM2 Logs prüfen
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Schritt 7: PM2 Logs prüfen${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo -e "${YELLOW}▶ Letzte 30 Zeilen der PM2 Logs${NC}"
ssh "$SERVER" "pm2 logs $APP_NAME --lines 30 --nostream" 2>&1 | tee -a "$LOG_FILE"
echo ""

# Schritt 8: Zusammenfassung
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}📊 Deployment-Zusammenfassung${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# PM2 Status
echo -e "${YELLOW}PM2 Status:${NC}"
ssh "$SERVER" "pm2 status" 2>&1

echo ""
echo -e "${YELLOW}Server-Informationen:${NC}"
ssh "$SERVER" "echo 'Verzeichnis:' && cd $SERVER_DIR && pwd && echo '' && echo 'Build-Verzeichnis:' && ls -la .next/ 2>/dev/null | head -5 || echo 'Nicht gefunden'" 2>&1

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Deployment abgeschlossen!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Nächste Schritte:"
echo "  1. Browser-Test: https://$DOMAIN"
echo "  2. Health-Check: https://$DOMAIN/api/health"
echo "  3. Dashboard: https://$DOMAIN/de/dashboard"
echo ""
echo "📝 Log-Datei: $LOG_FILE"
echo ""
echo "🔍 Bei Problemen:"
echo "  - PM2 Logs: ssh $SERVER 'pm2 logs $APP_NAME'"
echo "  - Server-Status: ssh $SERVER 'pm2 status'"
echo "  - Build prüfen: ssh $SERVER 'cd $SERVER_DIR && ls -la .next/'"
echo ""

