# Deployment-Checkliste: External API Monitoring System

## ✅ Build-Status

- [x] TypeScript-Kompilierung erfolgreich
- [x] Alle Monitoring-Services implementiert
- [x] Automatische Update-Logik implementiert
- [x] Frontend-Komponenten erstellt
- [x] API-Routes erstellt

## 📋 Deployment-Schritte

### Schritt 1: Datenbank-Migration ausführen

**Option A: Supabase Dashboard (Empfohlen für Produktion)**

1. Öffne Supabase Dashboard → SQL Editor
2. Kopiere Inhalt von `supabase/migrations/015_external_api_changes.sql`
3. Führe SQL aus
4. Verifiziere: `SELECT * FROM external_api_changes LIMIT 1;`

**Option B: Supabase CLI (Für lokale Entwicklung)**

```bash
cd products/ai-whatsapp-bot-builder
supabase db push
```

**Option C: Direkt via psql**

```bash
psql -h <supabase-host> -U postgres -d postgres -f supabase/migrations/015_external_api_changes.sql
```

### Schritt 2: Umgebungsvariablen setzen

Füge zur `.env`-Datei des Support MCP Servers hinzu:

```bash
# External API Monitoring Check-Intervall (in Millisekunden)
# Standard: 24 Stunden (86400000 ms)
EXTERNAL_API_CHECK_INTERVAL_MS=86400000
```

**Empfohlene Werte:**
- Entwicklung: `3600000` (1 Stunde)
- Produktion: `86400000` (24 Stunden)
- Häufige Checks: `43200000` (12 Stunden)

### Schritt 3: Support MCP Server neu starten

**PM2 (Empfohlen):**

```bash
cd products/ai-whatsapp-bot-builder/support-mcp-server
pm2 restart support-mcp-server
```

**Manuell:**

```bash
cd products/ai-whatsapp-bot-builder/support-mcp-server
npm run build
npm start
```

**Docker:**

```bash
docker-compose restart support-mcp-server
```

### Schritt 4: Verifizierung

**4.1 Health Check:**

```bash
curl http://localhost:3002/health
```

Erwartete Antwort sollte `"status": "healthy"` enthalten.

**4.2 Logs prüfen:**

```bash
# PM2
pm2 logs support-mcp-server --lines 50

# Docker
docker logs support-mcp-server --tail 50
```

Erwartete Log-Einträge:
```
[INFO] Starting external API monitoring service
[INFO] Running external API checks
[INFO] Monitoring check completed
```

**4.3 Dashboard prüfen:**

1. Öffne `/intern` im Browser
2. Navigiere zum Tab "Externe Änderungen"
3. Prüfe Provider-Status
4. Prüfe Change Log

**4.4 Datenbank prüfen:**

```sql
-- Prüfe ob Tabelle existiert
SELECT COUNT(*) FROM external_api_changes;

-- Prüfe RLS Policies
SELECT * FROM pg_policies WHERE tablename = 'external_api_changes';
```

## 🔍 Troubleshooting

### Problem: Migration schlägt fehl

**Lösung:**
1. Prüfe ob Tabelle bereits existiert: `SELECT * FROM external_api_changes LIMIT 1;`
2. Falls ja, entferne `CREATE TABLE IF NOT EXISTS` und verwende `ALTER TABLE`
3. Prüfe RLS Policies: `SELECT * FROM pg_policies WHERE tablename = 'external_api_changes';`

### Problem: Monitoring startet nicht

**Lösung:**
1. Prüfe Logs auf Fehler
2. Prüfe Umgebungsvariablen: `echo $EXTERNAL_API_CHECK_INTERVAL_MS`
3. Prüfe Supabase-Verbindung
4. Prüfe Dependencies: `npm install`

### Problem: Keine Änderungen werden erkannt

**Hinweis:** Das ist normal, wenn keine neuen Änderungen vorhanden sind.

**Lösung:**
1. Prüfe Logs auf Monitoring-Aktivitäten
2. Warte auf nächsten Check-Zyklus (Standard: 24 Stunden)
3. Teste manuell: `await monitoringService.checkProvider('Meta/WhatsApp')`

### Problem: Dashboard zeigt keine Daten

**Lösung:**
1. Prüfe RLS Policies: Authentifizierte Nutzer sollten lesen können
2. Prüfe API-Route: `curl http://localhost:3000/api/intern/external-changes`
3. Prüfe Browser-Console auf Fehler
4. Prüfe Network-Tab im Browser

## 📊 Monitoring-Status prüfen

### Manueller Check

```bash
# Via Health Check Endpoint (wenn erweitert)
curl http://localhost:3002/health | jq '.services.monitoring'
```

### Via Logs

```bash
pm2 logs support-mcp-server | grep -i monitoring
```

## 🚀 Deployment-Status

- ✅ **Build**: Erfolgreich kompiliert
- ⏳ **Migration**: Muss noch ausgeführt werden
- ⏳ **Deployment**: Support MCP Server muss neu gestartet werden
- ⏳ **Verifizierung**: Nach Deployment durchführen

## 📝 Nächste Aktionen

1. **Migration ausführen** (siehe Schritt 1)
2. **Umgebungsvariable setzen** (siehe Schritt 2)
3. **Support MCP Server neu starten** (siehe Schritt 3)
4. **Verifizierung durchführen** (siehe Schritt 4)

## 🔗 Wichtige Links

- Migration: `supabase/migrations/015_external_api_changes.sql`
- Monitoring-Dokumentation: `support-mcp-server/src/services/monitoring/README.md`
- Deployment-Anleitung: `DEPLOYMENT_MONITORING.md`

