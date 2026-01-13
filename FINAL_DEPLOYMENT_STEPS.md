# 🎯 Finale Deployment-Schritte für whatsapp.owona.de

## ✅ DNS-Einstellungen bei Goneo

### **A-Record hinzufügen:**

Gehe zu **Goneo DNS-Verwaltung** für `owona.de`:

| Typ | Name | Wert | TTL |
|-----|------|------|-----|
| **A** | `whatsapp` | `91.99.232.126` | 3600 |

**Nach dem Speichern:** DNS-Propagation dauert 5-60 Minuten

---

## 🚀 Deployment durchführen

### **Schritt 1: Deployment-Script ausführen**

```bash
cd /Users/salomon/Documents/products/ai-whatsapp-bot-builder
bash DEPLOY_HETZNER.sh
```

Das Script führt automatisch aus:
- ✅ Projekt-Dateien hochladen
- ✅ Login-Fixes anwenden
- ✅ Dependencies installieren
- ✅ Build erstellen
- ✅ PM2 starten

### **Schritt 2: Environment-Variablen einrichten**

```bash
ssh root@91.99.232.126
# Passwort: LpXqTEPurwUu

cd /var/www/whatsapp-bot-builder
nano .env.local
```

**Füge diese Werte ein:**
```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://whatsapp.owona.de
NEXT_PUBLIC_APP_NAME=WhatsApp Bot Builder
NEXT_PUBLIC_APP_DOMAIN=whatsapp.owona.de

# WICHTIG: Deine Supabase-Credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: GROQ
GROQ_API_KEY=your-groq-key
```

**Speichern:** `Ctrl+X`, dann `Y`, dann `Enter`

**Build neu erstellen:**
```bash
npm run build
pm2 restart whatsapp-bot-builder
```

---

## 🌐 Nginx + SSL einrichten

### **Schritt 1: Nginx-Konfiguration kopieren**

```bash
# Lokal (auf deinem Mac):
cd /Users/salomon/Documents/products/ai-whatsapp-bot-builder
scp nginx-whatsapp.conf root@91.99.232.126:/tmp/
```

```bash
# Auf Server:
ssh root@91.99.232.126
cp /tmp/nginx-whatsapp.conf /etc/nginx/sites-available/whatsapp.owona.de
ln -sf /etc/nginx/sites-available/whatsapp.owona.de /etc/nginx/sites-enabled/
```

### **Schritt 2: Nginx testen**

```bash
nginx -t
```

Falls Fehler wegen SSL-Zertifikat: Das ist normal, erst mal HTTP verwenden:

```bash
# Temporär HTTP-only Version:
cat > /etc/nginx/sites-available/whatsapp.owona.de << 'EOF'
server {
    listen 80;
    server_name whatsapp.owona.de;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
```

```bash
nginx -t && systemctl reload nginx
```

### **Schritt 3: SSL-Zertifikat erstellen (nach DNS-Propagation)**

**Warte 10-15 Minuten** bis DNS-Propagation abgeschlossen ist, dann:

```bash
# Prüfe DNS:
nslookup whatsapp.owona.de
# Sollte zurückgeben: 91.99.232.126

# Certbot installieren (falls nicht vorhanden):
apt update
apt install -y certbot python3-certbot-nginx

# SSL-Zertifikat erstellen:
certbot --nginx -d whatsapp.owona.de

# Automatische Erneuerung testen:
certbot renew --dry-run
```

Certbot erstellt automatisch die HTTPS-Konfiguration!

### **Schritt 4: Nginx neu starten**

```bash
systemctl restart nginx
systemctl status nginx
```

---

## 🧪 Testen

### **1. PM2 Status prüfen**
```bash
pm2 status
pm2 logs whatsapp-bot-builder --lines 50
```

### **2. Port prüfen**
```bash
netstat -tulpn | grep 3000
curl http://localhost:3000
```

### **3. Website testen**
```
http://whatsapp.owona.de (nach Nginx-Setup)
https://whatsapp.owona.de (nach SSL-Setup)
https://whatsapp.owona.de/de/auth/login
```

### **4. Browser Console prüfen**
- Öffne: https://whatsapp.owona.de
- Drücke F12 → Console
- Prüfe auf Errors

---

## 🐛 Troubleshooting

### **Problem: PM2 startet nicht**
```bash
cd /var/www/whatsapp-bot-builder
pm2 logs whatsapp-bot-builder --lines 100
npm run build  # Falls Build fehlgeschlagen
```

### **Problem: Nginx Fehler 502**
```bash
# Prüfe ob Next.js läuft:
pm2 status
curl http://localhost:3000

# Prüfe Nginx-Config:
nginx -t
journalctl -u nginx -n 50
```

### **Problem: SSL-Zertifikat wird nicht erstellt**
```bash
# Prüfe DNS-Propagation:
nslookup whatsapp.owona.de

# Prüfe Firewall:
ufw status
# Port 80 und 443 müssen offen sein:
ufw allow 80/tcp
ufw allow 443/tcp
```

### **Problem: .env.local nicht gefunden**
```bash
cd /var/www/whatsapp-bot-builder
ls -la .env*
# Falls nicht vorhanden, erstellen (siehe oben)
```

---

## ✅ Finale Checkliste

- [ ] DNS-Eintrag bei Goneo hinzugefügt
- [ ] DNS-Propagation abgeschlossen (nslookup testen)
- [ ] Deployment-Script ausgeführt
- [ ] .env.local mit Supabase-Credentials gefüllt
- [ ] Build erfolgreich (`npm run build`)
- [ ] PM2 läuft (`pm2 status`)
- [ ] Nginx konfiguriert
- [ ] SSL-Zertifikat erstellt (certbot)
- [ ] Website erreichbar: https://whatsapp.owona.de
- [ ] Login-Page funktioniert: https://whatsapp.owona.de/de/auth/login

---

## 📝 Zusammenfassung

**DNS-Eintrag (Goneo):**
- Typ: A
- Name: whatsapp
- Wert: 91.99.232.126

**Deployment:**
```bash
bash DEPLOY_HETZNER.sh
```

**Nach Deployment:**
1. `.env.local` mit Credentials füllen
2. `npm run build && pm2 restart`
3. Nginx konfigurieren
4. SSL mit certbot erstellen

---

**Status:** Ready for Final Deployment  
**Server:** 91.99.232.126  
**Domain:** whatsapp.owona.de

