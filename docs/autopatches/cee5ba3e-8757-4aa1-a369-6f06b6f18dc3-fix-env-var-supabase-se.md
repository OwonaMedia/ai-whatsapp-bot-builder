# Autopatch Plan – fix-env_var-SUPABASE_SERVICE_URL

- Ticket: `cee5ba3e-8757-4aa1-a369-6f06b6f18dc3`
- Erstellt: 2025-11-28T08:39:18.630Z


## Kontext
Autopatch: Abweichung von Reverse Engineering Blaupause - SUPABASE_SERVICE_URL fehlt in .env.local (dokumentiert als erforderlich)

### Ausgangssituation
Der n8n Docker Container reagiert nicht mehr. Docker ps zeigt den Container als "running", aber der Service antwortet nicht.

## Ziel
Abweichung von dokumentiertem Zustand beheben: SUPABASE_SERVICE_URL fehlt in .env.local (dokumentiert als erforderlich)

## Betroffene Dateien
- .env.local

## Änderungsschritte
1. Problem: SUPABASE_SERVICE_URL fehlt in .env.local (dokumentiert als erforderlich)
2. Dokumentierter Zustand: - `SUPABASE_SERVICE_ROLE_KEY = eyJ…` (nur auf dem Server setzen!)
3. - ❌ SUPABASE_SERVICE_URL fehlt in .env.local
4. - 📋 Dokumentation erwartet: - `SUPABASE_SERVICE_ROLE_KEY = eyJ…` (nur auf dem Server setzen!)
5. - Prüfe SUPABASE_SERVICE_URL in .env.local
6. - Stelle sicher, dass SUPABASE_SERVICE_URL korrekt gesetzt ist
7. - Validiere SUPABASE_SERVICE_URL Format und Wert

## Tests & Validierung
1. SUPABASE_SERVICE_URL entspricht dokumentiertem Zustand

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
# STRIPE_SECRET_KEY=sk_test_... # Dein Secret Key NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # Dein Publishable Key STRIPE_WEBHOOK_SECRET=whsec_... # Dein Webhook Signing Secret
STRIPE_WEBHOOK_SECRET=PLACEHOLDER_VALUE

```

### Umgebungsvariablen (relevant)
- `NEXT_PUBLIC_SUPABASE_URL`: https://ugsezgnkyhcmsdpohuwf.supabase.co
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: eyJhbGci...
- `SUPABASE_SERVICE_ROLE_KEY`: eyJhbGci...
- `STRIPE_SECRET_KEY`: PLACEHOL...
- `STRIPE_WEBHOOK_SECRET`: PLACEHOL...

### Reverse Engineering Referenzen
- Konfiguration: SUPABASE_SERVICE_URL
- Typ: env_var
- Beschreibung: - `SUPABASE_SERVICE_ROLE_KEY = eyJ…` (nur auf dem Server setzen!)
- Abweichung: SUPABASE_SERVICE_URL fehlt in .env.local (dokumentiert als erforderlich)

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
1. SUPABASE_SERVICE_URL funktioniert korrekt
2. Tests durchführen

### Monitoring
- Logs prüfen
- Fehlerrate überwachen