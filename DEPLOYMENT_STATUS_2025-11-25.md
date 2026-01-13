# 🚀 Deployment-Status für whatsapp.owona.de
**Datum:** 25. November 2025  
**Stand:** Build-Deployment in Arbeit, TypeScript-Fehler teilweise behoben

---

## 📋 Server-Informationen

### Zugangsdaten
- **Server IP:** `91.99.232.126`
- **Benutzer:** `root`
- **Passwort:** `LpXqTEPurwUu`
- **App-Verzeichnis:** `/var/www/whatsapp-bot-builder`
- **Domain:** `whatsapp.owona.de`

### SSH-Verbindung

**✅ Status:** Key-basierte Authentifizierung eingerichtet (25.11.2025)

**Option 1: Key-basierte Authentifizierung (empfohlen)**
```bash
ssh goneo-server
# oder
ssh n8n-server
```

**Option 2: Mit Passwort (Fallback)**
```bash
sshpass -p 'LpXqTEPurwUu' ssh -o StrictHostKeyChecking=no root@91.99.232.126
```

**SSH-Config:** `~/.ssh/config`
- Host `goneo-server` → `91.99.232.126`
- Host `n8n-server` → `automat.owona.de` (DNS bei Goneo)
- Beide zeigen auf denselben Server
- Key: `~/.ssh/id_ed25519` (OHNE Passphrase)

**SSH-Skripte (lokal auf Mac):**
- `~/Documents/ssh-setup.sh` - Einmalige Konfiguration
- `~/Documents/ssh-health-check.sh` - Status prüfen
- `~/Documents/ssh-auto-repair.sh` - Automatische Reparatur
- `~/Documents/ssh-connect.sh` - Schnelle Verbindung

**⚠️ WICHTIG:** SSH-Verbindung wird manchmal von Fail2ban blockiert. Falls SSH nicht funktioniert:
- 10-15 Minuten warten (Fail2ban-Timeout)
- Oder Hetzner-Konsole verwenden: https://console.hetzner.cloud/
- SSH-Health-Check ausführen: `./ssh-health-check.sh`

---

## ✅ Was bereits erledigt wurde

### 1. Dateien hochgeladen
- ✅ Frontend-Dateien wurden auf Server kopiert
- ✅ Dependencies installiert (`npm install --legacy-peer-deps`)
- ✅ Dateien befinden sich in: `/var/www/whatsapp-bot-builder/products/ai-whatsapp-bot-builder/frontend/`

### 2. TypeScript-Fehler behoben
Folgende Dateien wurden bereits korrigiert und auf Server hochgeladen:

#### ✅ `app/api/support-tickets/route.ts`
- **Problem:** `details.priority` - 'details' is possibly 'undefined'
- **Lösung:** `safeDetails` mit Type-Guard verwendet
- **Status:** ✅ Behoben

#### ✅ `components/analytics/AnalyticsDashboard.tsx`
- **Problem:** `useLocale` Import-Fehler
- **Lösung:** Import korrigiert: `import { useTranslations, useLocale } from 'next-intl'`
- **Status:** ✅ Behoben

#### ✅ `components/bot-builder/NodePropertiesPanel.tsx`
- **Problem:** `newOptions[index]` - Object is possibly 'undefined'
- **Lösung:** Optional-Check hinzugefügt: `if (newOptions[index]) { ... }`
- **Status:** ✅ Behoben

#### ✅ `components/bots/BotDetail.tsx`
- **Problem:** `bot.bot_config?.whatsapp?.phone_number_id` - Property does not exist
- **Lösung:** Type-Casting: `(bot.bot_config?.whatsapp as { phone_number_id?: string })`
- **Status:** ✅ Behoben

#### ✅ `components/dashboard/DashboardContent.tsx`
- **Problem:** `bots[0].id` - Object is possibly 'undefined'
- **Lösung:** Check hinzugefügt: `if (bots.length === 1 && bots[0]?.id)`
- **Status:** ✅ Behoben

#### ✅ `components/payments/CheckoutForm.tsx`
- **Problem:** `StripePaymentRequest` - has no exported member
- **Lösung:** Alias verwendet: `type PaymentRequest as StripePaymentRequest`
- **Status:** ✅ Behoben

---

## ❌ Verbleibende Probleme

### 1. Build schlägt noch fehl
**Letzter Fehler:**
```
Type error: Type 'React.ReactNode' is not assignable to type 'import("/var/www/whatsapp-bot-builder/products/ai-whatsapp-bot-builder/frontend/node_modules/@types/react/index").ReactNode'.
```

**Ursache:** React-Typen-Konflikt (verschiedene @types/react Versionen)

**Lösungsansätze:**
1. `node_modules` löschen und neu installieren
2. `package-lock.json` löschen und neu generieren
3. TypeScript-Cache löschen: `rm -rf tsconfig.tsbuildinfo .next`

### 2. PM2 Status
- **App-Name:** `whatsapp-bot-builder`
- **Status:** `errored` (207+ Restarts)
- **Grund:** Build fehlt oder fehlerhaft

---

## 📁 Wichtige Dateipfade

### Lokal (Mac)
```
/Users/salomon/Documents/products/ai-whatsapp-bot-builder/frontend/
```

### Server
```
/var/www/whatsapp-bot-builder/
├── products/
│   └── ai-whatsapp-bot-builder/
│       └── frontend/          # ← Hauptverzeichnis
├── app/                       # ← Alternative Location (veraltet?)
├── .next/                     # ← Build-Verzeichnis
├── ecosystem.config.js         # ← PM2 Config
└── package.json
```

**⚠️ WICHTIG:** Es gibt zwei mögliche Verzeichnisstrukturen auf dem Server:
1. `/var/www/whatsapp-bot-builder/products/ai-whatsapp-bot-builder/frontend/` (neu)
2. `/var/www/whatsapp-bot-builder/app/` (alt)

Der Build läuft im Root-Verzeichnis: `/var/www/whatsapp-bot-builder/`

---

## 🔧 Nächste Schritte - Schritt für Schritt

### Schritt 1: SSH-Verbindung herstellen

**Option A: Key-basierte Authentifizierung (empfohlen)**
```bash
ssh goneo-server
# oder
ssh n8n-server
```

**Option B: Mit Passwort (Fallback)**
```bash
sshpass -p 'LpXqTEPurwUu' ssh -o StrictHostKeyChecking=no root@91.99.232.126
```

**Option C: Hetzner-Konsole (falls SSH blockiert)**
1. Gehe zu: https://console.hetzner.cloud/
2. Wähle Server `91.99.232.126`
3. Klicke auf "Console" (VNC/NoVNC)
4. Login: `root` / `LpXqTEPurwUu`

**SSH-Verbindungsprobleme?**
```bash
# Auf lokalem Mac ausführen:
cd ~/Documents
./ssh-health-check.sh    # Status prüfen
./ssh-auto-repair.sh     # Automatische Reparatur
```

### Schritt 2: Ins Projekt-Verzeichnis wechseln
```bash
cd /var/www/whatsapp-bot-builder
```

### Schritt 3: Aktuellen Status prüfen
```bash
# PM2 Status
pm2 status

# Prüfe ob Build existiert
ls -la .next/ 2>/dev/null || echo "Kein Build vorhanden"

# Prüfe Verzeichnisstruktur
ls -la products/ai-whatsapp-bot-builder/frontend/ 2>/dev/null || echo "Verzeichnis nicht gefunden"
```

### Schritt 4: TypeScript-Cache und Build löschen
```bash
# Lösche alle Build-Artefakte
rm -rf .next
rm -rf tsconfig.tsbuildinfo
rm -rf products/ai-whatsapp-bot-builder/frontend/.next
rm -rf products/ai-whatsapp-bot-builder/frontend/tsconfig.tsbuildinfo

# Optional: node_modules neu installieren (falls Typen-Konflikt)
# rm -rf node_modules package-lock.json
# npm install --legacy-peer-deps
```

### Schritt 5: Build durchführen
```bash
npm run build
```

**Erwartete Ausgabe:**
- ✅ `Compiled successfully`
- ✅ `Linting and checking validity of types ...` (ohne Fehler)
- ✅ `Creating an optimized production build ...`

**Falls Fehler auftreten:**
- Fehlermeldung notieren
- Datei identifizieren (z.B. `./components/xyz/File.tsx:123:45`)
- Fehler beheben (siehe "TypeScript-Fehler beheben" unten)

### Schritt 6: PM2 neu starten
```bash
# PM2 Status prüfen
pm2 status

# PM2 neu starten
pm2 restart whatsapp-bot-builder

# Falls App nicht existiert:
pm2 start ecosystem.config.js

# PM2 speichern
pm2 save

# Logs prüfen
pm2 logs whatsapp-bot-builder --lines 50 --nostream
```

### Schritt 7: Health-Check
```bash
# Lokaler Health-Check
curl http://localhost:3000/api/health

# Sollte zurückgeben: {"status":"ok","timestamp":"..."}

# Externer Check (falls Domain konfiguriert)
curl https://whatsapp.owona.de/api/health
```

### Schritt 8: Browser-Test
- ✅ https://whatsapp.owona.de
- ✅ https://whatsapp.owona.de/api/health
- ✅ https://whatsapp.owona.de/de/dashboard (nach Login)

---

## 🐛 TypeScript-Fehler beheben

### Häufige Fehler und Lösungen

#### 1. "Object is possibly 'undefined'"
**Lösung:** Optional-Chaining oder Type-Guard hinzufügen
```typescript
// ❌ Falsch
const value = obj.property.subproperty;

// ✅ Richtig
const value = obj?.property?.subproperty;
// oder
if (obj?.property) {
  const value = obj.property.subproperty;
}
```

#### 2. "Property does not exist on type"
**Lösung:** Type-Casting oder Interface erweitern
```typescript
// ❌ Falsch
const id = config.whatsapp.phone_number_id;

// ✅ Richtig
const id = (config.whatsapp as { phone_number_id?: string })?.phone_number_id;
```

#### 3. "Duplicate identifier"
**Lösung:** Import prüfen, doppelte Definitionen entfernen
```typescript
// Prüfe ob Type mehrfach importiert/definiert wird
import { NodeType } from '@/types/bot'; // ← Nur einmal importieren
```

#### 4. React-Typen-Konflikt
**Lösung:** node_modules neu installieren
```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

---

## 📝 Deploy-Skripte

### Vollständiges Deployment
```bash
cd /Users/salomon/Documents/products/ai-whatsapp-bot-builder
./deploy-now.sh
```

### Nur Build hochladen (schneller)
```bash
./deploy-build-only.sh
```

### Alternative (ohne SSH-Shell)
```bash
./deploy-without-ssh.sh
```

---

## 🔍 Troubleshooting

### Problem: SSH-Verbindung blockiert oder funktioniert nicht
**Lösung:**
1. **SSH-Health-Check ausführen (lokal auf Mac):**
   ```bash
   cd ~/Documents
   ./ssh-health-check.sh
   ```

2. **Automatische Reparatur:**
   ```bash
   ./ssh-auto-repair.sh
   ```

3. **Manuelle Schritte:**
   - 10-15 Minuten warten (Fail2ban-Timeout)
   - Hetzner-Konsole verwenden
   - Fail2ban zurücksetzen (über Hetzner-Konsole):
   ```bash
   fail2ban-client set sshd unbanip DEINE_IP
   ```

4. **SSH-Key-Probleme:**
   - Key zum Agent hinzufügen: `ssh-add ~/.ssh/id_ed25519`
   - Neuer Key ohne Passphrase: `./ssh-fix-key-no-passphrase.sh`
   - Key auf Server kopieren: `./ssh-copy-key.sh`

**Dokumentation:** Siehe `~/Documents/SSH_CONNECTION_TROUBLESHOOTING.md`

### Problem: Build schlägt fehl
**Lösung:**
1. TypeScript-Fehler beheben (siehe oben)
2. Cache löschen: `rm -rf .next tsconfig.tsbuildinfo`
3. Dependencies neu installieren: `npm install --legacy-peer-deps`
4. Build erneut versuchen: `npm run build`

### Problem: PM2 startet nicht
**Lösung:**
```bash
# PM2 Status prüfen
pm2 list

# PM2 Logs prüfen
pm2 logs whatsapp-bot-builder --lines 100

# PM2 neu installieren (falls nötig)
npm install -g pm2

# Ecosystem-Datei prüfen
cat ecosystem.config.js

# PM2 manuell starten
pm2 start ecosystem.config.js
pm2 save
```

### Problem: Port 3000 nicht erreichbar
**Lösung:**
```bash
# Prüfe ob App läuft
netstat -tulpn | grep 3000

# Prüfe PM2 Status
pm2 status

# Prüfe Caddy/Nginx
systemctl status caddy
# oder
systemctl status nginx
```

---

## 📊 Ecosystem Config (PM2)

**Datei:** `/var/www/whatsapp-bot-builder/ecosystem.config.js`

```javascript
module.exports = {
  apps: [{
    name: 'whatsapp-bot-builder',
    script: 'npm',
    args: 'run start',
    cwd: '/var/www/whatsapp-bot-builder/frontend',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1536M',
    node_args: '--max-old-space-size=1536',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      NEXT_PUBLIC_SUPABASE_URL: 'https://ugsezgnkyhcmsdpohuwf.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      NEXT_PUBLIC_APP_URL: 'https://whatsapp.owona.de',
    },
  }],
};
```

**⚠️ WICHTIG:** `cwd` zeigt auf `/var/www/whatsapp-bot-builder/frontend`, aber Dateien sind in `/var/www/whatsapp-bot-builder/products/ai-whatsapp-bot-builder/frontend/`

**Mögliche Lösung:** Ecosystem-Config anpassen oder Symlink erstellen

---

## 🎯 Zusammenfassung - Was noch zu tun ist

1. ✅ **Dateien hochgeladen** - Erledigt
2. ✅ **TypeScript-Fehler teilweise behoben** - 6 von 7 Fehlern behoben
3. ❌ **React-Typen-Konflikt beheben** - Noch offen
4. ❌ **Build erfolgreich durchführen** - Noch offen
5. ❌ **PM2 neu starten** - Noch offen
6. ❌ **Health-Check durchführen** - Noch offen
7. ❌ **Browser-Test** - Noch offen

---

## 📞 Nützliche Befehle

### Server-Status prüfen
```bash
# PM2 Status
pm2 status

# PM2 Logs
pm2 logs whatsapp-bot-builder --lines 50

# Disk Space
df -h

# Memory
free -h

# Node Version
node --version

# NPM Version
npm --version
```

### Build-Status prüfen
```bash
# Prüfe ob Build existiert
ls -la .next/

# Prüfe Build-Größe
du -sh .next/

# Prüfe TypeScript-Cache
ls -la tsconfig.tsbuildinfo
```

### Logs prüfen
```bash
# PM2 Logs
pm2 logs whatsapp-bot-builder

# System Logs
journalctl -u whatsapp-bot-builder -n 100

# Caddy Logs
journalctl -u caddy -n 100
```

---

---

## 📚 Zusätzliche Dokumentation

### SSH-Verbindungsprobleme
- **Dokumentation:** `~/Documents/SSH_CONNECTION_TROUBLESHOOTING.md`
- **Quick Start:** `~/Documents/SSH_QUICK_START.md`
- **Ursachenanalyse:** Alle SSH-Probleme dokumentiert und gelöst (25.11.2025)

### Verfügbare SSH-Skripte (lokal auf Mac)
- `ssh-setup.sh` - Einmalige SSH-Konfiguration
- `ssh-health-check.sh` - SSH-Status prüfen
- `ssh-auto-repair.sh` - Automatische SSH-Reparatur
- `ssh-connect.sh` - Schnelle SSH-Verbindung
- `ssh-copy-key.sh` - SSH-Key auf Server kopieren
- `ssh-fix-key-no-passphrase.sh` - Neuer Key ohne Passphrase
- `ssh-test-connection.sh` - Verbindung testen

**Alle Skripte:** `~/Documents/ssh-*.sh`

---

**Letzte Aktualisierung:** 25. November 2025, 12:30 Uhr  
**Status:** Deployment in Arbeit, TypeScript-Fehler teilweise behoben  
**SSH-Status:** ✅ Key-basierte Authentifizierung eingerichtet und funktionsfähig

