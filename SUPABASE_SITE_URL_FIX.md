# Supabase Site URL Konfiguration - WICHTIG!

## Problem
Der Bestätigungslink in der E-Mail zeigt auf `localhost:3000` statt auf `https://whatsapp.owona.de`.

## Lösung: Site URL im Supabase Dashboard ändern

### Schritt 1: Supabase Dashboard öffnen
1. Gehen Sie zu: https://supabase.com/dashboard
2. Wählen Sie Ihr Projekt: `ugsezgnkyhcmsdpohuwf`

### Schritt 2: Site URL ändern
1. Klicken Sie auf **Settings** (⚙️) in der linken Sidebar
2. Klicken Sie auf **Authentication**
3. Scrollen Sie zu **URL Configuration**

### Schritt 3: Site URL aktualisieren
Im Bereich **Site URL** ändern Sie:

```
❌ Aktuell (falsch): http://localhost:3000
✅ Neu (richtig):    https://whatsapp.owona.de
```

### Schritt 4: Redirect URLs prüfen
Scrollen Sie zu **Redirect URLs** und stellen Sie sicher, dass folgende URLs vorhanden sind:

```
https://whatsapp.owona.de/**
https://whatsapp.owona.de/de/auth/callback
https://whatsapp.owona.de/en/auth/callback
https://whatsapp.owona.de/auth/callback
```

**Wichtig:** 
- Jede URL in eine neue Zeile
- Wildcard `/**` ermöglicht alle Pfade
- Spezifische Callback-URLs für bessere Sicherheit

### Schritt 5: Speichern
1. Klicken Sie auf **Save** unten auf der Seite
2. Warten Sie 30-60 Sekunden, bis die Änderungen propagiert wurden

### Schritt 6: Test
Nach der Konfiguration:
1. **Neuen Account registrieren** (alte Links funktionieren nicht mehr!)
2. E-Mail öffnen
3. Der Link sollte jetzt auf `https://whatsapp.owona.de` zeigen (nicht mehr `localhost:3000`)

## Warum passiert das?
- Supabase verwendet die **Site URL** als Basis für alle E-Mail-Verifizierungslinks
- Wenn die Site URL auf `localhost:3000` steht, enthalten alle E-Mail-Links diese Domain
- Dies ist eine Sicherheitsmaßnahme, um sicherzustellen, dass Links nur zu erlaubten Domains führen

## Alte Links
⚠️ **Wichtig:** Nach der Änderung der Site URL funktionieren **alte Bestätigungslinks nicht mehr**, 
da sie auf die alte Domain (`localhost:3000`) zeigen.

Benutzer müssen:
- Eine neue Bestätigungs-E-Mail anfordern, oder
- Sich erneut registrieren

Die neue `auth-code-error` Seite bietet jetzt einen Button zum erneuten Senden der Bestätigungs-E-Mail.

## Technische Details
- Die `emailRedirectTo` Option in `SignupForm.tsx` wird von der Site URL überschrieben, 
  wenn sie nicht in den Redirect URLs erlaubt ist
- Die Site URL wird verwendet, wenn `emailRedirectTo` nicht gesetzt ist oder nicht erlaubt ist
- Die Redirect URLs müssen explizit in der Allowlist stehen

---
**Datum:** 2025-11-02  
**Status:** ⚠️ Site URL muss noch auf `https://whatsapp.owona.de` geändert werden!

