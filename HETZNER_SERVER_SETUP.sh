#!/bin/bash

# 🚀 Hetzner Server Setup für whatsapp.owona.de
# Server: 91.99.232.126
# SSH: root@91.99.232.126

set -e

echo "🚀 Starte Hetzner Server Setup..."
echo "=================================="

# Farben
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Server-Details
SERVER_IP="91.99.232.126"
SERVER_USER="root"
SERVER_PASS="LpXqTEPurwUu"
PROJECT_NAME="ai-whatsapp-bot-builder"
DOMAIN="whatsapp.owona.de"
APP_DIR="/var/www/whatsapp-bot-builder"

echo -e "${BLUE}📋 Server-Informationen:${NC}"
echo "   IP: $SERVER_IP"
echo "   Domain: $DOMAIN"
echo "   Projekt-Verzeichnis: $APP_DIR"
echo ""

# 1. Projekt-Verzeichnis erstellen
echo -e "${BLUE}📂 1/6: Projekt-Verzeichnis erstellen...${NC}"
sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << EOF
mkdir -p $APP_DIR
cd $APP_DIR
pwd
EOF
echo -e "${GREEN}✅ Verzeichnis erstellt${NC}"
echo ""

# 2. Lokale Dateien auf Server kopieren
echo -e "${BLUE}📦 2/6: Projekt-Dateien auf Server kopieren...${NC}"
cd /Users/salomon/Documents/products/$PROJECT_NAME

# Erstelle temporäres Archiv
echo "Erstelle Archiv..."
tar --exclude='node_modules' \
    --exclude='.next' \
    --exclude='.git' \
    --exclude='*.log' \
    -czf /tmp/whatsapp-bot-builder.tar.gz frontend/

# Kopiere auf Server
sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no /tmp/whatsapp-bot-builder.tar.gz "$SERVER_USER@$SERVER_IP:/tmp/"

# Entpacke auf Server
sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << EOF
cd $APP_DIR
tar -xzf /tmp/whatsapp-bot-builder.tar.gz
mv frontend/* .
rm -rf frontend
rm /tmp/whatsapp-bot-builder.tar.gz
ls -la
EOF
echo -e "${GREEN}✅ Dateien kopiert${NC}"
echo ""

# 3. Dependencies installieren
echo -e "${BLUE}📦 3/6: Dependencies installieren...${NC}"
sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << EOF
cd $APP_DIR
if [ -f "package.json" ]; then
    npm install --production
    echo "✅ Dependencies installiert"
else
    echo "⚠️  package.json nicht gefunden"
fi
EOF
echo ""

# 4. Environment-Variablen Setup
echo -e "${BLUE}⚙️  4/6: Environment-Variablen einrichten...${NC}"
sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << 'ENVEOF'
cd /var/www/whatsapp-bot-builder
if [ ! -f ".env.local" ]; then
    cat > .env.local << 'EOFENV'
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://whatsapp.owona.de
NEXT_PUBLIC_APP_NAME=WhatsApp Bot Builder
NEXT_PUBLIC_APP_DOMAIN=whatsapp.owona.de
# Supabase (muss noch eingegeben werden)
# NEXT_PUBLIC_SUPABASE_URL=
# NEXT_PUBLIC_SUPABASE_ANON_KEY=
# GROQ_API_KEY=
EOFENV
    echo "✅ .env.local erstellt"
else
    echo "ℹ️  .env.local existiert bereits"
fi
ENVEOF
echo ""

# 5. Caddy Konfiguration
echo -e "${BLUE}🌐 5/6: Caddy Konfiguration...${NC}"
sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << 'CADDYEOF'
# Prüfe ob Caddy installiert ist
if command -v caddy &> /dev/null; then
    echo "✅ Caddy ist installiert"
    
    # Caddyfile erstellen
    CADDYFILE="/etc/caddy/Caddyfile"
    if [ ! -f "$CADDYFILE" ] || ! grep -q "whatsapp.owona.de" "$CADDYFILE" 2>/dev/null; then
        cat >> "$CADDYFILE" << 'EOFCADDY'

# WhatsApp Bot Builder
whatsapp.owona.de {
    reverse_proxy localhost:3000
    encode zstd gzip
    
    # Security Headers
    header {
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        X-XSS-Protection "1; mode=block"
        Referrer-Policy strict-origin-when-cross-origin
    }
}
EOFCADDY
        echo "✅ Caddyfile aktualisiert"
        
        # Caddy reload
        caddy reload --config "$CADDYFILE" 2>/dev/null || echo "ℹ️  Caddy muss manuell neu gestartet werden"
    else
        echo "ℹ️  Caddyfile enthält bereits whatsapp.owona.de"
    fi
else
    echo "⚠️  Caddy nicht gefunden - muss manuell installiert werden"
fi
CADDYEOF
echo ""

# 6. PM2 Setup
echo -e "${BLUE}🔄 6/6: PM2 Setup...${NC}"
sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << 'PM2EOF'
# Prüfe ob PM2 installiert ist
if command -v pm2 &> /dev/null; then
    echo "✅ PM2 ist installiert"
    
    cd /var/www/whatsapp-bot-builder
    
    # PM2 Ecosystem erstellen
    cat > ecosystem.config.js << 'EOFPM2'
module.exports = {
  apps: [{
    name: 'whatsapp-bot-builder',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/whatsapp-bot-builder',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
EOFPM2
    
    echo "✅ PM2 Ecosystem erstellt"
else
    echo "⚠️  PM2 nicht gefunden - installiere..."
    npm install -g pm2
    pm2 startup
    echo "✅ PM2 installiert"
fi
PM2EOF
echo ""

echo -e "${GREEN}✅ Setup abgeschlossen!${NC}"
echo ""
echo "📋 Nächste Schritte:"
echo "   1. DNS-Eintrag bei Goneo hinzufügen (siehe DNS_EINSTELLUNGEN_GONEO.md)"
echo "   2. .env.local auf Server mit Supabase-Credentials füllen"
echo "   3. Projekt builden: cd $APP_DIR && npm run build"
echo "   4. PM2 starten: cd $APP_DIR && pm2 start ecosystem.config.js"
echo "   5. Caddy neu starten: systemctl restart caddy"
echo ""
echo "🧪 Test: https://$DOMAIN"

