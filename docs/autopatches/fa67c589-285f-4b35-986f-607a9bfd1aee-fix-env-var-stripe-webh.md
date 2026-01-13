# Autopatch Plan – fix-env_var-STRIPE_WEBHOOK_SECRET

- Ticket: `fa67c589-285f-4b35-986f-607a9bfd1aee`
- Erstellt: 2025-11-28T08:37:18.282Z


## Kontext
Autopatch: Abweichung von Reverse Engineering Blaupause - STRIPE_WEBHOOK_SECRET fehlt in .env.local (dokumentiert als erforderlich)

### Ausgangssituation
Bei der Zahlung mit Stripe kommt der Fehler "STRIPE_SECRET_KEY is not set". Die Zahlung kann nicht abgeschlossen werden.

## Ziel
Abweichung von dokumentiertem Zustand beheben: STRIPE_WEBHOOK_SECRET fehlt in .env.local (dokumentiert als erforderlich)

## Betroffene Dateien
- .env.local

## Änderungsschritte
1. Problem: STRIPE_WEBHOOK_SECRET fehlt in .env.local (dokumentiert als erforderlich)
2. Dokumentierter Zustand: STRIPE_SECRET_KEY=sk_test_... # Dein Secret Key NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # Dein Publishable Key STRIPE_WEBHOOK_SECRET=whsec_... # Dein Webhook Signing Secret
3. - ❌ STRIPE_WEBHOOK_SECRET fehlt in .env.local
4. - 📋 Dokumentation erwartet: STRIPE_SECRET_KEY=sk_test_... # Dein Secret Key NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # Dein Publishable Key STRIPE_WEBHOOK_SECRET=whsec_... # Dein Webhook Signing Secret
5. - Prüfe STRIPE_WEBHOOK_SECRET in .env.local
6. - Stelle sicher, dass STRIPE_WEBHOOK_SECRET korrekt gesetzt ist
7. - Validiere STRIPE_WEBHOOK_SECRET Format und Wert

## Tests & Validierung
1. STRIPE_WEBHOOK_SECRET entspricht dokumentiertem Zustand

## Rollout/Deployment
1. `npm run build`
2. `pm2 restart whatsapp-bot-builder --update-env`

## System-Zustand

### Aktuelle Datei-Inhalte

#### .env.local
```typescript
# Shared environment for deployment builds
NEXT_PUBLIC_SUPABASE_URL=https://ugsezgnkyhcmsdpohuwf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnc2V6Z25reWhjbXNkcG9odXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxMDI2NDAsImV4cCI6MjA3MjY3ODY0MH0.H7s5PSdTDOiHyeic61lcIGFjVITW-ikz8y6c5_bn6Ao
NEXT_PUBLIC_APP_URL=https://whatsapp.owona.de
NEXT_PUBLIC_APP_NAME=WhatsApp Bot Builder
NEXT_PUBLIC_APP_DOMAIN=whatsapp.owona.de
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnc2V6Z25reWhjbXNkcG9odXdmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzEwMjY0MCwiZXhwIjoyMDcyNjc4NjQwfQ.PEG6Z3WVpfHgxZIpuLL4aSenbWVVTmYypCvO8knahPM
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # Dein Publishable Key
STRIPE_SECRET_KEY=PLACEHOLDER_VALUE

```

### Umgebungsvariablen (relevant)
- `NEXT_PUBLIC_SUPABASE_URL`: https://ugsezgnkyhcmsdpohuwf.supabase.co
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: eyJhbGci...
- `SUPABASE_SERVICE_ROLE_KEY`: eyJhbGci...
- `STRIPE_SECRET_KEY`: PLACEHOL...

### Reverse Engineering Referenzen
- Konfiguration: STRIPE_WEBHOOK_SECRET
- Typ: env_var
- Beschreibung: STRIPE_SECRET_KEY=sk_test_... # Dein Secret Key NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # Dein Publishable Key STRIPE_WEBHOOK_SECRET=whsec_... # Dein Webhook Signing Secret
- Abweichung: STRIPE_WEBHOOK_SECRET fehlt in .env.local (dokumentiert als erforderlich)

## Code-Änderungen (Diff)

## Kontext & Abhängigkeiten

## Fehlerbehandlung & Rollback

### Mögliche Fehler
- fehlt
- falsch
- ungültig
- nicht gesetzt
- undefined
- missing
- invalid

### Rollback-Strategie
Wiederherstellung von Backup oder Git-Revert

### Validierungsschritte
1. STRIPE_WEBHOOK_SECRET funktioniert korrekt
2. Tests durchführen

### Monitoring
- Logs prüfen
- Fehlerrate überwachen