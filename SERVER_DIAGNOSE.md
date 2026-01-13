# 🔴 Server-Diagnose: owona.de offline

## DNS-Status: ✅ FUNKTIONIERT
- `owona.de` → `91.99.232.126` ✅
- `whatsapp.owona.de` → `91.99.232.126` ✅
- Ping funktioniert ✅

## Problem:
**DNS ist korrekt, aber die Website ist offline.**

Das bedeutet: **Server läuft, aber Services (Caddy/n8n/Next.js) laufen nicht oder sind nicht erreichbar.**

## Diagnose-Schritte:

### 1. HTTP/HTTPS-Test:
```bash
curl -I http://owona.de
curl -I https://owona.de
curl -I http://whatsapp.owona.de
curl -I https://whatsapp.owona.de
```

### 2. Port-Test:
```bash
nc -zv 91.99.232.126 80
nc -zv 91.99.232.126 443
```

### 3. Server-Status prüfen (SSH):
```bash
ssh root@91.99.232.126

# Prüfe Services:
pm2 status
systemctl status caddy
systemctl status n8n

# Prüfe ob Next.js läuft:
pm2 logs whatsapp-bot-builder --lines 20

# Prüfe Caddy-Logs:
journalctl -u caddy -n 50
```

## Mögliche Ursachen:

1. **Caddy läuft nicht**: Reverse Proxy ist offline
2. **Next.js läuft nicht**: PM2-Prozess ist gestoppt
3. **n8n läuft nicht**: Service ist gestoppt
4. **Port-Konflikt**: Andere Services blockieren Port 80/443
5. **Firewall**: Ports sind blockiert

## Lösung:

### Option 1: Services neu starten (SSH):
```bash
ssh root@91.99.232.126

# Caddy starten:
systemctl start caddy
systemctl status caddy

# PM2 App starten:
cd /var/www/whatsapp-bot-builder/products/ai-whatsapp-bot-builder/frontend
pm2 restart whatsapp-bot-builder
pm2 status
```

### Option 2: Ticket für AutoFix-System erstellen:
- Problem: "Server offline - Services laufen nicht"
- AutoFix könnte: `pm2 restart whatsapp-bot-builder` und `systemctl restart caddy` ausführen

## Nächste Schritte:

1. **HTTP/HTTPS-Test ausführen** (siehe oben)
2. **SSH zum Server** und Services prüfen
3. **Falls Services nicht laufen**: Manuell starten oder Ticket erstellen




