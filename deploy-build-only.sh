#!/bin/bash

# 🚀 Schnelles Deployment - Nur Build-Verzeichnis (.next)
# Minimaler Upload, nur für Build-Updates

set -e

SERVER_IP="91.99.232.126"
SERVER_USER="root"
SERVER_PASS="LpXqTEPurwUu"
APP_DIR="/var/www/whatsapp-bot-builder"
LOCAL_DIR="/Users/salomon/Documents/products/ai-whatsapp-bot-builder/frontend"

echo "🚀 Schnelles Build-Deployment"
echo "=============================="
echo ""

# Prüfe ob Build existiert
if [ ! -d "$LOCAL_DIR/.next" ]; then
    echo "❌ Kein Build gefunden. Erstelle Build..."
    cd "$LOCAL_DIR"
    npm run build
    echo "✅ Build erstellt"
else
    echo "✅ Build gefunden"
fi

# Erstelle komprimiertes Build-Archiv
echo ""
echo "📦 Erstelle Build-Archiv (nur .next)..."
cd "$LOCAL_DIR"

tar -czf /tmp/whatsapp-next-build.tar.gz .next/

BUILD_SIZE=$(du -sh /tmp/whatsapp-next-build.tar.gz | cut -f1)
echo "✅ Build-Archiv erstellt: /tmp/whatsapp-next-build.tar.gz ($BUILD_SIZE)"
echo ""

# Upload per SCP
echo "📤 Upload per SCP..."
if command -v sshpass &> /dev/null; then
    sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no \
        -o ConnectTimeout=10 \
        /tmp/whatsapp-next-build.tar.gz \
        "$SERVER_USER@$SERVER_IP:/tmp/whatsapp-next-build.tar.gz" 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ Upload erfolgreich"
        UPLOAD_SUCCESS=true
    else
        echo "❌ Upload fehlgeschlagen"
        UPLOAD_SUCCESS=false
    fi
else
    scp -o StrictHostKeyChecking=no \
        -o ConnectTimeout=10 \
        /tmp/whatsapp-next-build.tar.gz \
        "$SERVER_USER@$SERVER_IP:/tmp/whatsapp-next-build.tar.gz" 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ Upload erfolgreich"
        UPLOAD_SUCCESS=true
    else
        echo "❌ Upload fehlgeschlagen"
        UPLOAD_SUCCESS=false
    fi
fi

echo ""

# Server-Befehle
if [ "$UPLOAD_SUCCESS" = true ]; then
    echo "📋 Führe diese Befehle über Hetzner-Konsole aus:"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "cd $APP_DIR"
    echo ""
    echo "# Backup"
    echo "if [ -d '.next' ]; then"
    echo "  mv .next .next.backup.\$(date +%Y%m%d_%H%M%S)"
    echo "fi"
    echo ""
    echo "# Extrahiere"
    echo "tar -xzf /tmp/whatsapp-next-build.tar.gz -C ."
    echo ""
    echo "# PM2 restart"
    echo "pm2 restart whatsapp-bot-builder"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
else
    echo "❌ Upload fehlgeschlagen. Manueller Upload erforderlich."
    echo "📁 Datei: /tmp/whatsapp-next-build.tar.gz"
    echo ""
fi











