#!/bin/bash

# 🚀 Deployment auf whatsapp.owona.de - Alternative Methoden (ohne SSH-Shell)
# Nutzt SCP direkt für Upload, Hetzner-Konsole für Server-Befehle

set -e

SERVER_IP="91.99.232.126"
SERVER_USER="root"
SERVER_PASS="LpXqTEPurwUu"
APP_DIR="/var/www/whatsapp-bot-builder"
LOCAL_DIR="/Users/salomon/Documents/products/ai-whatsapp-bot-builder/frontend"

echo "🚀 Deployment auf whatsapp.owona.de"
echo "====================================="
echo ""
echo "⚠️  WICHTIG: SSH-Shell funktioniert nicht (Fail2ban/Firewall)"
echo "    Dieses Skript nutzt alternative Methoden:"
echo "    1. SCP direkt für Datei-Upload"
echo "    2. Hetzner-Konsole für Server-Befehle (manuell)"
echo ""

# Prüfe ob Build existiert
if [ ! -d "$LOCAL_DIR/.next" ]; then
    echo "❌ Kein Build gefunden. Erstelle Build..."
    cd "$LOCAL_DIR"
    npm run build
    echo "✅ Build erstellt"
else
    echo "✅ Build gefunden: $LOCAL_DIR/.next"
fi

# Schritt 1: Build-Archiv erstellen
echo ""
echo "📦 Schritt 1/4: Erstelle Build-Archiv..."
cd "$LOCAL_DIR/.."

# Erstelle Archiv mit .next + notwendigen Dateien
tar --exclude='node_modules' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='tsconfig.tsbuildinfo' \
    -czf /tmp/whatsapp-build-deploy.tar.gz \
    frontend/.next \
    frontend/package.json \
    frontend/package-lock.json \
    frontend/next.config.js \
    frontend/ecosystem.config.js \
    frontend/public \
    frontend/app \
    frontend/components \
    frontend/lib \
    frontend/messages \
    frontend/middleware.ts \
    frontend/i18n.ts \
    frontend/tailwind.config.js \
    frontend/postcss.config.js \
    frontend/tsconfig.json

BUILD_SIZE=$(du -sh /tmp/whatsapp-build-deploy.tar.gz | cut -f1)
echo "✅ Build-Archiv erstellt: /tmp/whatsapp-build-deploy.tar.gz ($BUILD_SIZE)"
echo ""

# Schritt 2: Upload per SCP (ohne SSH-Shell)
echo "📤 Schritt 2/4: Upload per SCP..."
echo "   Versuche SCP-Upload (kann bei Fail2ban-Block fehlschlagen)..."
echo ""

if command -v sshpass &> /dev/null; then
    sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no \
        -o ConnectTimeout=10 \
        /tmp/whatsapp-build-deploy.tar.gz \
        "$SERVER_USER@$SERVER_IP:/tmp/whatsapp-build-deploy.tar.gz" 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ Upload erfolgreich per SCP"
        UPLOAD_SUCCESS=true
    else
        echo "❌ SCP-Upload fehlgeschlagen (möglicherweise Fail2ban-Block)"
        UPLOAD_SUCCESS=false
    fi
else
    echo "⚠️  sshpass nicht installiert. Versuche SCP ohne Passwort..."
    scp -o StrictHostKeyChecking=no \
        -o ConnectTimeout=10 \
        /tmp/whatsapp-build-deploy.tar.gz \
        "$SERVER_USER@$SERVER_IP:/tmp/whatsapp-build-deploy.tar.gz" 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ Upload erfolgreich per SCP"
        UPLOAD_SUCCESS=true
    else
        echo "❌ SCP-Upload fehlgeschlagen"
        UPLOAD_SUCCESS=false
    fi
fi

echo ""

# Schritt 3: Server-Befehle (manuell über Hetzner-Konsole)
if [ "$UPLOAD_SUCCESS" = true ]; then
    echo "📋 Schritt 3/4: Server-Befehle (manuell ausführen)"
    echo ""
    echo "⚠️  Da SSH-Shell blockiert ist, führe diese Befehle über Hetzner-Konsole aus:"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "cd $APP_DIR"
    echo ""
    echo "# Backup des aktuellen Builds"
    echo "if [ -d '.next' ]; then"
    echo "  mv .next .next.backup.\$(date +%Y%m%d_%H%M%S)"
    echo "fi"
    echo ""
    echo "# Extrahiere neues Build"
    echo "tar -xzf /tmp/whatsapp-build-deploy.tar.gz -C ."
    echo ""
    echo "# Installiere Dependencies (falls nötig)"
    echo "npm install --legacy-peer-deps"
    echo ""
    echo "# PM2 neu starten"
    echo "pm2 restart whatsapp-bot-builder || pm2 start ecosystem.config.js"
    echo "pm2 save"
    echo ""
    echo "# Status prüfen"
    echo "pm2 status"
    echo "pm2 logs whatsapp-bot-builder --lines 20 --nostream"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
else
    echo "❌ Schritt 3/4: Upload fehlgeschlagen - manueller Upload erforderlich"
    echo ""
    echo "📋 Alternative Upload-Methoden:"
    echo ""
    echo "Option A: Hetzner-Konsole (Web-Interface)"
    echo "  1. Gehe zu: https://console.hetzner.cloud/"
    echo "  2. Wähle deinen Server aus"
    echo "  3. Klicke auf 'Console' (VNC/NoVNC)"
    echo "  4. Melde dich an und führe die Befehle aus Schritt 3 aus"
    echo ""
    echo "Option B: Manueller Upload per Hetzner-Storage"
    echo "  1. Lade /tmp/whatsapp-build-deploy.tar.gz auf Hetzner-Storage hoch"
    echo "  2. Verbinde Storage mit Server"
    echo "  3. Kopiere Datei nach /tmp/"
    echo ""
    echo "Option C: Fail2ban zurücksetzen"
    echo "  1. Warte 10-15 Minuten (Fail2ban-Timeout)"
    echo "  2. Versuche erneut: ./deploy-without-ssh.sh"
    echo ""
fi

# Schritt 4: Zusammenfassung
echo ""
echo "📊 Schritt 4/4: Zusammenfassung"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Build-Archiv erstellt: /tmp/whatsapp-build-deploy.tar.gz"
if [ "$UPLOAD_SUCCESS" = true ]; then
    echo "✅ Upload erfolgreich: Datei ist auf Server unter /tmp/whatsapp-build-deploy.tar.gz"
    echo "⚠️  Nächster Schritt: Befehle über Hetzner-Konsole ausführen (siehe oben)"
else
    echo "❌ Upload fehlgeschlagen: Manueller Upload erforderlich"
    echo "📁 Lokale Datei: /tmp/whatsapp-build-deploy.tar.gz"
fi
echo ""
echo "🌐 Nach Deployment testen:"
echo "   https://whatsapp.owona.de"
echo "   https://whatsapp.owona.de/api/health"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""











