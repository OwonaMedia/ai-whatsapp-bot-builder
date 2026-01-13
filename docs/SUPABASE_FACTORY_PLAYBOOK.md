## 🛠️ Supabase Factory – Operations Playbook

Aktualisiert: 9. November 2025  
Scope: `frontend/lib/supabaseFactory.ts`

---

### 1. Pre-Deployment Checks (lokal)

```bash
# 1) Umgebungsvariablen prüfen
npm run check-env:verbose

# 2) TypeScript + Lint
npm run type-check
npm run lint

# 3) Validierung / Build
npm run validate
npm run build

# 4) Manueller Test
npm run dev
# Browser: http://localhost:3999/de/pricing
```

---

### 2. Deployment-Schritte (Server)

```bash
ssh root@whatsapp.owona.de
cd /var/www/whatsapp-bot-builder/frontend

# Standard-Deploy
npm install --legacy-peer-deps
npm run build
pm2 restart whatsapp-bot-builder

# Mit Vorab-Validierung
npm run check-env && npm run build && pm2 restart whatsapp-bot-builder
```

Optional – automatisiert mit PM2 Deploy (siehe `LIVE_DEPLOY.md`):

```bash
pm2 deploy production update
```

---

### 3. Verifikation nach Deploy

```bash
# Prozessstatus
pm2 status whatsapp-bot-builder

# Letzte Logs
pm2 logs whatsapp-bot-builder --lines 100

# Fehler-Fokus
pm2 logs whatsapp-bot-builder --err --lines 50

# HTTP Smoke-Test
curl -I https://whatsapp.owona.de/de/pricing

# Supabase-Env aus PM2 prüfen
pm2 env 0 | grep SUPABASE
```

---

### 4. Schnellhilfe / Troubleshooting

| Symptom                                        | Maßnahme |
| ---------------------------------------------- | -------- |
| `Digest: 4164304298` im Log                    | Stub-Fallback aktiv, Env prüfen (`npm run check-env:verbose`) |
| `Check your Supabase project's API settings`   | `NEXT_PUBLIC_SUPABASE_URL` oder `NEXT_PUBLIC_SUPABASE_ANON_KEY` fehlen/leer |
| `Service-Role-Key detected` Warnung            | Anon-Key in `.env*` gegen echten `eyJ…` austauschen |
| `connect ECONNREFUSED 127.0.0.1:4318`          | OTLP-Agent optional – Hinweis, aber kein Blocker |
| Build schlägt mit ETIMEDOUT fehl               | `npm run build:force` und anschließend Logs prüfen |

Notfall-Rollback:

```bash
git reset --hard HEAD~1
npm run build
pm2 restart whatsapp-bot-builder
```

---

### 5. Debug-Helfer (nur Development)

```ts
import { debugConfig, getConfigStatus, isStubClient } from '@/lib/supabaseFactory';

debugConfig();
console.log(getConfigStatus());
console.log('Nutze Stub?', isStubClient());
```

---

### 6. Environment Quick Check

Pflicht:

- `NEXT_PUBLIC_SUPABASE_URL = https://<project>.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ… (kein sbp_…!)`

Server-seitig zusätzlich:

- `SUPABASE_SERVICE_URL` (Default: identisch zu `NEXT_PUBLIC_SUPABASE_URL`)
- `SUPABASE_SERVICE_ROLE_KEY = eyJ…` (nur auf dem Server setzen!)

---

### 7. Wissenswertes zur Factory

- Fällt in **Produktion** automatisch auf den Stub zurück, statt eine Runtime Exception zu werfen (Pages bleiben erreichbar).
- Warnungen werden geloggt (`[Supabase Factory][...]`), um fehlerhafte Konfigurationen sichtbar zu halten.
- `isStaticSupabaseBuild()` signalisiert Build-Phase (`npm run build`) → immer Stub.
- Realtime-Verbindungen erhalten den API-Key erzwungen via `attachRealtimeParams`.
- Für Service-Clients werden fehlende Keys im Production-Run gestattet (Stub), verursachen aber Fehler im Development.

---

### 8. Kontrollliste vor dem Live-Gang

- [ ] `npm run build` lokal & auf dem Server erfolgreich  
- [ ] `debugConfig()` zeigt `isStub: false` (lokal)  
- [ ] `pm2 logs` ohne neue Supabase-Fehler  
- [ ] Pricing- und Login-Seite laden ohne „Etwas ist schiefgelaufen“  
- [ ] `/intern` Dashboard funktioniert & zieht Daten  
- [ ] MCP Support-Server wurde nach Änderungen neu gestartet (`systemctl restart support-mcp`)

---

### 9. Referenz

- Code: `frontend/lib/supabaseFactory.ts`  
- Stub-Client: `frontend/lib/supabase-stub.ts`  
- Health-Script: `frontend/scripts/health-check.ts`  
- Architektur-Doku: `docs/architecture.md` (Abschnitt „Supabase Auth & Datenzugriff“)


