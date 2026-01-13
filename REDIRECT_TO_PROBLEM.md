# Problem: redirect_to wird ignoriert - weiterleitung zu localhost

## Problem
Der E-Mail-Link enthält:
```
redirect_to=https://whatsapp.owona.de/auth/callback
```

Aber Supabase leitet weiter zu:
```
https://localhost:3000/de/dashboard
```

## Ursache
Supabase verwendet die **Site URL** aus dem Dashboard als Basis, wenn:
1. Die Site URL noch auf `localhost:3000` steht
2. Der `redirect_to` Parameter nicht in den Redirect URLs erlaubt ist
3. Die Redirect URLs nicht korrekt konfiguriert sind

## Lösung

### Schritt 1: Site URL prüfen und ändern

**Supabase Dashboard:**
1. https://supabase.com/dashboard
2. Projekt: `ugsezgnkyhcmsdpohuwf`
3. **Settings** → **Authentication** → **URL Configuration**

**Site URL prüfen:**
```
❌ Falsch: http://localhost:3000
✅ Richtig: https://whatsapp.owona.de
```

**WICHTIG:** Falls `localhost:3000` noch steht, ändern Sie es!

### Schritt 2: Redirect URLs prüfen

Im Bereich **Redirect URLs** müssen folgende URLs vorhanden sein:

```
https://whatsapp.owona.de/**
https://whatsapp.owona.de/auth/callback
https://whatsapp.owona.de/de/auth/callback
https://whatsapp.owona.de/en/auth/callback
```

**Jede URL in eine neue Zeile!**

### Schritt 3: Speichern und warten

1. Klicken Sie auf **Save**
2. Warten Sie **1-2 Minuten** (Propagierung kann dauern)
3. Erstellen Sie einen **neuen Test-Account** (alte Links funktionieren nicht mehr!)

## Technische Details

Der Link sieht so aus:
```
https://ugsezgnkyhcmsdpohuwf.supabase.co/auth/v1/verify
  ?token=xxx
  &type=signup
  &redirect_to=https://whatsapp.owona.de/auth/callback
```

**Was passiert:**
1. Supabase verifiziert den Token
2. Supabase prüft, ob `redirect_to` in den erlaubten URLs ist
3. Falls JA → Weiterleitung zu `redirect_to`
4. Falls NEIN → Weiterleitung zu Site URL (`localhost:3000`)

**Problem:** Site URL ist noch `localhost:3000` oder `redirect_to` ist nicht erlaubt.

## Test nach Änderung

1. ✅ Site URL auf `https://whatsapp.owona.de` gesetzt
2. ✅ Redirect URLs enthalten `https://whatsapp.owona.de/auth/callback`
3. ✅ Gespeichert und 1-2 Minuten gewartet
4. ✅ Neuer Test-Account erstellt
5. ✅ E-Mail-Link öffnet → sollte zu `whatsapp.owona.de` leiten

---
**Datum:** 2025-11-02  
**Status:** ⚠️ Site URL muss noch auf `https://whatsapp.owona.de` gesetzt werden!

