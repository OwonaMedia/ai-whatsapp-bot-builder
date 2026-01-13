# 🖥️ Hetzner-Konsole Anleitung für Deployment

## Problem
SSH-Verbindung ist blockiert (Fail2ban/Firewall). Wir nutzen die Hetzner-Konsole (Web-Interface) für Server-Zugriff.

---

## 📋 Schritt-für-Schritt Anleitung

### Schritt 1: Hetzner-Konsole öffnen

1. Gehe zu: **https://console.hetzner.cloud/**
2. Melde dich mit deinem Hetzner-Account an
3. Wähle dein Projekt aus
4. Klicke auf den Server **91.99.232.126** (oder den Namen deines Servers)
5. Klicke auf den Tab **"Console"** (oder **"VNC"** / **"NoVNC"**)

### Schritt 2: In Konsole anmelden

- **Benutzer:** `root`
- **Passwort:** `LpXqTEPurwUu`

### Schritt 3: Deployment-Befehle ausführen

Führe diese Befehle **nacheinander** in der Konsole aus:

```bash
# 1. Ins Projekt-Verzeichnis wechseln
cd /var/www/whatsapp-bot-builder

# 2. Backup des aktuellen Builds erstellen
if [ -d ".next" ]; then
  mv .next .next.backup.$(date +%Y%m%d_%H%M%S)
fi

# 3. Neues Build extrahieren (wenn deploy-without-ssh.sh verwendet wurde)
tar -xzf /tmp/whatsapp-build-deploy.tar.gz -C .

# ODER (wenn deploy-build-only.sh verwendet wurde):
tar -xzf /tmp/whatsapp-next-build.tar.gz -C .

# 4. Dependencies installieren (falls package.json geändert wurde)
npm install --legacy-peer-deps

# 5. PM2 neu starten
pm2 restart whatsapp-bot-builder || pm2 start ecosystem.config.js
pm2 save

# 6. Status prüfen
pm2 status
pm2 logs whatsapp-bot-builder --lines 20 --nostream
```

### Schritt 4: Health-Check

```bash
# Teste ob App läuft
curl http://localhost:3000/api/health

# Sollte zurückgeben: {"status":"ok","timestamp":"..."}
```

---

## 🔍 Troubleshooting

### Problem: Datei nicht gefunden

```bash
# Prüfe ob Upload-Datei existiert
ls -lh /tmp/whatsapp-*.tar.gz

# Falls nicht vorhanden, prüfe Upload-Status
# Gehe zurück zu deploy-without-ssh.sh und prüfe Upload-Erfolg
```

### Problem: PM2 läuft nicht

```bash
# PM2 Status prüfen
pm2 list

# PM2 neu installieren (falls nötig)
npm install -g pm2

# Ecosystem-Datei prüfen
cat ecosystem.config.js

# PM2 manuell starten
cd /var/www/whatsapp-bot-builder
pm2 start ecosystem.config.js
pm2 save
```

### Problem: Build-Fehler

```bash
# Prüfe Build-Logs
pm2 logs whatsapp-bot-builder --lines 50

# Prüfe ob .next-Verzeichnis existiert
ls -la .next/

# Prüfe Node-Version
node --version  # Sollte 18+ sein

# Prüfe Dependencies
npm list --depth=0
```

### Problem: Port 3000 nicht erreichbar

```bash
# Prüfe ob App läuft
netstat -tulpn | grep 3000

# Prüfe PM2 Status
pm2 status

# Prüfe Caddy/Nginx Konfiguration
systemctl status caddy
# oder
systemctl status nginx
```

---

## 📊 Nach Deployment testen

### Browser-Tests:
- ✅ https://whatsapp.owona.de
- ✅ https://whatsapp.owona.de/api/health
- ✅ https://whatsapp.owona.de/de/dashboard (nach Login)

### API-Tests:
```bash
# Health-Check
curl https://whatsapp.owona.de/api/health

# Sollte zurückgeben: {"status":"ok",...}
```

---

## 🔄 Alternative: Fail2ban zurücksetzen

Falls du SSH-Zugriff wiederherstellen möchtest:

1. **Warte 10-15 Minuten** (Fail2ban-Timeout)
2. **Oder** setze Fail2ban manuell zurück (über Hetzner-Konsole):

```bash
# Fail2ban-Status prüfen
fail2ban-client status sshd

# IP entsperren (falls bekannt)
fail2ban-client set sshd unbanip DEINE_IP

# Oder Fail2ban temporär deaktivieren (nur für Test)
systemctl stop fail2ban
# ... SSH-Test ...
systemctl start fail2ban
```

---

## 📝 Wichtige Verzeichnisse

- **App-Verzeichnis:** `/var/www/whatsapp-bot-builder`
- **PM2-Logs:** `/var/log/pm2/whatsapp-bot-builder-*.log`
- **Build-Verzeichnis:** `/var/www/whatsapp-bot-builder/.next`
- **Upload-Temp:** `/tmp/whatsapp-*.tar.gz`

---

**Status:** Ready für Deployment  
**Letzte Aktualisierung:** 2025-11-24











