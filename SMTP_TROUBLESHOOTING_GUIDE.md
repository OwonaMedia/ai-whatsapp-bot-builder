# SMTP Troubleshooting Guide - Supabase mit Goneo

## Wenn keine E-Mail ankommt - Systematische Fehlersuche

### Schritt 1: Supabase Logs prüfen

#### Option A: SQL Editor (für detaillierte Logs)

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
  metadata::text ILIKE '%smtp%'
ORDER BY timestamp DESC
LIMIT 50;
```

#### Option B: Dashboard Logs (einfacher)

1. Dashboard > **Logs** > **Edge Logs**
2. Filter: `smtp` oder `email`
3. Zeitraum: Letzte Stunde / Letzter Tag

#### Option C: Auth Logs (spezifisch)

1. Dashboard > **Authentication** > **Logs**
2. Hier werden alle Auth-Events angezeigt

### Schritt 2: Häufige Fehler und Lösungen

#### Fehler: "SMTP authentication failed" oder "535 Authentication failed"

**Mögliche Ursachen:**
- Falsches Passwort
- Falscher Benutzername
- E-Mail-Konto gesperrt/deaktiviert

**Lösung:**
1. Prüfen Sie Passwort: `Afidi2008!` (genau so, keine Leerzeichen)
2. Prüfen Sie Benutzername: `info@owona.de` (vollständig!)
3. Loggen Sie sich ins Goneo-Webmail ein, um Konto zu testen

#### Fehler: "Connection refused" oder "Connection timeout"

**Mögliche Ursachen:**
- Falscher SMTP-Host
- Falscher Port
- Firewall blockiert

**Lösung:**
1. SMTP Host: `smtp.goneo.de` (exakt!)
2. Port: `465` (SSL) oder `587` (STARTTLS)
3. Beide Ports probieren

#### Fehler: "SSL handshake failed"

**Mögliche Ursachen:**
- Falsche Verschlüsselungsmethode
- Port/Verschlüsselung stimmen nicht überein

**Lösung:**
- Port 465 = SSL
- Port 587 = STARTTLS/TLS
- Passende Kombination verwenden

#### Kein Fehler, aber E-Mail kommt nicht an

**Mögliche Ursachen:**
- E-Mail im Spam-Ordner
- Falsche Empfänger-E-Mail
- SMTP-Server blockiert Supabase IPs

**Lösung:**
1. Spam-Ordner prüfen
2. Test-E-Mail an verschiedene Adressen senden
3. Goneo-Kunden-Support kontaktieren (falls IPs geblockt werden)

### Schritt 3: SMTP-Konfiguration nochmal prüfen

Gehen Sie zu: **Settings** > **Authentication** > **SMTP Settings**

**Checkliste:**
- [ ] Enable Custom SMTP: **ON** (aktiviert!)
- [ ] SMTP Host: `smtp.goneo.de` (nicht mail.goneo.de!)
- [ ] SMTP Port: `465` oder `587`
- [ ] SMTP User: `info@owona.de` (vollständig!)
- [ ] SMTP Password: `Afidi2008!` (korrekt!)
- [ ] Sender Email: `info@owona.de`
- [ ] Alle Felder gespeichert?

### Schritt 4: Test mit anderem E-Mail-Programm

Um zu prüfen, ob der SMTP-Server grundsätzlich funktioniert:

1. Installieren Sie Thunderbird oder Outlook
2. Konfigurieren Sie `info@owona.de` mit:
   - SMTP: `smtp.goneo.de`
   - Port: `465` (SSL)
   - Benutzer: `info@owona.de`
   - Passwort: `Afidi2008!`
3. Versenden Sie eine Test-E-Mail

**Falls das nicht funktioniert:** Problem liegt bei Goneo, nicht bei Supabase.

### Schritt 5: Supabase Test-E-Mail senden

In Supabase gibt es einen Test-Button:
1. **Settings** > **Authentication** > **SMTP Settings**
2. Scrollen Sie nach unten
3. Suchen Sie nach "Test SMTP" oder "Send Test Email"
4. Geben Sie eine Test-E-Mail-Adresse ein
5. Klicken Sie auf "Send"

**Falls Test erfolgreich:** SMTP funktioniert, Problem liegt woanders.
**Falls Test fehlschlägt:** Fehlermeldung in Logs prüfen.

### Schritt 6: Alternative Ports/Verschlüsselung probieren

#### Konfiguration 1: SSL (Port 465)
```
SMTP Host: smtp.goneo.de
SMTP Port: 465
```

#### Konfiguration 2: STARTTLS (Port 587)
```
SMTP Host: smtp.goneo.de
SMTP Port: 587
```

Beide Konfigurationen testen!

### Schritt 7: Goneo Support kontaktieren

Falls nichts funktioniert:

1. Loggen Sie sich ins Goneo-Kundencenter ein
2. Kontaktieren Sie den Support
3. Fragen Sie:
   - Ist `info@owona.de` aktiv?
   - Gibt es Einschränkungen für externen SMTP-Zugriff?
   - Werden bestimmte IPs geblockt?
   - Ist SMTP-Authentifizierung aktiviert?

### Schritt 8: Alternative: Resend verwenden

Falls Goneo SMTP Probleme macht, können Sie temporär Resend verwenden:

1. **Resend Account**: https://resend.com/signup (kostenlos)
2. **Domain hinzufügen**: `owona.de`
3. **DNS-Einträge**: In Goneo DNS-Settings hinzufügen
4. **API Key erstellen**: In Resend Dashboard
5. **In Supabase konfigurieren**:
   - Host: `smtp.resend.com`
   - Port: `587`
   - User: `resend`
   - Password: [Resend API Key]
   - From: `info@owona.de`

## Nächste Schritte

1. ✅ Logs in Supabase prüfen
2. ✅ Fehlermeldung identifizieren
3. ✅ Entsprechende Lösung aus diesem Guide anwenden
4. ✅ Falls nötig: Goneo Support kontaktieren

## Wichtigste Punkte

- ✅ SMTP Host: `smtp.goneo.de` (exakt!)
- ✅ Port: `465` (SSL) oder `587` (STARTTLS)
- ✅ Benutzername: `info@owona.de` (vollständig!)
- ✅ Passwort: `Afidi2008!` (keine Leerzeichen!)
- ✅ Custom SMTP muss aktiviert sein!
- ✅ Logs prüfen für konkrete Fehlermeldungen!

