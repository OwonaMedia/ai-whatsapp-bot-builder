# Redirect URLs Problem - LÖSUNG

## Problem
Beide E-Mail-Template Varianten (`{{ .SiteURL }}` und `{{ .RedirectTo }}`) zeigen auf `localhost:3000`.

## Ursache
**Der `redirect_to` Parameter ist NICHT in der Redirect URLs Allow-List!**

Laut Supabase Dokumentation:
> "If the `redirectTo` URL is not in the allowed redirect URLs list, Supabase will ignore it and use `SITE_URL` instead."

## Lösung: Redirect URLs hinzufügen

### Schritt 1: Supabase Dashboard öffnen
1. https://supabase.com/dashboard
2. Projekt: `ugsezgnkyhcmsdpohuwf`
3. **Settings** → **Authentication** → **URL Configuration**

### Schritt 2: Redirect URLs prüfen

**Aktuell (wahrscheinlich):**
- Site URL: `https://whatsapp.owona.de` ✅
- Redirect URLs:
  - `https://whatsapp.owona.de/**` (falls vorhanden)
  - `http://localhost:3000/**` (für Entwicklung)

### Schritt 3: Redirect URL hinzufügen

**WICHTIG:** Fügen Sie genau diese URL hinzu:

```
https://whatsapp.owona.de/de/auth/callback
```

**ODER** (mit Wildcard für alle Callback-Pfade):

```
https://whatsapp.owona.de/**/auth/callback
```

**ODER** (mit Wildcard für alle Pfade):

```
https://whatsapp.owona.de/**
```

### Schritt 4: Speichern

1. Klicken Sie auf **Save**
2. **Warten Sie 15-30 Sekunden** (Propagierungszeit)
3. Erstellen Sie einen **NEUEN Test-Account**

## Warum funktioniert es jetzt?

**Vorher:**
```
redirect_to: https://whatsapp.owona.de/de/auth/callback?next=/dashboard
↓
Nicht in Allow-List → Ignoriert
↓
SiteURL verwendet → localhost:3000 (weil Site URL noch auf localhost war)
```

**Nachher:**
```
redirect_to: https://whatsapp.owona.de/de/auth/callback?next=/dashboard
↓
In Allow-List ✅
↓
{{ .RedirectTo }} verwendet → https://whatsapp.owona.de/de/auth/callback?next=/dashboard
```

## Code-Review

In `SignupForm.tsx` setzen wir:
```typescript
emailRedirectTo: `${config.app.url}/de/auth/callback?next=/dashboard`
```

Das bedeutet, die **genaue URL** muss erlaubt sein:
```
https://whatsapp.owona.de/de/auth/callback
```

## Empfohlene Redirect URLs

Für Produktion:
- `https://whatsapp.owona.de/**` (alle Pfade)

Für Entwicklung (optional):
- `http://localhost:3000/**`
- `http://localhost:3999/**` (falls verwendet)

## Prüfung

Nach dem Speichern:
1. ✅ Neue E-Mail öffnen
2. ✅ Link kopieren
3. ✅ URL prüfen: Sollte `https://whatsapp.owona.de/de/auth/callback` enthalten
4. ✅ Klicken: Sollte zu Dashboard weiterleiten

---
**Datum:** 2025-11-02  
**Status:** ⚠️ Redirect URLs müssen konfiguriert werden!

