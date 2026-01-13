# Autopatch Plan – fix-env_var-OPENAI_API_KEY

- Ticket: `ead3405e-7fb3-4f5c-89f8-de8c0896efd0`
- Erstellt: 2025-11-28T09:56:33.857Z


## Kontext
Autopatch: Abweichung von Reverse Engineering Blaupause - OPENAI_API_KEY fehlt in .env.local (dokumentiert als erforderlich)

### Ausgangssituation
Die Übersetzung für "checkout.button" fehlt in der deutschen Locale-Datei. Der Button zeigt nur den Key an.

## Ziel
Abweichung von dokumentiertem Zustand beheben: OPENAI_API_KEY fehlt in .env.local (dokumentiert als erforderlich)

## Betroffene Dateien
- .env.local

## Änderungsschritte
1. Problem: OPENAI_API_KEY fehlt in .env.local (dokumentiert als erforderlich)
2. Dokumentierter Zustand: GROQ_API_KEY=your_groq_api_key
3. - ❌ OPENAI_API_KEY fehlt in .env.local
4. - 📋 Dokumentation erwartet: GROQ_API_KEY=your_groq_api_key
5. - Prüfe OPENAI_API_KEY in .env.local
6. - Stelle sicher, dass OPENAI_API_KEY korrekt gesetzt ist
7. - Validiere OPENAI_API_KEY Format und Wert

## Tests & Validierung
1. OPENAI_API_KEY entspricht dokumentiertem Zustand

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
# - `SUPABASE_SERVICE_ROLE_KEY = eyJ…` (nur auf dem Server setzen!)
SUPABASE_SERVICE_URL=PLACEHOLDER_VALUE
# GROQ_MODEL=llama-3.1-70b-versatile
GROQ_API_KEY=PLACEHOLDER_VALUE

```

### Umgebungsvariablen (relevant)
- `NEXT_PUBLIC_SUPABASE_URL`: https://ugsezgnkyhcmsdpohuwf.supabase.co
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: eyJhbGci...
- `SUPABASE_SERVICE_ROLE_KEY`: eyJhbGci...
- `STRIPE_SECRET_KEY`: PLACEHOL...
- `STRIPE_WEBHOOK_SECRET`: PLACEHOL...
- `SUPABASE_SERVICE_URL`: PLACEHOLDER_VALUE

### Reverse Engineering Referenzen
- Konfiguration: OPENAI_API_KEY
- Typ: env_var
- Beschreibung: GROQ_API_KEY=your_groq_api_key
- Abweichung: OPENAI_API_KEY fehlt in .env.local (dokumentiert als erforderlich)

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
1. OPENAI_API_KEY funktioniert korrekt
2. Tests durchführen

### Monitoring
- Logs prüfen
- Fehlerrate überwachen