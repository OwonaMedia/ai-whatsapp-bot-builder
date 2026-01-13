#!/bin/bash

# Remote Deployment Script für Frontend
# Führt Build aus und startet Server via PM2 auf Remote-Server

set -e

echo "🚀 Starting Remote Frontend Deployment..."
echo ""

# Farben für Output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Server-Pfad (Remote)
REMOTE_PATH="/var/www/whatsapp-bot-builder/frontend"
APP_NAME="whatsapp-bot-builder"

# Schritt 0: Synchronisiere Bilder (falls Script lokal ausgeführt wird)
if [ -f "$(dirname "$0")/frontend/scripts/deploy-images.sh" ]; then
  echo -e "${YELLOW}🖼️  Step 0: Synchronizing images...${NC}"
  cd "$(dirname "$0")/frontend" || true
  if [ -f "scripts/deploy-images.sh" ]; then
    bash scripts/deploy-images.sh || {
      echo -e "${YELLOW}⚠️  Warning: Image synchronization failed, continuing...${NC}"
    }
  fi
fi

# Schritt 1: Build Frontend
echo -e "${YELLOW}📦 Step 1: Building Frontend...${NC}"
cd "$REMOTE_PATH" || {
  echo -e "${RED}❌ Error: Cannot access $REMOTE_PATH${NC}"
  echo "Bitte auf Remote-Server ausführen oder SSH-Verbindung prüfen"
  exit 1
}

npm run build
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Build failed${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Build successful${NC}"

# Schritt 2: OpenTelemetry temporär deaktivieren (falls noch aktiv)
echo ""
echo -e "${YELLOW}🔧 Step 2: Checking OpenTelemetry configuration...${NC}"
if [ -f "instrumentation.ts" ] && [ ! -f "instrumentation.ts.bak" ]; then
  echo "Temporarily disabling OpenTelemetry for development..."
  mv instrumentation.ts instrumentation.ts.bak
  echo -e "${GREEN}✅ OpenTelemetry disabled${NC}"
elif [ -f "instrumentation.ts.bak" ]; then
  echo "OpenTelemetry already disabled"
fi

# Schritt 3: PM2 Restart
echo ""
echo -e "${YELLOW}🔄 Step 3: Restarting via PM2...${NC}"
pm2 restart "$APP_NAME"
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Frontend restarted via PM2${NC}"
else
  echo -e "${RED}❌ Failed to restart via PM2${NC}"
  echo "Versuche PM2 start..."
  pm2 start ecosystem.config.js || {
    echo -e "${RED}❌ Failed to start via PM2${NC}"
    exit 1
  }
fi

# Schritt 4: Verifizierung
echo ""
echo -e "${YELLOW}✅ Step 4: Verification...${NC}"
sleep 3
pm2 status "$APP_NAME"

echo ""
echo -e "${GREEN}🎉 Deployment completed!${NC}"
echo ""
echo "Next steps:"
echo "1. Check PM2 logs: pm2 logs $APP_NAME"
echo "2. Check dashboard: https://whatsapp.owona.de/de/intern"
echo "3. Verify Tab-Navigation: Übersicht | Tickets | Externe Änderungen"
echo ""

