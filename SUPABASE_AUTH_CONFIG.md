# Supabase Authentication Konfiguration

## Problem: E-Mail-Verifizierung führt zu localhost:3000

Nach der Registrierung sendet Supabase eine E-Mail mit einem Verifizierungslink. Dieser Link zeigt aktuell auf `localhost:3000` statt auf die Live-Domain.

## Lösung: Supabase Dashboard konfigurieren

### Schritt 1: Site URL ändern

1. Gehen Sie zu: https://supabase.com/dashboard
2. Wählen Sie Ihr Projekt: `ugsezgnkyhcmsdpohuwf`
3. Klicken Sie auf **Settings** (⚙️) in der linken Sidebar
4. Klicken Sie auf **Authentication**
5. Scrollen Sie zu **URL Configuration**

### Schritt 2: Site URL setzen

Im Bereich **Site URL** ändern Sie:

```
Aktuell (falsch): http://localhost:3000
Neu (richtig):    https://whatsapp.owona.de
```

### Schritt 3: Redirect URLs hinzufügen

Scrollen Sie zu **Redirect URLs** und fügen Sie folgende URLs hinzu:

```
https://whatsapp.owona.de/**
https://whatsapp.owona.de/auth/callback
https://whatsapp.owona.de/de/auth/callback
https://whatsapp.owona.de/en/auth/callback
```

**Wichtig:** 
- Jede URL in eine neue Zeile
- Wildcard `/**` ermöglicht alle Pfade
- Spezifische Callback-URLs für bessere Sicherheit

### Schritt 4: E-Mail-Template prüfen (optional)

1. Bleiben Sie in **Settings > Authentication**
2. Scrollen Sie zu **Email Templates**
3. Prüfen Sie die **Confirm signup** Template
4. Stellen Sie sicher, dass `{{ .ConfirmationURL }}` verwendet wird (nicht hardcodiert)

### Schritt 5: Speichern und testen

1. Klicken Sie auf **Save** unten auf der Seite
2. Erstellen Sie einen neuen Test-Account
3. Prüfen Sie, ob der E-Mail-Link jetzt auf `https://whatsapp.owona.de` zeigt

## Technische Details

Die Auth Callback Route ist unter `/app/[locale]/auth/callback/route.ts` implementiert und:
- Verarbeitet den `code` Parameter aus der E-Mail
- Tauscht den Code gegen eine Session
- Leitet zum Dashboard weiter
- Behandelt Fehler korrekt

## Nach der Konfiguration

Nachdem Sie die URLs im Supabase Dashboard geändert haben:
- ✅ Neue E-Mail-Verifizierungslinks zeigen auf die richtige Domain
- ✅ Bestehende Links funktionieren weiterhin (mit Code-Parameter)
- ✅ Alle Auth-Flows funktionieren korrekt

