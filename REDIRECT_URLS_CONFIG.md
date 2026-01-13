# Redirect URLs Konfiguration für Supabase

## Problem
Der Bestätigungslink führt auf eine leere weiße Seite.

## Lösung

### 1. Redirect URLs in Supabase konfigurieren

Im **Supabase Dashboard**:
1. Settings > Authentication > URL Configuration
2. **Redirect URLs** hinzufügen:

```
https://whatsapp.owona.de/de/auth/callback
https://whatsapp.owona.de/**/auth/callback
https://whatsapp.owona.de/auth/callback
```

**WICHTIG:** 
- `/de/auth/callback` (mit Locale-Prefix) - **HAUPTROUTE**
- `/auth/callback` (Fallback ohne Locale)
- `/**/auth/callback` (Wildcard für alle Locales)

### 2. Site URL prüfen

**Site URL** muss sein:
```
https://whatsapp.owona.de
```

### 3. Callback-Route überprüfen

Die Callback-Route ist jetzt implementiert unter:
- `app/[locale]/auth/callback/route.ts` (mit Locale)
- `app/auth/callback/route.ts` (Fallback ohne Locale)

### 4. Test

Nach der Konfiguration:
1. Neuen Account registrieren
2. E-Mail öffnen
3. Auf Bestätigungslink klicken
4. Sollte jetzt auf Dashboard weiterleiten (nicht mehr weiße Seite!)

## Technische Details

**URL-Format:**
```
https://whatsapp.owona.de/de/auth/callback?code=xxx&next=/dashboard
```

**Ablauf:**
1. User klickt auf Link in E-Mail
2. Supabase leitet zu `/de/auth/callback?code=xxx` weiter
3. Route Handler tauscht Code gegen Session
4. Redirect zu `/de/dashboard` (oder `next` Parameter)

## Troubleshooting

**Falls weiterhin weiße Seite:**
1. Browser-Console öffnen (F12)
2. Netzwerk-Tab prüfen (HTTP Status?)
3. Server-Logs prüfen (PM2 logs)
4. Redirect URL in Supabase nochmal prüfen

---

**Datum:** 2025-11-02

