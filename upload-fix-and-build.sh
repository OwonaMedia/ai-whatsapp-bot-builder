#!/bin/bash
# Upload fix und führe Build aus
# Verwendung: ./upload-fix-and-build.sh

SERVER="goneo-server"
SERVER_DIR="/var/www/whatsapp-bot-builder"
LOCAL_FILE="frontend/components/support/SupportTicketProvider.tsx"
REMOTE_FILE="products/ai-whatsapp-bot-builder/frontend/components/support/SupportTicketProvider.tsx"

echo "📤 Lade Fix auf Server..."
echo ""

# Prüfe ob Verzeichnis existiert, erstelle es falls nötig
ssh "$SERVER" "mkdir -p $SERVER_DIR/products/ai-whatsapp-bot-builder/frontend/components/support" 2>&1

# Upload der gefixten Datei
scp "$LOCAL_FILE" "$SERVER:$SERVER_DIR/$REMOTE_FILE" 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Datei hochgeladen"
    echo ""
    echo "🔧 Führe Build aus..."
    echo ""
    
    # Build ausführen
    ssh "$SERVER" "cd $SERVER_DIR && npm run build" 2>&1 | while IFS= read -r line; do
        echo "$line"
        if echo "$line" | grep -q "Error\|error\|Failed\|failed"; then
            echo "⚠️  Fehler: $line"
        fi
    done
    
    BUILD_EXIT=${PIPESTATUS[0]}
    
    if [ $BUILD_EXIT -eq 0 ]; then
        echo ""
        echo "✅ Build erfolgreich!"
        echo ""
        echo "🔄 PM2 neu starten..."
        ssh "$SERVER" "pm2 restart whatsapp-bot-builder" 2>&1
        echo ""
        echo "✅ Fertig! Prüfe: https://whatsapp.owona.de"
    else
        echo ""
        echo "❌ Build fehlgeschlagen"
    fi
else
    echo "❌ Upload fehlgeschlagen"
    exit 1
fi

