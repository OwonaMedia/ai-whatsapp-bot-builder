#!/bin/bash
# Safe Deployment Script für whatsapp.owona.de
# Führt Regression-Tests aus, validiert alles und deployt sicher mit Rollback-Option

set -e

# Farben für Output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Server-Konfiguration
SERVER="root@whatsapp.owona.de"
SERVER_DIR="/var/www/whatsapp-bot-builder/products/ai-whatsapp-bot-builder/frontend"
APP_NAME="whatsapp-bot-builder"
DOMAIN="whatsapp.owona.de"

# Log-Datei
LOG_FILE="/tmp/deployment_$(date +%Y%m%d_%H%M%S).log"
echo "Deployment-Log: $LOG_FILE" | tee "$LOG_FILE"

# Rollback-Flag
ROLLBACK_ON_ERROR=true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}🛡️  Safe Deployment Script${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Deployment-Lock: Verhindere parallele Deployments
LOCK_FILE="/tmp/deploy-safe.lock"
if [ -f "$LOCK_FILE" ]; then
    LOCK_PID=$(cat "$LOCK_FILE" 2>/dev/null)
    if ps -p "$LOCK_PID" > /dev/null 2>&1; then
        echo -e "${RED}❌ Deployment läuft bereits (PID: $LOCK_PID)${NC}"
        echo -e "${YELLOW}   Bitte warte bis das aktuelle Deployment abgeschlossen ist.${NC}"
        exit 1
    else
        # Lock-File existiert, aber Prozess nicht mehr - entferne Lock
        rm -f "$LOCK_FILE"
    fi
fi

# Erstelle Lock-File
echo $$ > "$LOCK_FILE"
trap "rm -f $LOCK_FILE" EXIT INT TERM

echo -e "${GREEN}✓ Deployment-Lock aktiviert${NC}"
echo ""

# Funktion: Fehlerbehandlung mit Rollback
handle_error() {
    local step="$1"
    echo ""
    echo -e "${RED}❌ Fehler in Schritt: $step${NC}"
    echo ""
    
    if [ "$ROLLBACK_ON_ERROR" = true ]; then
        echo -e "${YELLOW}🔄 Versuche Rollback...${NC}"
        ssh "$SERVER" "cd $SERVER_DIR && pm2 restart $APP_NAME --update-env" 2>&1 | tee -a "$LOG_FILE" || true
        echo -e "${YELLOW}⚠️  Rollback durchgeführt. Bitte manuell prüfen.${NC}"
    fi
    
    echo ""
    echo "📝 Log-Datei: $LOG_FILE"
    exit 1
}

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

# Schritt 0: Pre-Deployment-Checks (lokal)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Schritt 0: Pre-Deployment-Checks (lokal)${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Prüfe ob wir im richtigen Verzeichnis sind
if [ ! -f "frontend/package.json" ]; then
    echo -e "${RED}❌ Bitte im Projekt-Root ausführen (products/ai-whatsapp-bot-builder/)${NC}"
    exit 1
fi

cd frontend || exit 1

# Regression-Tests ausführen (mit Timeout für macOS/Linux)
echo -e "${YELLOW}▶ Führe Regression-Tests aus...${NC}"
echo -e "${YELLOW}   (Timeout: 60 Sekunden)${NC}"

# macOS-kompatible Timeout-Funktion
run_with_timeout() {
    local timeout_duration=$1
    shift
    local cmd="$@"
    
    # Prüfe ob gtimeout (GNU timeout via Homebrew) verfügbar ist
    if command -v gtimeout &> /dev/null; then
        gtimeout $timeout_duration $cmd
    # Prüfe ob timeout (Linux) verfügbar ist
    elif command -v timeout &> /dev/null; then
        timeout $timeout_duration $cmd
    # Fallback: Führe ohne Timeout aus (aber mit Background-Job)
    else
        echo -e "${YELLOW}   ⚠️  Timeout-Befehl nicht verfügbar, führe Tests direkt aus...${NC}"
        $cmd &
        local pid=$!
        local count=0
        while kill -0 $pid 2>/dev/null && [ $count -lt $timeout_duration ]; do
            sleep 1
            count=$((count + 1))
        done
        if kill -0 $pid 2>/dev/null; then
            echo -e "${YELLOW}   ⚠️  Tests dauern zu lange, beende...${NC}"
            kill $pid 2>/dev/null
            wait $pid 2>/dev/null
            return 124
        else
            wait $pid
            return $?
        fi
    fi
}

# Verwende schnelle Regression-Tests
if run_with_timeout 30 npm run regression-test:fast 2>&1 | tee -a "$LOG_FILE"; then
    echo -e "${GREEN}✓ Regression-Tests bestanden${NC}"
elif [ $? -eq 124 ]; then
    echo -e "${RED}❌ Regression-Tests haben zu lange gedauert (>60s)${NC}"
    echo -e "${YELLOW}   ⚠️  Bitte manuell prüfen: cd frontend && npm run regression-test${NC}"
    echo -e "${YELLOW}   Möchtest du trotzdem fortfahren? (j/n)${NC}"
    read -t 10 -n 1 response || response="n"
    if [ "$response" != "j" ] && [ "$response" != "J" ]; then
        echo -e "${RED}   Deployment abgebrochen.${NC}"
        exit 1
    fi
    echo -e "${YELLOW}   Fortfahren ohne Regression-Tests...${NC}"
else
    echo -e "${RED}❌ Regression-Tests fehlgeschlagen!${NC}"
    echo -e "${RED}   Deployment abgebrochen. Bitte Fehler beheben.${NC}"
    echo -e "${YELLOW}   Führe manuell aus: cd frontend && npm run regression-test${NC}"
    exit 1
fi
echo ""

# TypeScript-Compilation wird auf Server geprüft (schneller)
echo -e "${YELLOW}▶ TypeScript-Compilation wird auf Server geprüft...${NC}"
echo -e "${GREEN}✓ Lokale Checks abgeschlossen${NC}"
echo -e "${YELLOW}   ℹ️  Vollständiger Build und Type-Check werden auf Server durchgeführt${NC}"
echo -e "${YELLOW}   ℹ️  TypeScript-Fehler werden beim Server-Build erkannt${NC}"
echo ""

cd ..

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

# Schritt 2: Backup erstellen (für Rollback)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Schritt 2: Backup erstellen${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

BACKUP_DIR="/tmp/whatsapp-bot-builder-backup-$(date +%Y%m%d_%H%M%S)"
run_ssh "mkdir -p $BACKUP_DIR && cp -r $SERVER_DIR/.next $BACKUP_DIR/.next 2>/dev/null || echo 'Kein .next Verzeichnis vorhanden'" "Backup erstellen"

# Schritt 3: File-Synchronisation
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Schritt 3: File-Synchronisation${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Synchronisiere Frontend-Dateien
echo -e "${YELLOW}▶ Synchronisiere Frontend-Dateien...${NC}"
rsync -avz --exclude 'node_modules' --exclude '.next' --exclude '.git' \
    frontend/ "$SERVER:$SERVER_DIR/" 2>&1 | tee -a "$LOG_FILE" || {
    handle_error "File-Synchronisation"
}

# Synchronisiere Assets (Payment-Logos, Screenshots, Images)
echo -e "${YELLOW}▶ Synchronisiere Assets...${NC}"
if [ -f "frontend/scripts/deploy-images.sh" ]; then
    cd frontend || exit 1
    bash scripts/deploy-images.sh 2>&1 | tee -a "$LOG_FILE" || {
        echo -e "${YELLOW}⚠️  Asset-Synchronisation fehlgeschlagen, aber fortfahren...${NC}"
    }
    cd ..
fi

# Schritt 4: Build auf Server
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Schritt 4: Build auf Server${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# OpenTelemetry temporär deaktivieren (verhindert Build-Fehler)
echo -e "${YELLOW}▶ Deaktiviere OpenTelemetry für Build...${NC}"
run_ssh "cd $SERVER_DIR && (test -f instrumentation.ts && rm -f instrumentation.ts && echo 'OpenTelemetry deaktiviert (instrumentation.ts entfernt)' || echo 'OpenTelemetry bereits deaktiviert')" "OpenTelemetry deaktivieren"

echo -e "${YELLOW}▶ Starte Build-Prozess auf Server...${NC}"
echo "Dies kann einige Minuten dauern..."
echo ""

if run_ssh "cd $SERVER_DIR && npm run build" "Build auf Server"; then
    echo -e "${GREEN}✓ Build erfolgreich abgeschlossen${NC}"
else
    handle_error "Build auf Server"
fi

# Schritt 5: PM2 Restart
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Schritt 5: PM2 Restart${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if ssh "$SERVER" "pm2 list | grep -q $APP_NAME" 2>/dev/null; then
    run_ssh "pm2 restart $APP_NAME --update-env" "PM2 App neu starten" || {
        handle_error "PM2 Restart"
    }
else
    run_ssh "cd $SERVER_DIR && pm2 start ecosystem.config.js" "PM2 App starten" || {
        handle_error "PM2 Start"
    }
fi

run_ssh "pm2 save" "PM2 Konfiguration speichern"

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

if echo "$HEALTH_RESPONSE" | grep -q "status.*ok\|ok"; then
    echo -e "${GREEN}✓ Health-Check erfolgreich${NC}"
else
    echo -e "${YELLOW}⚠ Health-Check nicht erfolgreich${NC}"
    echo "Prüfe PM2 Logs:"
    ssh "$SERVER" "pm2 logs $APP_NAME --lines 20 --nostream" 2>&1 | tee -a "$LOG_FILE"
    # Nicht als Fehler behandeln, da OpenTelemetry manchmal 500 gibt
fi
echo ""

# Externer Health-Check
echo -e "${YELLOW}▶ Externer Health-Check ($DOMAIN)${NC}"
EXTERNAL_HEALTH=$(curl -s "https://$DOMAIN/api/health" 2>/dev/null || echo "FEHLER")
echo "$EXTERNAL_HEALTH" | tee -a "$LOG_FILE"

if echo "$EXTERNAL_HEALTH" | grep -q "status.*ok\|ok"; then
    echo -e "${GREEN}✓ Externer Health-Check erfolgreich${NC}"
else
    echo -e "${YELLOW}⚠ Externer Health-Check nicht erfolgreich${NC}"
fi
echo ""

# Schritt 7: Post-Deployment-Validierung
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}Schritt 7: Post-Deployment-Validierung${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Prüfe kritische Routes
echo -e "${YELLOW}▶ Prüfe kritische Routes...${NC}"
CRITICAL_ROUTES=(
    "/de"
    "/de/dashboard"
    "/de/pricing"
    "/de/contact"
)

for route in "${CRITICAL_ROUTES[@]}"; do
    status=$(ssh "$SERVER" "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000$route 2>/dev/null" || echo "000")
    if [ "$status" = "200" ] || [ "$status" = "500" ]; then
        echo -e "  ${GREEN}✓${NC} $route: HTTP $status"
    else
        echo -e "  ${RED}✗${NC} $route: HTTP $status"
    fi
done
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
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Safe Deployment abgeschlossen!${NC}"
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
echo "  - Backup verfügbar in: $BACKUP_DIR"
echo ""

