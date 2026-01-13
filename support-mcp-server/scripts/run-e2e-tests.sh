#!/bin/bash
# Script zum Ausführen der E2E-Tests mit besserem Timeout-Handling

set -e

cd "$(dirname "$0")/.."

echo "🚀 Starte E2E-Tests für Ticket-Verarbeitung..."
echo ""

# Prüfe ob Environment-Variablen gesetzt sind
if [ -z "$SUPABASE_SERVICE_URL" ] && [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo "⚠️  WARNUNG: SUPABASE_SERVICE_URL nicht gesetzt - Tests werden möglicherweise übersprungen"
fi

# Führe Tests aus mit:
# - --run: Führe Tests aus (nicht watch mode)
# - --reporter=verbose: Detaillierte Ausgabe
# - --no-coverage: Keine Coverage-Analyse (schneller)
# - --bail=1: Stoppe nach dem ersten Fehler (optional, auskommentiert)
echo "📋 Führe E2E-Tests aus..."
echo "   (Dies kann 5-15 Minuten dauern, da echte Tickets verarbeitet werden)"
echo ""

npm test -- src/services/actions/__tests__/e2e/real-ticket-processing.test.ts \
  --run \
  --reporter=verbose \
  --no-coverage \
  2>&1 | tee /tmp/e2e-test-output.log

echo ""
echo "✅ Tests abgeschlossen!"
echo "📄 Vollständige Ausgabe gespeichert in: /tmp/e2e-test-output.log"

