# Supabase SMTP Konfiguration mit Goneo - KORREKTE Einstellungen

## ⚠️ WICHTIG: Korrekte Goneo SMTP-Einstellungen

Basierend auf der [offiziellen Goneo-Dokumentation](https://www.goneo.de/hilfe/email/serverdaten):

### Option 1: SSL (Port 465) - **EMPFOHLEN**

```
Enable Custom SMTP:    ✓ ON

SMTP Host:            smtp.goneo.de
                      (NICHT mail.goneo.de!)

SMTP Port:            465

SMTP User:            info@owona.de
                      (Vollständige E-Mail-Adresse)

SMTP Password:        Afidi2008!

Sender Name:          WhatsApp Bot Builder

Sender Email:         info@owona.de
```

### Option 2: STARTTLS (Port 587) - Alternative

Falls Port 465 nicht funktioniert:

```
Enable Custom SMTP:    ✓ ON

SMTP Host:            smtp.goneo.de

SMTP Port:            587

SMTP User:            info@owona.de

SMTP Password:        Afidi2008!

Sender Name:          WhatsApp Bot Builder

Sender Email:         info@owona.de
```

## In Supabase Dashboard konfigurieren

### Schritt 1: Dashboard öffnen

1. https://supabase.com/dashboard
2. Projekt: `ugsezgnkyhcmsdpohuwf`
3. **Settings** > **Authentication**

### Schritt 2: SMTP Settings

1. Scrollen Sie zu **SMTP Settings**
2. Aktivieren Sie **Enable Custom SMTP**

### Schritt 3: Eingeben (GENAU wie oben)

**WICHTIG:** Verwenden Sie `smtp.goneo.de` (NICHT `mail.goneo.de`!)

### Schritt 4: Speichern & Testen

## Troubleshooting - E-Mail kommt nicht an

### 1. Prüfen Sie Supabase Logs

1. Dashboard > **Logs** > **Auth Logs**
2. Prüfen Sie auf SMTP-Fehler
3. Suchen Sie nach "SMTP", "authentication failed", "connection refused"

### 2. Prüfen Sie die Konfiguration

Stellen Sie sicher:
- ✅ SMTP Host: `smtp.goneo.de` (exakt!)
- ✅ Port: `465` (SSL) oder `587` (STARTTLS)
- ✅ Benutzername: `info@owona.de` (vollständig!)
- ✅ Passwort: `Afidi2008!` (korrekt, ohne Leerzeichen)
- ✅ Enable Custom SMTP: **aktiviert**

### 3. Testen Sie Port 587

Falls Port 465 nicht funktioniert:
1. Ändern Sie Port zu `587`
2. Verschlüsselung sollte automatisch auf STARTTLS/TLS gesetzt werden
3. Speichern & erneut testen

### 4. Prüfen Sie Goneo-Account

1. Loggen Sie sich in Ihr Goneo-Kundencenter ein
2. Prüfen Sie, ob `info@owona.de` aktiv ist
3. Testen Sie, ob Sie sich mit diesen Zugangsdaten im Webmail anmelden können
4. Prüfen Sie, ob das E-Mail-Konto gesperrt oder deaktiviert ist

### 5. Spam-Ordner prüfen

- E-Mails könnten im Spam-Ordner landen
- Prüfen Sie auch Promotions/Andere Tabs in Gmail

### 6. Supabase E-Mail-Template prüfen

1. Dashboard > **Settings** > **Authentication** > **Email Templates**
2. Prüfen Sie "Confirm signup" Template
3. Stellen Sie sicher, dass `{{ .ConfirmationURL }}` verwendet wird

### 7. Test mit anderem E-Mail-Programm

Testen Sie, ob der SMTP-Server grundsätzlich funktioniert:
- Verwenden Sie Outlook, Thunderbird oder ein ähnliches Programm
- Konfigurieren Sie `info@owona.de` mit diesen SMTP-Einstellungen
- Versenden Sie eine Test-E-Mail

Falls das nicht funktioniert, liegt das Problem bei Goneo, nicht bei Supabase.

## Häufige Fehler

### ❌ "Authentication failed"

- Passwort falsch? (Leerzeichen am Anfang/Ende?)
- Benutzername vollständig? (`info@owona.de`, nicht nur `info`)
- E-Mail-Konto aktiv?

### ❌ "Connection refused" oder "Connection timeout"

- SMTP Host korrekt? (`smtp.goneo.de`)
- Port korrekt? (465 oder 587)
- Firewall blockiert?

### ❌ E-Mail kommt, aber nicht von info@owona.de

- "Sender Email" auf `info@owona.de` gesetzt?
- Custom SMTP wirklich aktiviert? (Toggle muss ON sein)

## Nächste Schritte

Nach der Konfiguration:
1. ✅ Speichern Sie die Einstellungen
2. ✅ Warten Sie 1-2 Minuten (Propagierung)
3. ✅ Erstellen Sie einen Test-Account
4. ✅ Prüfen Sie Spam-Ordner
5. ✅ Prüfen Sie Supabase Auth Logs bei Problemen

