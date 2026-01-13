#!/bin/bash
# Build direkt auf dem Server ausführen
# Verwendung: ./fix-build-on-server.sh

SERVER="goneo-server"
SERVER_DIR="/var/www/whatsapp-bot-builder"

echo "🔧 Führe Build direkt auf Server aus..."
echo ""

# 1. PM2 stoppen
echo "1️⃣  PM2 stoppen..."
ssh "$SERVER" "pm2 stop whatsapp-bot-builder" 2>&1
echo ""

# 2. Ins Verzeichnis wechseln und Build ausführen
echo "2️⃣  Build ausführen (dies kann einige Minuten dauern)..."
echo ""

# Build mit Output-Streaming
ssh "$SERVER" "cd $SERVER_DIR && npm run build" 2>&1 | while IFS= read -r line; do
    echo "$line"
    # Prüfe auf Fehler
    if echo "$line" | grep -q "Error\|error\|Failed\|failed"; then
        echo "⚠️  Fehler erkannt: $line"
    fi
done

BUILD_EXIT_CODE=${PIPESTATUS[0]}

if [ $BUILD_EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✅ Build erfolgreich!"
    echo ""
    
    # 3. Prüfe Build-Verzeichnis
    echo "3️⃣  Prüfe Build-Verzeichnis..."
    ssh "$SERVER" "cd $SERVER_DIR && ls -la .next/ 2>/dev/null | head -10 || echo 'Build-Verzeichnis nicht gefunden'" 2>&1
    echo ""
    
    # 4. PM2 neu starten
    echo "4️⃣  PM2 neu starten..."
    ssh "$SERVER" "pm2 restart whatsapp-bot-builder" 2>&1
    echo ""
    
    # 5. Warte kurz
    echo "5️⃣  Warte 5 Sekunden..."
    sleep 5
    echo ""
    
    # 6. Status prüfen
    echo "6️⃣  PM2 Status:"
    ssh "$SERVER" "pm2 status" 2>&1
    echo ""
    
    # 7. Health-Check
    echo "7️⃣  Health-Check:"
    ssh "$SERVER" "curl -s http://localhost:3000/api/health || echo 'Health-Check fehlgeschlagen'" 2>&1
    echo ""
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Fertig! Prüfe: https://whatsapp.owona.de"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
else
    echo ""
    echo "❌ Build fehlgeschlagen (Exit Code: $BUILD_EXIT_CODE)"
    echo ""
    echo "Bitte manuell auf Server prüfen:"
    echo "  ssh $SERVER"
    echo "  cd $SERVER_DIR"
    echo "  npm run build"
fi











