#!/bin/bash

# 🚀 Deployment: Tab-Navigation für /intern
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

echo "🚀 Deployment: Tab-Navigation für /intern"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Schritt 1: Geänderte Dateien identifizieren
echo -e "${YELLOW}📋 Schritt 1: Geänderte Dateien identifizieren...${NC}"

CHANGED_FILES=(
  "app/[locale]/intern/_components/InternalDashboard.tsx"
  "app/[locale]/intern/_components/TabNavigation.tsx"
  "app/[locale]/intern/_components/OverviewTab.tsx"
  "app/[locale]/intern/_components/TicketsTab.tsx"
  "app/[locale]/intern/_components/ExternalChangesTab.tsx"
  "app/api/intern/external-changes/route.ts"
  "app/api/whatsapp/meta/oauth/route.ts"
  "app/api/whatsapp/meta/verify-phone/route.ts"
  "app/api/whatsapp/meta/webhook/route.ts"
  "lib/supabase-server.ts"
  "lib/whatsapp/meta-client.ts"
  "lib/whatsapp/phone-verification.ts"
  "next.config.js"
  "i18n.ts"
  "messages/de.json"
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
TMP_DIR="/tmp/frontend-deploy-$(date +%s)"
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
tar -czf /tmp/frontend-tab-nav.tar.gz -C "$TMP_DIR" frontend/
rm -rf "$TMP_DIR"

echo "📤 Upload zu Server..."
sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no \
    /tmp/frontend-tab-nav.tar.gz \
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
tar -xzf /tmp/frontend-tab-nav.tar.gz

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

rm -f /tmp/frontend-tab-nav.tar.gz
echo "  ✅ Dateien extrahiert"
EOF

echo -e "${GREEN}✅ Dateien extrahiert${NC}"
echo ""

# Schritt 4: OpenTelemetry prüfen/deaktivieren
echo -e "${YELLOW}🔧 Schritt 4: OpenTelemetry prüfen...${NC}"

sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" << 'EOF'
cd /var/www/whatsapp-bot-builder

# Prüfe ob instrumentation.ts existiert und deaktiviere temporär
if [ -f "instrumentation.ts" ] && [ ! -f "instrumentation.ts.bak" ]; then
  echo "  🔧 OpenTelemetry temporär deaktivieren..."
  mv instrumentation.ts instrumentation.ts.bak
  echo "  ✅ OpenTelemetry deaktiviert"
elif [ -f "instrumentation.ts.bak" ]; then
  echo "  ℹ️  OpenTelemetry bereits deaktiviert"
fi
EOF

echo ""

# Schritt 5: Build durchführen
echo -e "${YELLOW}🏗️  Schritt 5: Build durchführen...${NC}"

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

# Schritt 6: PM2 neu starten
echo -e "${YELLOW}🔄 Schritt 6: PM2 neu starten...${NC}"

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

# Schritt 7: Verifizierung
echo -e "${YELLOW}✅ Schritt 7: Verifizierung...${NC}"

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
echo "   - Dashboard: https://whatsapp.owona.de/de/intern"
echo "   - Tab-Navigation sollte sichtbar sein:"
echo "     📊 Übersicht | 🎫 Tickets | 🔄 Externe Änderungen"
echo ""
echo "📝 Nächste Schritte:"
echo "   1. Öffne https://whatsapp.owona.de/de/intern"
echo "   2. Prüfe Tab-Navigation"
echo "   3. Klicke auf 'Externe Änderungen' Tab"
echo "   4. Browser-Cache leeren falls nötig (Cmd+Shift+R)"
echo ""

