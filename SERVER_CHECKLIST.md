# Server-Checkliste für whatsapp.owona.de

**Server:** 91.99.232.126 (Hetzner)  
**Domain:** https://whatsapp.owona.de  
**Datum:** 2025-01-XX

## Phase 1.3: Supabase-Konfiguration validieren

### Supabase Dashboard prüfen

1. **Site URL prüfen**
   - [ ] Öffne: https://supabase.com/dashboard/project/ugsezgnkyhcmsdpohuwf
   - [ ] Gehe zu: Settings → Authentication → URL Configuration
   - [ ] Prüfe: Site URL = `https://whatsapp.owona.de`
   - [ ] Prüfe: Redirect URLs enthalten:
     - `https://whatsapp.owona.de/**`
     - `https://whatsapp.owona.de/auth/callback`
     - `https://whatsapp.owona.de/de/auth/callback`

2. **SMTP-Konfiguration prüfen**
   - [ ] Gehe zu: Settings → Auth → SMTP Settings
   - [ ] Prüfe: SMTP aktiviert
   - [ ] Prüfe: SMTP Host = `smtp.goneo.de`
   - [ ] Prüfe: SMTP Port = `465` (SSL) oder `587` (STARTTLS)
   - [ ] Prüfe: SMTP User = `info@owona.de`
   - [ ] Prüfe: SMTP Password = `Afidi2008!`
   - [ ] Teste: Sende Test-E-Mail

3. **RLS Policies prüfen**
   - [ ] Gehe zu: Database → Policies
   - [ ] Prüfe: Alle Tabellen haben RLS aktiviert
   - [ ] Prüfe: Policies für `knowledge_sources` vorhanden
   - [ ] Prüfe: Policies für `document_chunks` vorhanden
   - [ ] Prüfe: Policies für `support_tickets` vorhanden

## Phase 2.1: Environment Variables auf Server prüfen

### SSH auf Server

```bash
ssh root@91.99.232.126
cd /var/www/whatsapp-bot-builder
```

### .env.local prüfen

```bash
cat .env.local
```

**Erforderliche Variablen:**
- [ ] `NEXT_PUBLIC_SUPABASE_URL=https://ugsezgnkyhcmsdpohuwf.supabase.co`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...` (muss mit `eyJ` beginnen)
- [ ] `NEXT_PUBLIC_APP_URL=https://whatsapp.owona.de`
- [ ] `NEXT_PUBLIC_APP_NAME=WhatsApp Bot Builder`
- [ ] `NEXT_PUBLIC_APP_DOMAIN=whatsapp.owona.de`
- [ ] `GROQ_API_KEY=...` (optional, falls verwendet)

### .env.local erstellen/aktualisieren

Falls `.env.local` fehlt oder unvollständig ist:

```bash
nano .env.local
```

**Inhalt:**
```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://whatsapp.owona.de
NEXT_PUBLIC_APP_NAME=WhatsApp Bot Builder
NEXT_PUBLIC_APP_DOMAIN=whatsapp.owona.de

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://ugsezgnkyhcmsdpohuwf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=dein-anon-key-hier

# Optional
GROQ_API_KEY=dein-groq-key-hier
```

### Nach ENV-Update: PM2 neu starten

```bash
cd /var/www/whatsapp-bot-builder
pm2 restart whatsapp-bot-builder
pm2 logs whatsapp-bot-builder --lines 50
```

## Server-Status prüfen

### PM2 Status

```bash
pm2 status
pm2 logs whatsapp-bot-builder --lines 20
```

**Erwartet:**
- Status: `online`
- Uptime: > 0
- Memory: < 500MB

### Nginx Status

```bash
systemctl status nginx
nginx -t
```

**Erwartet:**
- Status: `active (running)`
- Config test: `syntax is ok`

### Port-Zugänglichkeit

```bash
# Port 3000 (Next.js)
curl http://localhost:3000/health

# Port 443 (HTTPS)
curl -I https://whatsapp.owona.de/health
```

**Erwartet:**
- Port 3000: `{"status":"ok",...}`
- Port 443: `200 OK`

### SSL-Zertifikat

```bash
certbot certificates
```

**Erwartet:**
- Certificate für `whatsapp.owona.de` vorhanden
- Expiry Date: > 30 Tage

## Build und Deployment

### Code aktualisieren

```bash
cd /var/www/whatsapp-bot-builder
git pull  # Falls Git verwendet wird
# Oder: Dateien manuell hochladen
```

### Dependencies installieren

```bash
npm install --legacy-peer-deps
```

### Build durchführen

```bash
npm run build
```

**Erwartet:**
- Build erfolgreich ohne Fehler
- `.next` Verzeichnis erstellt
- Keine TypeScript-Fehler

### PM2 neu starten

```bash
pm2 restart whatsapp-bot-builder
pm2 save
```

## Testing

### Health-Check

```bash
curl https://whatsapp.owona.de/api/health
```

**Erwartet:**
```json
{
  "status": "ok",
  "timestamp": "...",
  "uptime": ...
}
```

### Auth-Routen testen

- [ ] https://whatsapp.owona.de/de/auth/login → 200 OK
- [ ] https://whatsapp.owona.de/de/auth/signup → 200 OK
- [ ] https://whatsapp.owona.de/de/auth/verify-otp → 200 OK
- [ ] https://whatsapp.owona.de/de/auth/reset-password → 200 OK

### API-Routes testen

```bash
# Support Tickets (GET)
curl -H "Authorization: Bearer TOKEN" \
  https://whatsapp.owona.de/api/support-tickets

# Health Check
curl https://whatsapp.owona.de/api/health
```

**Erwartet:**
- Keine 404/405 Errors
- Korrekte JSON-Responses

## Troubleshooting

### 502 Bad Gateway

**Ursachen:**
1. Next.js läuft nicht (PM2 offline)
2. Port 3000 nicht erreichbar
3. Environment Variables fehlen

**Lösung:**
```bash
pm2 restart whatsapp-bot-builder
pm2 logs whatsapp-bot-builder
curl http://localhost:3000/health
```

### 404 auf Auth-Routen

**Ursachen:**
1. Build nicht aktualisiert
2. generateStaticParams fehlt
3. Middleware blockiert Route

**Lösung:**
```bash
npm run build
pm2 restart whatsapp-bot-builder
```

### 405 Method Not Allowed

**Ursachen:**
1. Route-Handler exportiert Methode nicht
2. Build nicht aktualisiert

**Lösung:**
- Prüfe: Route exportiert `export async function GET/POST()`
- Build neu durchführen

## Nächste Schritte nach Checkliste

1. ✅ Alle Punkte abgehakt
2. ✅ Server-Status OK
3. ✅ Health-Check erfolgreich
4. ✅ Auth-Routen funktionieren
5. ✅ API-Routes funktionieren

**Dann:** Weiter mit Phase 3 (Code-Qualität Verbesserungen)

---

**Letzte Aktualisierung:** 2025-01-XX  
**Nächste Review:** Nach Server-Checks

