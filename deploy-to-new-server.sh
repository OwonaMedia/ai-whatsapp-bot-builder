#!/bin/bash

# 🚀 Deployment auf Hetzner Server
# Führt alle notwendigen Schritte aus

set -e

SERVER_IP="46.224.154.171"
SERVER_USER="root"
SSH_KEY="$HOME/.ssh/ihetzner_key"
APP_DIR="/var/www/whatsapp-bot-builder"
LOCAL_DIR="/Users/salomon/Documents/products/ai-whatsapp-bot-builder/frontend"

echo "🚀 Starte Deployment auf Hetzner Server ($SERVER_IP)..."
echo "==========================================="

# 1. Projekt-Dateien hochladen
echo "📦 1/6: Dateien vorbereiten und hochladen..."
cd "$LOCAL_DIR/.."
tar --exclude='node_modules' \
    --exclude='.next' \
    --exclude='.git' \
    --exclude='*.log' \
    --exclude='tsconfig.tsbuildinfo' \
    -czf /tmp/whatsapp-bot-builder-deploy.tar.gz frontend/

echo "📤 Dateien hochladen..."
scp -i "$SSH_KEY" -o StrictHostKeyChecking=no \
    /tmp/whatsapp-bot-builder-deploy.tar.gz \
    "$SERVER_USER@$SERVER_IP:/tmp/"

echo "📂 Dateien auf Server extrahieren..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << 'EOF'
cd /var/www/whatsapp-bot-builder
# Backup des aktuellen .next Verzeichnisses
if [ -d ".next" ]; then
  mv .next .next.backup.$(date +%Y%m%d_%H%M%S) || true
fi
# Extrahiere neue Dateien
tar -xzf /tmp/whatsapp-bot-builder-deploy.tar.gz
# Verschiebe frontend-Inhalt ins Root
if [ -d "frontend" ]; then
  cp -r frontend/* . 2>/dev/null || true
  cp -r frontend/.* . 2>/dev/null || true
  rm -rf frontend
fi
rm -f /tmp/whatsapp-bot-builder-deploy.tar.gz
echo "✅ Dateien extrahiert"
EOF

echo "✅ Dateien hochgeladen"
echo ""

# 2. Dependencies installieren
echo "📦 2/6: Dependencies installieren..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << 'EOF'
cd /var/www/whatsapp-bot-builder
npm install --legacy-peer-deps
echo "✅ Dependencies installiert"
EOF
echo ""

# 3. Build
echo "🏗️  3/6: Build erstellen..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << 'EOF'
cd /var/www/whatsapp-bot-builder
rm -rf .next
npm run build
echo "✅ Build erfolgreich"
EOF
echo ""

# 4. PM2 neu starten
echo "🔄 4/6: PM2 neu starten..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << 'PM2EOF'
cd /var/www/whatsapp-bot-builder

# PM2 installieren falls nicht vorhanden
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

# PM2 restart
pm2 restart whatsapp-bot-builder || pm2 start ecosystem.config.js
pm2 save

echo "✅ PM2 gestartet"
pm2 status
PM2EOF
echo ""

# 5. Health-Check
echo "🏥 5/6: Health-Check..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << 'EOF'
sleep 5
curl -f http://localhost:3000/api/health || echo "⚠️ Health-Check fehlgeschlagen"
EOF
echo ""

# 6. Status-Report
echo "📊 6/6: Deployment-Status..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << 'EOF'
echo "=== PM2 Status ==="
pm2 status
echo ""
echo "=== PM2 Logs (letzte 10 Zeilen) ==="
pm2 logs whatsapp-bot-builder --lines 10 --nostream
EOF

echo ""
echo "✅ Deployment abgeschlossen!"
echo ""
echo "🌐 Teste die Website:"
echo "   https://whatsapp.owona.de"
echo "   https://whatsapp.owona.de/api/health"
echo ""

