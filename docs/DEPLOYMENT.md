# 🚀 DEPLOYMENT GUIDE
## WhatsApp Bot Builder auf whatsapp.owona.de

---

## 📋 VORBEREITUNG

### **Domain: whatsapp.owona.de**

Dieses Produkt läuft auf der Domain **whatsapp.owona.de**

---

## 🌐 DOMAIN-KONFIGURATION

### **1. DNS-Einstellungen**

Stelle sicher, dass folgende DNS-Records gesetzt sind:

```
# A-Record (für Vercel/Netlify Deployment)
whatsapp.owona.de    A    76.76.21.21

# Oder CNAME (für Cloudflare/Vercel)
whatsapp.owona.de    CNAME    cname.vercel-dns.com
```

### **2. SSL-Zertifikat**

- Automatisch über Vercel/Netlify (Let's Encrypt)
- Oder Cloudflare SSL/TLS (Full/Full Strict)

---

## 🏗️ DEPLOYMENT-OPTIONEN

### **OPTION 1: Vercel (Empfohlen für Next.js)**

#### **Schritte:**

1. **Vercel Account erstellen:**
   ```bash
   npm i -g vercel
   vercel login
   ```

2. **Projekt deployen:**
   ```bash
   cd frontend
   vercel --prod
   ```

3. **Domain hinzufügen:**
   - In Vercel Dashboard → Project Settings → Domains
   - `whatsapp.owona.de` hinzufügen
   - DNS-Records folgen

4. **Environment Variables setzen:**
   - In Vercel Dashboard → Settings → Environment Variables
   - Alle Variablen aus `.env.example` eintragen

---

### **OPTION 2: Netlify**

#### **Schritte:**

1. **Netlify Account erstellen**

2. **Via CLI:**
   ```bash
   npm i -g netlify-cli
   netlify login
   cd frontend
   netlify deploy --prod
   ```

3. **Domain hinzufügen:**
   - Netlify Dashboard → Domain settings
   - Custom domain: `whatsapp.owona.de`
   - DNS-Konfiguration folgen

---

### **OPTION 3: Eigener Server (VPS)**

#### **Voraussetzungen:**
- Ubuntu 22.04+ Server
- Domain zeigt auf Server-IP
- Nginx/Caddy installiert

#### **Setup:**

```bash
# 1. Node.js installieren
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. PM2 installieren (Process Manager)
sudo npm install -g pm2

# 3. Projekt klonen/builden
cd /var/www
git clone <repo-url> whatsapp-bot-builder
cd whatsapp-bot-builder/frontend
npm install
npm run build

# 4. Mit PM2 starten
pm2 start npm --name "whatsapp-bot" -- start
pm2 save
pm2 startup
```

#### **Nginx Konfiguration:**

```nginx
# /etc/nginx/sites-available/whatsapp.owona.de
server {
    listen 80;
    server_name whatsapp.owona.de;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name whatsapp.owona.de;

    ssl_certificate /etc/letsencrypt/live/whatsapp.owona.de/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/whatsapp.owona.de/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### **SSL mit Let's Encrypt:**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d whatsapp.owona.de
```

---

## 🔧 SUPABASE SETUP

### **1. Supabase Projekt erstellen**

1. Gehe zu [supabase.com](https://supabase.com)
2. Neues Projekt erstellen
3. Region: **Frankfurt (EU)** für DSGVO-Compliance

### **2. Schema importieren**

1. Öffne Supabase SQL Editor
2. Kopiere Inhalt von `supabase/migrations/001_initial_schema.sql`
3. Führe SQL aus

### **3. Environment Variables**

Setze in Vercel/Netlify:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (nur Server-seitig)

---

## 📱 WHATSAPP BUSINESS API SETUP

### **1. Business Solution Provider (BSP) wählen**

Empfohlene BSPs:
- **360dialog** (EU-basiert, DSGVO-konform)
- **Twilio** (groß, zuverlässig)
- **MessageBird** (gut für EU)

### **2. WhatsApp Business Account erstellen**

1. Via BSP Dashboard
2. Business-Verifizierung durchführen
3. API-Credentials erhalten

### **3. Webhook konfigurieren**

Webhook URL: `https://whatsapp.owona.de/api/webhooks/whatsapp`

### **4. Environment Variables**

```
WHATSAPP_BSP_API_KEY=your_key
WHATSAPP_BSP_API_URL=https://api.360dialog.com/v1
WHATSAPP_WEBHOOK_SECRET=your_secret
```

---

## 🤖 AI-INTEGRATION (GROQ)

### **1. GROQ API Key erhalten**

1. Gehe zu [console.groq.com](https://console.groq.com)
2. Account erstellen
3. API Key generieren

### **2. Environment Variable**

```
GROQ_API_KEY=gsk_your_key_here
GROQ_MODEL=llama-3.1-70b-versatile
```

---

## 🔒 SSL & SECURITY

### **Automatisch (Vercel/Netlify):**
- SSL wird automatisch bereitgestellt
- Auto-Renewal

### **Manuell (Eigener Server):**
```bash
# Let's Encrypt
sudo certbot --nginx -d whatsapp.owona.de

# Auto-Renewal
sudo certbot renew --dry-run
```

---

## 📊 MONITORING

### **Vercel Analytics:**
- Automatisch aktiviert
- Dashboard in Vercel

### **Sentry (Error Tracking):**
1. Sentry Account erstellen
2. DSN in Environment Variables setzen
3. Errors werden automatisch getrackt

---

## 🔄 CI/CD

### **Vercel (Automatisch):**
- Git-Integration aktivieren
- Jeder Push auf `main` → Auto-Deploy

### **GitHub Actions (Optional):**

```yaml
# .github/workflows/deploy.yml
name: Deploy to whatsapp.owona.de
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

---

## ✅ DEPLOYMENT-CHECKLISTE

- [ ] DNS-Records gesetzt (A oder CNAME)
- [ ] SSL-Zertifikat aktiv
- [ ] Environment Variables konfiguriert
- [ ] Supabase Projekt erstellt & Schema importiert
- [ ] WhatsApp BSP Account erstellt
- [ ] GROQ API Key konfiguriert
- [ ] Webhook URL konfiguriert
- [ ] Domain verifiziert
- [ ] Monitoring eingerichtet
- [ ] Backup-Strategie definiert

---

## 🚨 TROUBLESHOOTING

### **Domain zeigt nicht auf App:**
1. DNS-Cache leeren: `sudo dscacheutil -flushcache`
2. DNS-Propagation prüfen: `dig whatsapp.owona.de`
3. Browser-Cache leeren

### **SSL-Zertifikat Fehler:**
1. Certbot Logs prüfen: `sudo certbot certificates`
2. Manuell erneuern: `sudo certbot renew`
3. Nginx neu laden: `sudo nginx -s reload`

### **Environment Variables nicht geladen:**
1. In Vercel/Netlify Dashboard prüfen
2. App neu deployen nach Änderungen
3. Build-Logs prüfen

---

## 📚 NÄCHSTE SCHRITTE

Nach erfolgreichem Deployment:
1. ✅ Domain testen: https://whatsapp.owona.de
2. ✅ SSL prüfen: [SSL Labs](https://www.ssllabs.com/ssltest/)
3. ✅ Performance testen: [PageSpeed Insights](https://pagespeed.web.dev/)
4. ✅ Monitoring einrichten
5. ✅ Backup-Strategie umsetzen

---

**Domain:** whatsapp.owona.de  
**Status:** Ready for Deployment  
**Letzte Aktualisierung:** 2025-01-XX

