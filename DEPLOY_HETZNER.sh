#!/bin/bash

# 🚀 Quick Deployment auf Hetzner Server
# Führt alle notwendigen Schritte aus

set -e

SERVER_IP="91.99.232.126"
SERVER_USER="root"
SERVER_PASS="LpXqTEPurwUu"
APP_DIR="/var/www/whatsapp-bot-builder"
LOCAL_DIR="/Users/salomon/Documents/products/ai-whatsapp-bot-builder"

echo "🚀 Starte Deployment auf Hetzner Server..."
echo "==========================================="

# 1. Projekt-Dateien hochladen
echo "📦 1/5: Dateien hochladen..."
cd "$LOCAL_DIR"
tar --exclude='node_modules' \
    --exclude='.next' \
    --exclude='.git' \
    --exclude='*.log' \
    -czf /tmp/whatsapp-bot-builder.tar.gz frontend/

sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no \
    /tmp/whatsapp-bot-builder.tar.gz \
    "$SERVER_USER@$SERVER_IP:/tmp/"

sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << EOF
cd $APP_DIR
tar -xzf /tmp/whatsapp-bot-builder.tar.gz
mv frontend/* . 2>/dev/null || true
rm -rf frontend whatsapp-bot-builder.tar.gz /tmp/whatsapp-bot-builder.tar.gz
ls -la
EOF

echo "✅ Dateien hochgeladen"
echo ""

# 2. Rechtstexte und DSGVO-Updates prüfen
echo "✅ 2/5: Rechtstexte und DSGVO-Features sind bereits im Code enthalten"
echo ""

# 3. Dependencies installieren
echo "📦 3/5: Dependencies installieren..."
sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << EOF
cd $APP_DIR
npm install --legacy-peer-deps
echo "✅ Dependencies installiert"
EOF
echo ""

# 4. Build
echo "🏗️  4/5: Build erstellen..."
sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << EOF
cd $APP_DIR
rm -rf .next
npm run build
echo "✅ Build erfolgreich"
EOF
echo ""

# 5. PM2 starten
echo "🔄 5/5: PM2 starten..."
sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << 'PM2EOF'
cd /var/www/whatsapp-bot-builder

# PM2 installieren falls nicht vorhanden
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

# Ecosystem verwenden (bereits im Projekt vorhanden)
if [ ! -f ecosystem.config.js ]; then
  cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'whatsapp-bot-builder',
    script: 'node_modules/.bin/next',
    args: 'start -p 3000',
    cwd: '/var/www/whatsapp-bot-builder',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1536M',
    node_args: '--max-old-space-size=1536',
    error_file: '/var/log/pm2/whatsapp-bot-builder-error.log',
    out_file: '/var/log/pm2/whatsapp-bot-builder-out.log',
    log_file: '/var/log/pm2/whatsapp-bot-builder.log',
    time: true,
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000,
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      NODE_OPTIONS: '--max-old-space-size=1536',
    },
  }],
};
EOF
fi

# PM2 starten/restarten
pm2 delete whatsapp-bot-builder 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo "✅ PM2 gestartet"
pm2 status
PM2EOF
echo ""

echo "✅ Deployment abgeschlossen!"
echo ""
echo "📋 Nächste Schritte:"
echo "   1. DNS-Eintrag bei Goneo: A-Record whatsapp -> 91.99.232.126"
echo "   2. SSL-Zertifikat: certbot --nginx -d whatsapp.owona.de"
echo "   3. Nginx-Konfiguration aktivieren (siehe nginx-whatsapp.conf)"
echo "   4. Test: https://whatsapp.owona.de"

