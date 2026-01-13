# Remote Deployment Anleitung

## Frontend auf Remote-Server deployen

### Voraussetzungen

- SSH-Zugriff auf Remote-Server
- Server-Pfad: `/var/www/whatsapp-bot-builder/frontend`
- PM2 installiert und konfiguriert
- Node.js und npm installiert

### Option 1: Direkt auf Server ausführen

**SSH-Verbindung herstellen:**
```bash
ssh user@server
cd /var/www/whatsapp-bot-builder
```

**Deployment-Script ausführen:**
```bash
# Script hochladen (falls lokal erstellt)
# Oder direkt auf Server erstellen

cd frontend
npm run build
pm2 restart whatsapp-bot-builder
```

### Option 2: Via Deployment-Script

**Lokal:**
```bash
# Script auf Server kopieren
scp deploy-frontend-remote.sh user@server:/var/www/whatsapp-bot-builder/

# Auf Server ausführen
ssh user@server "cd /var/www/whatsapp-bot-builder && bash deploy-frontend-remote.sh"
```

### Option 3: Manuelle Schritte

**1. Code auf Server aktualisieren:**
```bash
cd /var/www/whatsapp-bot-builder/frontend
git pull  # oder rsync/scp für Dateien
```

**2. Dependencies installieren:**
```bash
npm install
```

**3. Build erstellen:**
```bash
npm run build
```

**4. OpenTelemetry prüfen (falls Probleme):**
```bash
# Temporär deaktivieren
mv instrumentation.ts instrumentation.ts.bak
```

**5. PM2 neu starten:**
```bash
pm2 restart whatsapp-bot-builder
# oder
pm2 reload whatsapp-bot-builder
```

**6. Status prüfen:**
```bash
pm2 status
pm2 logs whatsapp-bot-builder --lines 50
```

### Verifizierung

**1. Server-Status:**
```bash
pm2 status whatsapp-bot-builder
curl -I https://whatsapp.owona.de
```

**2. Dashboard prüfen:**
- Öffne: https://whatsapp.owona.de/de/intern
- Prüfe Tab-Navigation: Übersicht | Tickets | Externe Änderungen
- Klicke auf "Externe Änderungen" Tab

**3. Logs prüfen:**
```bash
pm2 logs whatsapp-bot-builder --lines 100
```

### Troubleshooting

**Problem: Build schlägt fehl**
- Prüfe Node.js Version: `node --version`
- Prüfe npm Version: `npm --version`
- Prüfe Dependencies: `npm install`
- Prüfe TypeScript-Fehler: `npm run build`

**Problem: PM2 startet nicht**
- Prüfe PM2 Status: `pm2 list`
- Prüfe Logs: `pm2 logs whatsapp-bot-builder`
- Prüfe Port: `lsof -i :3000`
- Prüfe Permissions: `ls -la /var/www/whatsapp-bot-builder/frontend`

**Problem: OpenTelemetry-Fehler**
- Temporär deaktivieren: `mv instrumentation.ts instrumentation.ts.bak`
- Oder: `DISABLE_OTEL=true` in ecosystem.config.js setzen

**Problem: Tab-Navigation nicht sichtbar**
- Browser-Cache leeren
- Hard Reload: `Cmd+Shift+R` (Mac) oder `Ctrl+Shift+R` (Windows)
- Entwicklertools prüfen (F12 → Console)
- Prüfe ob Build erfolgreich war

### Wichtige Dateien

- **PM2 Config:** `/var/www/whatsapp-bot-builder/ecosystem.config.js`
- **Frontend:** `/var/www/whatsapp-bot-builder/frontend`
- **Logs:** `/var/log/pm2/whatsapp-bot-builder-*.log`
- **Build Output:** `/var/www/whatsapp-bot-builder/frontend/.next`

### Nächste Schritte nach Deployment

1. ✅ Migration ausführen (falls noch nicht geschehen)
2. ✅ Support MCP Server neu starten
3. ✅ Dashboard testen: https://whatsapp.owona.de/de/intern
4. ✅ Tab-Navigation verifizieren
5. ✅ Externe Änderungen Tab testen

