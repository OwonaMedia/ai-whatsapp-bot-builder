# 📸 Screenshot-Generierung für Dokumentation

## Automatische Screenshot-Generierung

### Voraussetzungen

1. **Puppeteer installieren:**
```bash
cd frontend
npm install puppeteer --save-dev
```

2. **Frontend-Server starten:**
```bash
npm run dev
```

Der Server muss auf `http://localhost:3999` laufen.

### Screenshots generieren

```bash
npm run screenshots
```

Oder direkt:
```bash
node scripts/generate-screenshots.js
```

### Manuelle Screenshot-Erstellung

Falls das automatische Script nicht funktioniert:

1. **Öffnen Sie die Screenshot-Seite:**
   - `http://localhost:3999/de/screenshots`

2. **Für jeden Bereich:**
   - Klicken Sie auf den Bereich in der Sidebar
   - Oder navigieren Sie direkt: `http://localhost:3999/de/screenshots?section=registration-form`

3. **Screenshot erstellen:**
   - **Browser DevTools (Chrome/Edge):**
     - F12 → Elements Tab
     - Rechtsklick auf `#screenshot-content` → "Capture node screenshot"
   
   - **Firefox:**
     - F12 → Inspector
     - Rechtsklick auf `#screenshot-content` → "Screenshot Node"
   
   - **Safari:**
     - Entwicklertools → Element auswählen
     - Rechtsklick → "Capture Screenshot"

4. **Speichern:**
   - Speichern Sie als PNG in: `public/docs/screenshots/`
   - Dateiname: `{section-id}.png` (z.B. `registration-form.png`)

### Benötigte Screenshots

Alle Screenshots werden automatisch in `/public/docs/screenshots/` gespeichert:

- `registration-form.png`
- `registration-email.png`
- `registration-password.png`
- `dashboard-overview.png`
- `dashboard-stats.png`
- `bot-creation-form.png`
- `bot-builder-canvas.png`
- `node-palette.png`
- `node-properties.png`
- `node-connections.png`
- `message-node.png`
- `question-node.png`
- `condition-node.png`
- `ai-node.png`
- `knowledge-node.png`
- `whatsapp-setup-wizard.png`
- `bsp-selection.png`
- `gdpr-consent.png`
- `360dialog-dashboard.png`
- `360dialog-api-key.png`
- `360dialog-success.png`
- `twilio-credentials.png`
- `messagebird-api-key.png`
- `knowledge-overview.png`
- `pdf-upload.png`
- `url-add.png`
- `text-input.png`
- `knowledge-processing.png`
- `analytics-dashboard.png`
- `analytics-metrics.png`
- `analytics-trends.png`
- `template-selector.png`
- `compliance-panel.png`
- `settings-profile.png`
- `settings-account.png`

### Auf Server ausführen

```bash
# Auf Server verbinden
ssh root@91.99.232.126

# In Frontend-Verzeichnis
cd /var/www/whatsapp-bot-builder/frontend

# Puppeteer installieren
npm install puppeteer --save-dev

# Frontend-Server starten (falls nicht läuft)
npm run dev

# In neuem Terminal: Screenshots generieren
npm run screenshots
```

### Troubleshooting

**Problem: Puppeteer findet Chrome nicht**
```bash
# Chrome installieren (Ubuntu/Debian)
apt-get update
apt-get install -y chromium-browser

# Oder Chrome via Puppeteer installieren lassen
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false npm install puppeteer
```

**Problem: Screenshots sind leer**
- Prüfen Sie, ob der Frontend-Server läuft
- Prüfen Sie die URL in `generate-screenshots.js`
- Warten Sie länger auf das Laden der Seite (timeout erhöhen)

**Problem: Element nicht gefunden**
- Prüfen Sie, ob die Screenshot-Seite korrekt lädt
- Prüfen Sie die Section-IDs in der Screenshot-Seite

