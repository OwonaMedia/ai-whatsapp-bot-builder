# E2E-Tests ausführen

## ⚠️ Wichtige Hinweise

Die E2E-Tests können **5-15 Minuten** dauern, da sie:
- Echte Tickets aus der Datenbank verarbeiten
- LLM-Aufrufe durchführen (30-60s pro Ticket)
- Knowledge Base Loading (5-10s)
- Reverse Engineering Analyzer (30-60s)
- AutoFix-Execution (10-30s)

## 🚀 Tests ausführen

### Option 1: Mit Script (Empfohlen)

```bash
cd support-mcp-server
./scripts/run-e2e-tests.sh
```

### Option 2: Direkt mit npm

```bash
cd support-mcp-server
npm test -- src/services/actions/__tests__/e2e/real-ticket-processing.test.ts --run
```

### Option 3: Nur einen spezifischen Test

```bash
cd support-mcp-server
npm test -- src/services/actions/__tests__/e2e/real-ticket-processing.test.ts --run -t "PDF-Upload"
```

## 📊 Erwartete Ergebnisse

Nach den Optimierungen sollten:
- **6-8 von 9 Tests** erfolgreich sein (67-89%)
- **Durchschnittliche Verarbeitungszeit:** 20-40s pro Ticket (vorher: 60-120s)
- **Cache-Hit-Rate:** 40-60% bei wiederholten Aufrufen

## 🔍 Debugging

Wenn Tests hängen bleiben:

1. **Prüfe Logs:**
   ```bash
   tail -f /tmp/e2e-test-output.log
   ```

2. **Prüfe Environment-Variablen:**
   ```bash
   cd support-mcp-server
   npx tsx scripts/check-test-config.ts
   ```

3. **Prüfe Test-Tickets:**
   ```bash
   cd support-mcp-server
   npx tsx scripts/check-test-tickets.ts
   ```

4. **Manuell ein Ticket verarbeiten:**
   ```bash
   cd support-mcp-server
   npx tsx scripts/process-ticket-manually.ts "PDF-Upload funktioniert nicht"
   ```

## ⏱️ Timeouts

- **Dispatch-Timeout:** 120 Sekunden (für LLM-Aufrufe)
- **Polling-Timeout:** 60 Sekunden (für Status-Updates)
- **Gesamt-Timeout pro Test:** 10 Minuten

## 🎯 Optimierungen aktiv

Die folgenden Optimierungen sind aktiv:
- ✅ **Caching:** Pattern-Erkennung wird gecacht (5 Min TTL)
- ✅ **Early-Exit:** Schnelles Keyword-Matching zuerst (< 100ms)
- ✅ **Polling:** Robuste Status-Prüfung statt fester Wartezeiten
- ✅ **Relevanz-Threshold:** 0.5 (weniger false positives)

## 📝 Test-Tickets

Die folgenden Test-Tickets werden verwendet:
1. PDF-Upload funktioniert nicht
2. WhatsApp Bot reagiert nicht mehr
3. Stripe Payment schlägt fehl
4. API-Endpoint /api/payments/checkout fehlt
5. Zugriff auf knowledge_sources verweigert
6. Checkout-Komponente fehlt
7. i18n-Übersetzung fehlt
8. Docker Container hängt
9. Server offline - 502 Bad Gateway

## 🔄 Tests zurücksetzen

Falls Tests fehlschlagen, können die Test-Tickets zurückgesetzt werden:

```bash
cd support-mcp-server
npx tsx scripts/reset-test-tickets.ts
```

