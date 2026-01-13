# 🚀 Deployment-Anleitung: whatsapp.owona.de auf Hetzner

## ✅ Vorbereitung abgeschlossen

**Server:** 91.99.232.126 (Hetzner)  
**Domain:** whatsapp.owona.de  
**SSH:** root@91.99.232.126

---

## 📋 Schritt 1: DNS-Einstellungen bei Goneo

### **A-Record hinzufügen:**

| Typ | Name | Wert | TTL |
|-----|------|------|-----|
| **A** | `whatsapp` | `91.99.232.126` | 3600 |

**Siehe:** `DNS_EINSTELLUNGEN_GONEO.md` für Details

---

## 📋 Schritt 2: Server Setup durchführen

### **Option A: Automatisches Setup-Script**

```bash
cd /Users/salomon/Documents/products/ai-whatsapp-bot-builder
bash HETZNER_SERVER_SETUP.sh
```

Das Script führt automatisch aus:
- ✅ Projekt-Verzeichnis erstellen
- ✅ Dateien auf Server kopieren
- ✅ Dependencies installieren
- ✅ Environment-Variablen Setup
- ✅ Caddy Konfiguration
- ✅ PM2 Setup

### **Option B: Manuell (Schritt für Schritt)**

#### **1. SSH-Verbindung**
```bash
ssh root@91.99.232.126
# Passwort: LpXqTEPurwUu
```

#### **2. Projekt-Verzeichnis erstellen**
```bash
mkdir -p /var/www/whatsapp-bot-builder
cd /var/www/whatsapp-bot-builder
```

#### **3. Projekt-Dateien hochladen**

**Von lokal:**
```bash
cd /Users/salomon/Documents/products/ai-whatsapp-bot-builder
tar --exclude='node_modules' --exclude='.next' --exclude='.git' -czf /tmp/whatsapp-bot.tar.gz frontend/
scp /tmp/whatsapp-bot.tar.gz root@91.99.232.126:/var/www/whatsapp-bot-builder/
```

**Auf Server:**
```bash
cd /var/www/whatsapp-bot-builder
tar -xzf whatsapp-bot.tar.gz
mv frontend/* .
rm -rf frontend whatsapp-bot.tar.gz
```

#### **4. Dependencies installieren**
```bash
cd /var/www/whatsapp-bot-builder
npm install --production
```

#### **5. Environment-Variablen**
```bash
nano .env.local
```

**Inhalt:**
```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://whatsapp.owona.de
NEXT_PUBLIC_APP_NAME=WhatsApp Bot Builder
NEXT_PUBLIC_APP_DOMAIN=whatsapp.owona.de

# Supabase (WICHTIG: Muss eingegeben werden!)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# GROQ (Optional)
GROQ_API_KEY=your-groq-key
```

#### **6. Login-Fixes anwenden**

**Login-Page:**
```bash
nano app/[locale]/auth/login/page.tsx
```

**Inhalt (komplett ersetzen):**
```typescript
import LoginForm from '@/components/auth/LoginForm';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-green/10 via-white to-brand-light/20 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <LoginForm redirectTo={params.redirect || '/dashboard'} />
      </div>
    </div>
  );
}
```

**Config:**
```bash
nano lib/config.ts
```

**Zeile 27-30 ersetzen:**
```typescript
// Validation (nur in Production werfen)
if (process.env.NODE_ENV === 'production' && (!config.supabase.url || !config.supabase.anonKey)) {
  throw new Error('Missing Supabase environment variables');
}
```

#### **7. Build**
```bash
npm run build
```

#### **8. Caddy Konfiguration**
```bash
nano /etc/caddy/Caddyfile
```

**Am Ende hinzufügen:**
```
# WhatsApp Bot Builder
whatsapp.owona.de {
    reverse_proxy localhost:3000
    encode zstd gzip
    
    header {
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        X-XSS-Protection "1; mode=block"
        Referrer-Policy strict-origin-when-cross-origin
    }
}
```

**Caddy neu starten:**
```bash
systemctl restart caddy
# Oder: caddy reload --config /etc/caddy/Caddyfile
```

#### **9. PM2 Setup**
```bash
# PM2 installieren (falls nicht vorhanden)
npm install -g pm2

# Ecosystem erstellen
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'whatsapp-bot-builder',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/whatsapp-bot-builder',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
EOF

# PM2 starten
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Für Auto-Start nach Reboot
```

---

## 📋 Schritt 3: Testen

### **1. DNS-Propagation prüfen**
```bash
nslookup whatsapp.owona.de
# Sollte zurückgeben: 91.99.232.126
```

### **2. Website öffnen**
```
https://whatsapp.owona.de
https://whatsapp.owona.de/de/auth/login
```

### **3. PM2 Status prüfen**
```bash
pm2 status
pm2 logs whatsapp-bot-builder --lines 50
```

### **4. Caddy Status prüfen**
```bash
systemctl status caddy
caddy validate --config /etc/caddy/Caddyfile
```

---

## 🐛 Troubleshooting

### **Fehler: Port 3000 bereits belegt**
```bash
# Prüfen:
lsof -i :3000
netstat -tulpn | grep 3000

# PM2 stoppen:
pm2 stop whatsapp-bot-builder
```

### **Fehler: Caddy kann SSL nicht erstellen**
- Prüfe DNS-Propagation
- Prüfe Firewall (Port 80/443)
- Prüfe Caddy-Logs: `journalctl -u caddy -n 50`

### **Fehler: Build fehlgeschlagen**
```bash
# Prüfe ENV-Variablen:
cat .env.local

# Prüfe Node-Version:
node --version  # Sollte 18+ sein

# Neu installieren:
rm -rf node_modules .next
npm install
npm run build
```

---

## ✅ Checkliste

- [ ] DNS-Eintrag bei Goneo hinzugefügt
- [ ] Projekt auf Server kopiert
- [ ] Dependencies installiert
- [ ] .env.local mit Supabase-Credentials gefüllt
- [ ] Login-Fixes angewendet
- [ ] Build erfolgreich
- [ ] Caddy konfiguriert
- [ ] PM2 gestartet
- [ ] Website erreichbar: https://whatsapp.owona.de

---

**Status:** Ready for Deployment  
**Letzte Aktualisierung:** 2025-01-XX

