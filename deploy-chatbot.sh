#!/bin/bash

# 🚀 Deployment: MCP Support Chatbot
# Überträgt geänderte Dateien und startet Build auf Remote-Server

set -e

# Server-Konfiguration
SERVER_IP="91.99.232.126"
SERVER_USER="root"
SERVER_PASS="LpXqTEPurwUu"
APP_DIR="/var/www/whatsapp-bot-builder"
LOCAL_DIR="/Users/salomon/Documents/products/ai-whatsapp-bot-builder/frontend"

# Farben
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "🚀 Deployment: MCP Support Chatbot"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Schritt 1: Geänderte Dateien identifizieren
echo -e "${YELLOW}📋 Schritt 1: Geänderte Dateien identifizieren...${NC}"

CHANGED_FILES=(
  "app/[locale]/layout.tsx"
  "app/[locale]/page.tsx"
  "components/support/MCPSupportChatbotWrapper.tsx"
  "components/support/MCPSupportChatbot.tsx"
  "app/api/support/chat/route.ts"
  "lib/support/createTicket.ts"
)

echo "Geänderte Dateien:"
for file in "${CHANGED_FILES[@]}"; do
  if [ -f "$LOCAL_DIR/$file" ]; then
    echo "  ✓ $file"
  else
    echo -e "  ${RED}✗ $file (nicht gefunden)${NC}"
  fi
done
echo ""

# Schritt 2: Dateien auf Server hochladen
echo -e "${YELLOW}📤 Schritt 2: Dateien auf Server hochladen...${NC}"

cd "$LOCAL_DIR/.."

# Erstelle temporäres Verzeichnis mit geänderten Dateien
TMP_DIR="/tmp/frontend-chatbot-deploy-$(date +%s)"
mkdir -p "$TMP_DIR/frontend"

# Kopiere geänderte Dateien
for file in "${CHANGED_FILES[@]}"; do
  if [ -f "frontend/$file" ]; then
    mkdir -p "$TMP_DIR/frontend/$(dirname "$file")"
    cp "frontend/$file" "$TMP_DIR/frontend/$file"
    echo "  ✓ $file kopiert"
  fi
done

# Erstelle TAR-Archiv
tar -czf /tmp/frontend-chatbot.tar.gz -C "$TMP_DIR" frontend/
rm -rf "$TMP_DIR"

echo "📤 Upload zu Server..."
sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no \
    /tmp/frontend-chatbot.tar.gz \
    "$SERVER_USER@$SERVER_IP:/tmp/"

echo -e "${GREEN}✅ Dateien hochgeladen${NC}"
echo ""

# Schritt 3: Dateien auf Server extrahieren
echo -e "${YELLOW}📂 Schritt 3: Dateien auf Server extrahieren...${NC}"

sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << 'EOF'
cd /var/www/whatsapp-bot-builder

# Backup erstellen
if [ -d ".next" ]; then
  echo "  📦 Backup erstellen..."
  mv .next .next.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true
fi

# Dateien extrahieren
echo "  📂 Dateien extrahieren..."
tar -xzf /tmp/frontend-chatbot.tar.gz

# Dateien an richtige Stelle kopieren
if [ -d "frontend" ]; then
  echo "  📋 Dateien kopieren..."
  # Kopiere alle Dateien, behalte bestehende Struktur
  find frontend -type f -exec sh -c 'mkdir -p "$(dirname "$1")" && cp "$1" "$1"' _ {} \;
  # Verschiebe Dateien ins Root-Verzeichnis
  cp -r frontend/* . 2>/dev/null || true
  cp -r frontend/.* . 2>/dev/null || true
  rm -rf frontend
fi

rm -f /tmp/frontend-chatbot.tar.gz
echo "  ✅ Dateien extrahiert"
EOF

echo -e "${GREEN}✅ Dateien extrahiert${NC}"
echo ""

# Schritt 4: Build durchführen
echo -e "${YELLOW}🏗️  Schritt 4: Build durchführen...${NC}"

sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << 'EOF'
cd /var/www/whatsapp-bot-builder

echo "  🧹 Cache löschen..."
rm -rf .next tsconfig.tsbuildinfo 2>/dev/null || true

echo "  📦 Dependencies prüfen..."
npm install --legacy-peer-deps --quiet

echo "  🏗️  Build starten..."
npm run build

if [ $? -eq 0 ]; then
  echo "  ✅ Build erfolgreich"
else
  echo "  ❌ Build fehlgeschlagen"
  exit 1
fi
EOF

echo -e "${GREEN}✅ Build erfolgreich${NC}"
echo ""

# Schritt 5: PM2 neu starten
echo -e "${YELLOW}🔄 Schritt 5: PM2 neu starten...${NC}"

sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << 'EOF'
cd /var/www/whatsapp-bot-builder

echo "  🔄 PM2 restart..."
pm2 restart whatsapp-bot-builder || pm2 start ecosystem.config.js
pm2 save

echo "  ✅ PM2 gestartet"
pm2 status whatsapp-bot-builder
EOF

echo -e "${GREEN}✅ PM2 neu gestartet${NC}"
echo ""

# Schritt 6: Verifizierung
echo -e "${YELLOW}✅ Schritt 6: Verifizierung...${NC}"

sleep 5

sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << 'EOF'
echo "  📊 PM2 Status:"
pm2 status whatsapp-bot-builder

echo ""
echo "  📋 Letzte Logs:"
pm2 logs whatsapp-bot-builder --lines 5 --nostream
EOF

echo ""
echo -e "${GREEN}🎉 Deployment abgeschlossen!${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🌐 Test-URLs:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   - Hauptseite: https://whatsapp.owona.de/de"
echo "   - Chatbot sollte rechts unten sichtbar sein (grüner Button)"
echo ""
echo "📝 Nächste Schritte:"
echo "   1. Öffne https://whatsapp.owona.de/de"
echo "   2. Prüfe ob Chatbot-Button sichtbar ist"
echo "   3. Klicke auf den Button um Chat zu öffnen"
echo "   4. Browser-Cache leeren falls nötig (Cmd+Shift+R)"
echo ""

