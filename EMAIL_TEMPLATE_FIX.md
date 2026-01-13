# E-Mail-Template Fix - WICHTIG!

## Problem
E-Mails leiten trotz korrekter `redirect_to` Parameter auf `localhost:3000` weiter.

## Ursache
Die E-Mail-Templates in Supabase verwenden `{{ .SiteURL }}` statt `{{ .RedirectTo }}`.

Laut Supabase Dokumentation:
> "When using a `redirectTo` option, you may need to replace the `{{ .SiteURL }}` with `{{ .RedirectTo }}` in your email templates."

## Lösung: E-Mail-Templates anpassen

### Schritt 1: Supabase Dashboard öffnen
1. https://supabase.com/dashboard
2. Projekt: `ugsezgnkyhcmsdpohuwf`
3. **Settings** → **Authentication** → **Email Templates**

### Schritt 2: "Confirm signup" Template anpassen

**Aktuell (wahrscheinlich):**
```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">
  Confirm your email
</a>
```

**Ändern zu:**
```html
<a href="{{ .RedirectTo }}">
  Confirm your email
</a>
```

**ODER** (für PKCE Flow mit token_hash):
```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email">
  Confirm your email
</a>
```

### Schritt 3: "Magic Link" Template prüfen (falls verwendet)

Falls Sie Magic Links verwenden, auch dort anpassen:

**Von:**
```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">
```

**Zu:**
```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email">
```

### Schritt 4: Speichern und testen

1. Klicken Sie auf **Save**
2. **WICHTIG:** Erstellen Sie einen **NEUEN Test-Account**
   - Alte E-Mails wurden mit den alten Templates generiert
   - Neue E-Mails verwenden das aktualisierte Template

## Erklärung

**{{ .SiteURL }}**
- Zeigt immer auf die Site URL aus dem Dashboard
- Wird verwendet, wenn kein `redirect_to` Parameter gesetzt ist
- **Ignoriert den `redirect_to` Parameter!**

**{{ .RedirectTo }}**
- Zeigt auf den `redirect_to` Parameter aus `signUp()`
- Funktioniert nur, wenn `redirect_to` in Redirect URLs erlaubt ist
- **Verwendet die URL, die wir im Code setzen!**

## Code-Review

In `SignupForm.tsx` setzen wir:
```typescript
emailRedirectTo: `${config.app.url}/de/auth/callback?next=/dashboard`
```

Das bedeutet, `{{ .RedirectTo }}` enthält:
```
https://whatsapp.owona.de/de/auth/callback?next=/dashboard
```

## Templates Variablen

Supabase stellt folgende Variablen zur Verfügung:
- `{{ .SiteURL }}` - Site URL aus Dashboard
- `{{ .RedirectTo }}` - redirect_to Parameter (wenn erlaubt)
- `{{ .TokenHash }}` - Token Hash für PKCE Flow
- `{{ .Token }}` - 6-stelliger OTP Code
- `{{ .Email }}` - E-Mail-Adresse des Benutzers

## Nach der Änderung

1. ✅ Template verwendet `{{ .RedirectTo }}`
2. ✅ Neue E-Mails zeigen auf `https://whatsapp.owona.de`
3. ✅ Callback-Route wird korrekt aufgerufen
4. ✅ Weiterleitung zum Dashboard funktioniert

---
**Datum:** 2025-11-02  
**Status:** ⚠️ E-Mail-Templates müssen angepasst werden!

