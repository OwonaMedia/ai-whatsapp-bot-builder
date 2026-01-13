# Environment Variable Check - WICHTIG!

## Problem
Template ist korrekt (`{{ .RedirectTo }}`), aber E-Mails zeigen trotzdem auf `localhost:3000`.

## Ursache
**Die Environment-Variable `NEXT_PUBLIC_APP_URL` ist auf dem Server nicht gesetzt oder zeigt auf localhost!**

## Lösung: Environment Variable prüfen und setzen

### Schritt 1: Server-Verbindung prüfen

Auf dem Hetzner-Server (91.99.232.126):

```bash
# SSH zum Server
ssh root@91.99.232.126

# Navigiere zum Projekt
cd /root/whatsapp-bot-builder/frontend

# Prüfe Environment-Variablen
cat .env.local | grep NEXT_PUBLIC_APP_URL
```

### Schritt 2: Environment Variable setzen

**Falls nicht gesetzt oder falsch:**

```bash
# .env.local bearbeiten
nano .env.local

# Hinzufügen/Bearbeiten:
NEXT_PUBLIC_APP_URL=https://whatsapp.owona.de
NEXT_PUBLIC_APP_DOMAIN=whatsapp.owona.de
```

### Schritt 3: PM2 neu starten

```bash
# PM2 neu laden (lädt neue Environment-Variablen)
pm2 reload whatsapp-bot-builder

# ODER komplett neu starten
pm2 restart whatsapp-bot-builder

# Status prüfen
pm2 status
pm2 logs whatsapp-bot-builder --lines 50
```

### Schritt 4: Code-Fix (bereits implementiert)

Der Code wurde angepasst, um `window.location.origin` zu verwenden (Client-Side):
- Verwendet automatisch die aktuelle Domain
- Funktioniert immer, auch wenn Environment-Variable fehlt

## Alternative: Hardcoded URL (nur als Notfall)

Falls Environment-Variablen nicht funktionieren:

```typescript
emailRedirectTo: 'https://whatsapp.owona.de/de/auth/callback?next=/dashboard',
```

**Aber:** Das ist keine gute Lösung, da es nicht für Development funktioniert.

## Prüfung nach Fix

1. ✅ Neue Registrierung durchführen
2. ✅ Browser-Console prüfen: Sollte `[SignupForm] emailRedirectTo: https://whatsapp.owona.de/...` zeigen
3. ✅ E-Mail prüfen: Link sollte auf `whatsapp.owona.de` zeigen
4. ✅ Link klicken: Sollte zum Dashboard weiterleiten

## Warum passiert das?

**Next.js Environment-Variablen:**
- `NEXT_PUBLIC_*` werden zur Build-Zeit eingebettet
- Wenn sie zur Build-Zeit nicht gesetzt sind, wird der Fallback-Wert verwendet
- Bei Production-Builds müssen sie VOR dem Build gesetzt sein

**Client-Side Fallback:**
- `window.location.origin` funktioniert immer Client-Side
- Verwendet automatisch die aktuelle Domain
- Keine Environment-Variable nötig

---
**Datum:** 2025-11-02  
**Status:** ✅ Code-Fix implementiert (verwendet window.location.origin)

