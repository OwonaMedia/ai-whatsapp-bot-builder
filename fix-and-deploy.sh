#!/bin/bash

set -e

SERVER_IP="91.99.232.126"
SERVER_USER="root"
SERVER_PASS="LpXqTEPurwUu"
APP_DIR="/var/www/whatsapp-bot-builder"
LOCAL_DIR="/Users/salomon/Documents/products/ai-whatsapp-bot-builder/frontend"

echo "🚀 Fix und Deployment..."
echo "==========================================="

# 1. Datei hochladen
echo "📦 1/4: Datei hochladen..."
cd "$LOCAL_DIR"
tar -czf /tmp/support-tickets-fix.tar.gz "app/api/support-tickets/route.ts"

sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no \
    /tmp/support-tickets-fix.tar.gz \
    "$SERVER_USER@$SERVER_IP:/tmp/"

sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << EOF
cd $APP_DIR
rm -rf app/api/support-tickets/route.ts
tar -xzf /tmp/support-tickets-fix.tar.gz
rm /tmp/support-tickets-fix.tar.gz
EOF

echo "✅ Datei hochgeladen"
echo ""

# 2. Build
echo "🏗️  2/4: Build erstellen..."
sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << EOF
cd $APP_DIR
rm -rf .next
npm run build 2>&1 | tail -30
EOF

echo ""

# 3. PM2 starten
echo "🔄 3/4: PM2 starten..."
sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << EOF
cd $APP_DIR
pm2 restart whatsapp-bot-builder || pm2 start ecosystem.config.js
pm2 save
pm2 status
EOF

echo ""

# 4. Health-Check
echo "🏥 4/4: Health-Check..."
sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "curl -s http://localhost:3000/api/health || echo '⚠️ Health-Check fehlgeschlagen'"

echo ""
echo "✅ Deployment abgeschlossen!"
echo ""
echo "🌐 Teste die Website:"
echo "   https://whatsapp.owona.de"

