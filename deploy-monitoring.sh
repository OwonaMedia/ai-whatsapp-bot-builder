#!/bin/bash

# Deployment Script für External API Monitoring System
# Führt Migration aus und startet Support MCP Server neu

set -e  # Exit on error

echo "🚀 Starting External API Monitoring Deployment..."
echo ""

# Farben für Output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Prüfe ob wir im richtigen Verzeichnis sind
if [ ! -f "supabase/migrations/015_external_api_changes.sql" ]; then
    echo -e "${RED}❌ Error: Migration file not found${NC}"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Schritt 1: Build Support MCP Server
echo -e "${YELLOW}📦 Step 1: Building Support MCP Server...${NC}"
cd support-mcp-server
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Build successful${NC}"
cd ..

# Schritt 2: Migration ausführen
echo ""
echo -e "${YELLOW}🗄️  Step 2: Applying database migration...${NC}"

# Prüfe ob Supabase CLI verfügbar ist
if command -v supabase &> /dev/null; then
    echo "Using Supabase CLI..."
    
    # Prüfe ob Supabase Projekt verlinkt ist
    if [ -f "supabase/.temp/project-ref" ] || [ -n "$SUPABASE_PROJECT_ID" ]; then
        echo "Applying migration via Supabase CLI..."
        supabase db push
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Migration applied successfully${NC}"
        else
            echo -e "${YELLOW}⚠️  Migration via CLI failed. Please apply manually via Supabase Dashboard${NC}"
            echo "Migration file: supabase/migrations/015_external_api_changes.sql"
        fi
    else
        echo -e "${YELLOW}⚠️  Supabase project not linked. Please apply migration manually:${NC}"
        echo "1. Open Supabase Dashboard → SQL Editor"
        echo "2. Copy content from: supabase/migrations/015_external_api_changes.sql"
        echo "3. Execute SQL"
    fi
else
    echo -e "${YELLOW}⚠️  Supabase CLI not found. Please apply migration manually:${NC}"
    echo "1. Open Supabase Dashboard → SQL Editor"
    echo "2. Copy content from: supabase/migrations/015_external_api_changes.sql"
    echo "3. Execute SQL"
fi

# Schritt 3: Umgebungsvariablen prüfen
echo ""
echo -e "${YELLOW}🔧 Step 3: Checking environment variables...${NC}"

if [ -f "support-mcp-server/.env" ]; then
    if grep -q "EXTERNAL_API_CHECK_INTERVAL_MS" support-mcp-server/.env; then
        echo -e "${GREEN}✅ EXTERNAL_API_CHECK_INTERVAL_MS is set${NC}"
    else
        echo -e "${YELLOW}⚠️  EXTERNAL_API_CHECK_INTERVAL_MS not found in .env${NC}"
        echo "Adding default value (86400000 = 24 hours)..."
        echo "" >> support-mcp-server/.env
        echo "# External API Monitoring Check Interval (in milliseconds)" >> support-mcp-server/.env
        echo "EXTERNAL_API_CHECK_INTERVAL_MS=86400000" >> support-mcp-server/.env
        echo -e "${GREEN}✅ Added EXTERNAL_API_CHECK_INTERVAL_MS=86400000${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  .env file not found. Creating with default values...${NC}"
    cat > support-mcp-server/.env << EOF
# External API Monitoring Check Interval (in milliseconds)
# Default: 24 hours (86400000 ms)
EXTERNAL_API_CHECK_INTERVAL_MS=86400000
EOF
    echo -e "${GREEN}✅ Created .env file${NC}"
fi

# Schritt 4: Support MCP Server neu starten
echo ""
echo -e "${YELLOW}🔄 Step 4: Restarting Support MCP Server...${NC}"

# Prüfe ob PM2 verwendet wird
if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "support-mcp-server"; then
        echo "Restarting via PM2..."
        pm2 restart support-mcp-server
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Support MCP Server restarted via PM2${NC}"
        else
            echo -e "${RED}❌ Failed to restart via PM2${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  support-mcp-server not found in PM2. Starting new process...${NC}"
        cd support-mcp-server
        pm2 start dist/index.js --name support-mcp-server
        cd ..
        echo -e "${GREEN}✅ Support MCP Server started via PM2${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  PM2 not found. Please restart manually:${NC}"
    echo "cd support-mcp-server && npm start"
fi

# Schritt 5: Verifizierung
echo ""
echo -e "${YELLOW}✅ Step 5: Verification...${NC}"
echo "Please verify:"
echo "1. Check logs: pm2 logs support-mcp-server (or check your log output)"
echo "2. Check dashboard: /intern → Tab 'Externe Änderungen'"
echo "3. Check database: SELECT COUNT(*) FROM external_api_changes;"

echo ""
echo -e "${GREEN}🎉 Deployment completed!${NC}"
echo ""
echo "Next steps:"
echo "1. Verify migration was applied: Check Supabase Dashboard"
echo "2. Check logs for monitoring activity"
echo "3. Test dashboard: /intern → Externe Änderungen"
echo ""

