# Goneo SMTP Konfiguration für Supabase

## Ihre Zugangsdaten

- **E-Mail**: `info@owona.de`
- **Passwort**: `Afidi2008!`
- **Provider**: Goneo.de

## Goneo SMTP-Einstellungen

Goneo verwendet folgende SMTP-Einstellungen:

### Option 1: TLS (Empfohlen)
```
SMTP Host: mail.goneo.de
SMTP Port: 587
Verschlüsselung: TLS / STARTTLS
Benutzername: info@owona.de
Passwort: Afidi2008!
```

### Option 2: SSL (Alternative)
```
SMTP Host: mail.goneo.de
SMTP Port: 465
Verschlüsselung: SSL
Benutzername: info@owona.de
Passwort: Afidi2008!
```

## Konfiguration in Supabase Dashboard

### Schritt 1: Supabase Dashboard öffnen

1. Gehen Sie zu: https://supabase.com/dashboard
2. Wählen Sie Ihr Projekt: `ugsezgnkyhcmsdpohuwf`
3. Klicken Sie auf **Settings** (⚙️) in der linken Sidebar
4. Klicken Sie auf **Authentication**

### Schritt 2: SMTP Settings aktivieren

1. Scrollen Sie nach unten zu **SMTP Settings**
2. Aktivieren Sie die Option **Enable Custom SMTP** (Toggle umschalten)

### Schritt 3: SMTP-Zugangsdaten eingeben

Füllen Sie die Felder wie folgt aus:

```
Enable Custom SMTP: ✓ (aktiviert)

SMTP Host: mail.goneo.de

SMTP Port: 587
          (oder 465, falls 587 nicht funktioniert)

SMTP User: info@owona.de

SMTP Password: Afidi2008!

Sender Name: WhatsApp Bot Builder
            (oder "Owona Support", wie Sie möchten)

Sender Email: info@owona.de
```

### Schritt 4: Speichern

1. Scrollen Sie nach unten
2. Klicken Sie auf **Save**
3. Warten Sie auf die Bestätigung

### Schritt 5: Testen

1. Erstellen Sie einen Test-Account
2. Prüfen Sie die E-Mail (auch Spam-Ordner!)
3. Die E-Mail sollte von `info@owona.de` kommen
4. Der Absender-Name sollte "WhatsApp Bot Builder" sein

## Troubleshooting

### Port 587 funktioniert nicht

Falls Port 587 nicht funktioniert, versuchen Sie:
- Port: `465`
- Verschlüsselung: SSL (statt TLS)

### "Authentication failed" Fehler

1. Prüfen Sie, ob Benutzername und Passwort korrekt sind
2. Stellen Sie sicher, dass `info@owona.de` aktiviert ist
3. Prüfen Sie in Ihrem Goneo-Account, ob das E-Mail-Konto aktiv ist

### E-Mails kommen nicht an

1. **Spam-Ordner prüfen**: E-Mails könnten im Spam landen
2. **Goneo-Account prüfen**: Stellen Sie sicher, dass das E-Mail-Konto aktiv ist
3. **SMTP-Logs prüfen**: Supabase Dashboard > Logs > Auth

### E-Mails kommen weiterhin von Supabase

1. Stellen Sie sicher, dass "Enable Custom SMTP" aktiviert ist
2. Prüfen Sie, ob alle Felder korrekt ausgefüllt sind
3. Speichern Sie die Einstellungen erneut
4. Warten Sie 1-2 Minuten (Propagierung)

## Nächste Schritte

Nach erfolgreicher Konfiguration:
1. ✅ Testen Sie die Registrierung
2. ✅ Prüfen Sie, ob E-Mails von `info@owona.de` kommen
3. ✅ Testen Sie andere E-Mail-Templates (Password Reset, etc.)
4. ✅ Überprüfen Sie die E-Mail-Templates in Supabase (Settings > Authentication > Email Templates)

## Sicherheit

⚠️ **Wichtig**: 
- Das Passwort wird in Supabase verschlüsselt gespeichert
- Geben Sie diese Zugangsdaten niemals öffentlich preis
- Ändern Sie das Passwort regelmäßig

