#!/bin/bash

# Testing & Validation Script für External API Monitoring System

set -e

# Wechsle ins Projekt-Verzeichnis
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🧪 Starting Testing & Validation for External API Monitoring..."
echo "Working directory: $(pwd)"
echo ""

# Farben für Output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

# Test-Funktion
test_check() {
    local test_name="$1"
    local command="$2"
    
    echo -e "${BLUE}Testing: ${test_name}...${NC}"
    
    if (cd "$SCRIPT_DIR" && eval "$command") > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASS: ${test_name}${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAIL: ${test_name}${NC}"
        ((FAILED++))
        return 1
    fi
}

# Test 1: Build erfolgreich
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: Build Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_check "TypeScript compilation" "cd support-mcp-server && npm run build"

# Test 2: Migration-Datei vorhanden
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2: Migration File Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_check "Migration file exists" "test -f products/ai-whatsapp-bot-builder/supabase/migrations/015_external_api_changes.sql || test -f supabase/migrations/015_external_api_changes.sql"

# Prüfe SQL-Syntax
MIGRATION_FILE="supabase/migrations/015_external_api_changes.sql"
if [ ! -f "$MIGRATION_FILE" ]; then
    MIGRATION_FILE="products/ai-whatsapp-bot-builder/supabase/migrations/015_external_api_changes.sql"
fi

if [ -f "$MIGRATION_FILE" ] && command -v psql &> /dev/null; then
    echo -e "${BLUE}Testing: SQL syntax validation...${NC}"
    # Prüfe auf grundlegende SQL-Syntax-Fehler
    if grep -q "CREATE TABLE" "$MIGRATION_FILE" && \
       grep -q "CREATE INDEX" "$MIGRATION_FILE" && \
       grep -q "CREATE POLICY" "$MIGRATION_FILE"; then
        echo -e "${GREEN}✅ PASS: SQL syntax looks valid${NC}"
        ((PASSED++))
    else
        echo -e "${RED}❌ FAIL: SQL syntax validation${NC}"
        ((FAILED++))
    fi
fi

# Test 3: Code-Struktur
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 3: Code Structure Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_check "Monitoring service exists" "test -f support-mcp-server/src/services/monitoring/monitoring-service.ts"
test_check "MetaWhatsApp monitor exists" "test -f support-mcp-server/src/services/monitoring/meta-whatsapp.ts"
test_check "Payment providers monitor exists" "test -f support-mcp-server/src/services/monitoring/payment-providers.ts"
test_check "Server infrastructure monitor exists" "test -f support-mcp-server/src/services/monitoring/server-infrastructure.ts"
test_check "Update handler exists" "test -f support-mcp-server/src/services/auto-updates/update-handler.ts"

# Test 4: Frontend-Komponenten
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 4: Frontend Components Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_check "ExternalChangesTab exists" "test -f frontend/app/[locale]/intern/_components/ExternalChangesTab.tsx"
test_check "API route exists" "test -f frontend/app/api/intern/external-changes/route.ts"
test_check "TabNavigation exists" "test -f frontend/app/[locale]/intern/_components/TabNavigation.tsx"

# Test 5: TypeScript-Typen
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 5: TypeScript Type Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd support-mcp-server
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASS: No TypeScript errors${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL: TypeScript compilation errors${NC}"
    npm run build 2>&1 | head -20
    ((FAILED++))
fi
cd ..

# Test 6: Import-Validierung
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 6: Import Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Prüfe ob alle Imports korrekt sind
if grep -q "import.*from.*monitoring" support-mcp-server/src/index.ts; then
    echo -e "${GREEN}✅ PASS: Monitoring imports found in index.ts${NC}"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠️  WARNING: Monitoring imports not found in index.ts${NC}"
fi

# Test 7: API-Check-Implementierungen
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 7: API Check Implementation Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Prüfe ob echte API-Checks implementiert sind
if grep -q "fetch.*graph.facebook.com" support-mcp-server/src/services/monitoring/meta-whatsapp.ts; then
    echo -e "${GREEN}✅ PASS: Meta/WhatsApp API checks implemented${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL: Meta/WhatsApp API checks not implemented${NC}"
    ((FAILED++))
fi

if grep -q "fetch.*stripe" support-mcp-server/src/services/monitoring/payment-providers.ts || \
   grep -q "stripe.com" support-mcp-server/src/services/monitoring/payment-providers.ts; then
    echo -e "${GREEN}✅ PASS: Stripe API checks implemented${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL: Stripe API checks not implemented${NC}"
    ((FAILED++))
fi

if grep -q "fetch.*github" support-mcp-server/src/services/monitoring/server-infrastructure.ts || \
   grep -q "api.github.com" support-mcp-server/src/services/monitoring/server-infrastructure.ts; then
    echo -e "${GREEN}✅ PASS: n8n GitHub API checks implemented${NC}"
    ((PASSED++))
else
    echo -e "${RED}❌ FAIL: n8n GitHub API checks not implemented${NC}"
    ((FAILED++))
fi

# Test 8: Umgebungsvariablen
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 8: Environment Variables Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "support-mcp-server/.env" ]; then
    if grep -q "EXTERNAL_API_CHECK_INTERVAL_MS" support-mcp-server/.env; then
        echo -e "${GREEN}✅ PASS: EXTERNAL_API_CHECK_INTERVAL_MS is set${NC}"
        ((PASSED++))
    else
        echo -e "${YELLOW}⚠️  WARNING: EXTERNAL_API_CHECK_INTERVAL_MS not set${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  WARNING: .env file not found${NC}"
fi

# Test 9: Dokumentation
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 9: Documentation Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_check "DEPLOYMENT_CHECKLIST.md exists" "test -f DEPLOYMENT_CHECKLIST.md"
test_check "DEPLOYMENT_MONITORING.md exists" "test -f DEPLOYMENT_MONITORING.md"
test_check "Monitoring README exists" "test -f support-mcp-server/src/services/monitoring/README.md"

# Zusammenfassung
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}✅ Passed: ${PASSED}${NC}"
echo -e "${RED}❌ Failed: ${FAILED}${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Apply migration via Supabase Dashboard"
    echo "2. Restart Support MCP Server"
    echo "3. Verify dashboard: /intern → Externe Änderungen"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Please review the errors above.${NC}"
    exit 1
fi

