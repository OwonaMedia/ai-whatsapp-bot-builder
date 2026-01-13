# Deployment-Anleitung: External API Monitoring System

## Übersicht

Diese Anleitung beschreibt die Schritte zur Aktivierung des External API Monitoring Systems in der Produktion.

## Voraussetzungen

- ✅ Supabase-Projekt mit Zugriff auf die Datenbank
- ✅ Support MCP Server läuft
- ✅ Migration-Datei `015_external_api_changes.sql` vorhanden

## Schritt 1: Datenbank-Migration ausführen

### Option A: Supabase CLI (Empfohlen)

```bash
cd products/ai-whatsapp-bot-builder
supabase migration up
```

### Option B: Supabase Dashboard

1. Öffne das Supabase Dashboard
2. Gehe zu "SQL Editor"
3. Kopiere den Inhalt von `supabase/migrations/015_external_api_changes.sql`
4. Führe das SQL-Script aus

### Option C: Direkt via SQL

```bash
psql -h <supabase-host> -U postgres -d postgres -f supabase/migrations/015_external_api_changes.sql
```

### Verifizierung

Prüfe, ob die Tabelle erstellt wurde:

```sql
SELECT * FROM external_api_changes LIMIT 1;
```

## Schritt 2: Umgebungsvariablen konfigurieren

Füge die folgende Umgebungsvariable zur `.env`-Datei des Support MCP Servers hinzu:

```bash
# External API Monitoring Check-Intervall (in Millisekunden)
# Standard: 24 Stunden (86400000 ms)
EXTERNAL_API_CHECK_INTERVAL_MS=86400000
```

### Empfohlene Intervalle

- **Entwicklung**: 1 Stunde (3600000 ms) - für schnelleres Testing
- **Produktion**: 24 Stunden (86400000 ms) - Standard
- **Häufige Checks**: 12 Stunden (43200000 ms) - für kritische APIs

## Schritt 3: Support MCP Server neu starten

### Option A: PM2 (Empfohlen)

```bash
cd products/ai-whatsapp-bot-builder/support-mcp-server
pm2 restart support-mcp-server
```

### Option B: Manuell

```bash
cd products/ai-whatsapp-bot-builder/support-mcp-server
npm run build
npm start
```

### Option C: Docker

```bash
docker-compose restart support-mcp-server
```

## Schritt 4: Verifizierung

### 4.1 Health Check

Prüfe den Health-Check-Endpoint:

```bash
curl http://localhost:3002/health
```

Erwartete Antwort sollte `"status": "healthy"` enthalten.

### 4.2 Logs prüfen

Prüfe die Logs auf Monitoring-Aktivitäten:

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

### 4.3 Dashboard prüfen

1. Öffne `/intern` im Browser
2. Navigiere zum Tab "Externe Änderungen"
3. Prüfe, ob Provider-Status angezeigt wird
4. Prüfe, ob Change Log leer ist (initial)

## Schritt 5: Manueller Test (Optional)

### 5.1 Manueller Check auslösen

Falls du einen manuellen Check auslösen möchtest, kannst du einen Health-Check-Endpoint erweitern oder direkt im Code testen.

### 5.2 Test-Daten einfügen (Optional)

Für Testing kannst du Test-Daten einfügen:

```sql
INSERT INTO external_api_changes (
  provider,
  change_type,
  title,
  description,
  impact,
  status,
  auto_updated
) VALUES (
  'Meta/WhatsApp',
  'api_update',
  'Test: API Update',
  'Dies ist ein Test-Eintrag',
  'low',
  'detected',
  false
);
```

## Schritt 6: Monitoring konfigurieren

### 6.1 Alerts einrichten (Optional)

Richte Alerts für kritische Änderungen ein:

```sql
-- Beispiel: Alert für kritische Änderungen
CREATE OR REPLACE FUNCTION notify_critical_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.impact = 'critical' THEN
    -- Hier könntest du eine Notification senden
    -- z.B. via Supabase Realtime, Email, etc.
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER critical_change_alert
  AFTER INSERT ON external_api_changes
  FOR EACH ROW
  EXECUTE FUNCTION notify_critical_changes();
```

### 6.2 Retention Policy (Optional)

Richte eine Retention Policy für alte Einträge ein:

```sql
-- Lösche Einträge älter als 90 Tage
DELETE FROM external_api_changes
WHERE detected_at < NOW() - INTERVAL '90 days'
  AND status IN ('updated', 'failed');
```

## Fehlerbehebung

### Problem: Migration schlägt fehl

**Lösung:**
1. Prüfe, ob die Tabelle bereits existiert: `SELECT * FROM external_api_changes LIMIT 1;`
2. Falls ja, entferne `CREATE TABLE IF NOT EXISTS` und verwende `ALTER TABLE`
3. Prüfe RLS Policies: `SELECT * FROM pg_policies WHERE tablename = 'external_api_changes';`

### Problem: Monitoring startet nicht

**Lösung:**
1. Prüfe Logs auf Fehler
2. Prüfe Umgebungsvariablen: `echo $EXTERNAL_API_CHECK_INTERVAL_MS`
3. Prüfe Supabase-Verbindung
4. Prüfe, ob alle Dependencies installiert sind: `npm install`

### Problem: Keine Änderungen werden erkannt

**Hinweis:** Die Monitore sind als Framework implementiert. Für echte Erkennung müssen die einzelnen Monitore mit echten API-Checks erweitert werden.

**Lösung:**
1. Prüfe Logs auf Monitoring-Aktivitäten
2. Erweitere die einzelnen Monitore mit echten API-Checks
3. Teste manuell: `await monitoringService.checkProvider('Meta/WhatsApp')`

### Problem: Dashboard zeigt keine Daten

**Lösung:**
1. Prüfe RLS Policies: Authentifizierte Nutzer sollten lesen können
2. Prüfe API-Route: `curl http://localhost:3000/api/intern/external-changes`
3. Prüfe Browser-Console auf Fehler
4. Prüfe Network-Tab im Browser

## Nächste Schritte

### 1. Monitore erweitern

Implementiere echte API-Checks in den einzelnen Monitoren:

- **MetaWhatsAppMonitor**: Meta Graph API Changelog Parsing
- **StripeMonitor**: Stripe API Changelog API
- **PayPalMonitor**: PayPal API Changelog
- etc.

### 2. Automatische Updates implementieren

Erweitere den `UpdateHandler` mit echten Update-Strategien:

- Code-Generierung für API-Updates
- Config-Updates
- Deployment-Automatisierung

### 3. Notifications einrichten

Richte Benachrichtigungen für kritische Änderungen ein:

- Email-Benachrichtigungen
- Slack-Integration
- Supabase Realtime Notifications

## Support

Bei Problemen:
1. Prüfe die Logs
2. Prüfe die Dokumentation in `support-mcp-server/src/services/monitoring/README.md`
3. Erstelle ein Issue im Repository

## Checkliste

- [ ] Migration ausgeführt
- [ ] Tabelle `external_api_changes` existiert
- [ ] RLS Policies aktiviert
- [ ] Umgebungsvariable `EXTERNAL_API_CHECK_INTERVAL_MS` gesetzt
- [ ] Support MCP Server neu gestartet
- [ ] Health Check erfolgreich
- [ ] Logs zeigen Monitoring-Aktivitäten
- [ ] Dashboard zeigt Provider-Status
- [ ] Change Log funktioniert

