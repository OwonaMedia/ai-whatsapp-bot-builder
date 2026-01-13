# Supabase Logs Abfragen für SMTP-Troubleshooting

## SQL-Query für Edge Logs (Auth/SMTP)

```sql
SELECT
  CAST(timestamp AS datetime) AS timestamp,
  event_message,
  metadata
FROM edge_logs
WHERE 
  event_message ILIKE '%smtp%' OR
  event_message ILIKE '%email%' OR
  event_message ILIKE '%auth%' OR
  event_message ILIKE '%error%'
ORDER BY timestamp DESC
LIMIT 50;
```

## Alternative: Spezifische SMTP-Fehler finden

```sql
SELECT
  CAST(timestamp AS datetime) AS timestamp,
  event_message,
  metadata
FROM edge_logs
WHERE 
  event_message ILIKE '%smtp%'
  OR metadata::text ILIKE '%smtp%'
  OR metadata::text ILIKE '%authentication failed%'
  OR metadata::text ILIKE '%connection refused%'
ORDER BY timestamp DESC
LIMIT 100;
```

## Wo diese Query ausführen?

### Option 1: Supabase SQL Editor
1. Dashboard > **SQL Editor**
2. Neue Query erstellen
3. Query oben einfügen
4. Ausführen

### Option 2: Supabase Dashboard Logs
1. Dashboard > **Logs** > **Edge Logs**
2. Filter: `smtp` oder `email` oder `error`
3. Zeitraum wählen (z.B. letzte Stunde)

### Option 3: Auth Logs direkt
1. Dashboard > **Authentication** > **Logs**
2. Hier sehen Sie Auth-spezifische Events

## Was in den Logs suchen?

### SMTP-Verbindungsfehler:
- "SMTP connection failed"
- "connection refused"
- "connection timeout"
- "authentication failed"

### SMTP-Authentifizierungsfehler:
- "535 Authentication failed"
- "535 Incorrect authentication data"
- "535-5.7.8 Username and Password not accepted"

### SMTP-Port/SSL-Fehler:
- "SSL handshake failed"
- "Connection closed"
- "Port 465/587 not accessible"

## Analyse-Hilfe

Falls Sie Fehler finden, schauen Sie nach:
1. **Timestamp**: Wann trat der Fehler auf?
2. **event_message**: Was ist die Fehlermeldung?
3. **metadata**: Enthält Details wie SMTP-Host, Port, etc.

## Beispiel-Output interpretieren

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "event_message": "SMTP authentication failed",
  "metadata": {
    "host": "smtp.goneo.de",
    "port": 465,
    "user": "info@owona.de",
    "error": "535 Authentication failed"
  }
}
```

**Bedeutung**: 
- SMTP-Server antwortet, aber Authentifizierung schlägt fehl
- Prüfen Sie: Passwort, Benutzername, E-Mail-Konto aktiv?

