# 📸 Screenshot-Guide für Dokumentation

## Verzeichnisstruktur

Screenshots werden gespeichert in: `/public/docs/screenshots/`

## Benötigte Screenshots

### Grundlagen
- `registration-form.png` - Registrierungsformular
- `registration-email.png` - E-Mail-Feld
- `registration-password.png` - Passwort-Feld
- `dashboard-overview.png` - Dashboard Übersicht
- `dashboard-stats.png` - Dashboard Statistiken
- `settings-profile.png` - Profil-Einstellungen
- `settings-account.png` - Account-Aktionen

### Bot-Erstellung
- `bot-creation-form.png` - Bot-Erstellung Formular
- `template-selector.png` - Template-Auswahl
- `bot-builder-canvas.png` - Bot Builder Canvas
- `node-palette.png` - Node-Palette
- `node-properties.png` - Node-Eigenschaften
- `node-connections.png` - Node-Verbindungen

### Node-Typen
- `message-node.png` - Nachrichten-Node
- `question-node.png` - Fragen-Node
- `condition-node.png` - Bedingungs-Node
- `ai-node.png` - AI-Node
- `knowledge-node.png` - Knowledge-Node

### WhatsApp Setup
- `whatsapp-setup-wizard.png` - Setup Wizard
- `bsp-selection.png` - BSP-Auswahl
- `gdpr-consent.png` - DSGVO-Consent
- `360dialog-dashboard.png` - 360dialog Dashboard
- `360dialog-api-key.png` - 360dialog API-Key Eingabe
- `360dialog-success.png` - 360dialog Erfolg
- `twilio-credentials.png` - Twilio Credentials
- `messagebird-api-key.png` - MessageBird API-Key

### Wissensquellen
- `knowledge-overview.png` - Wissensquellen Übersicht
- `pdf-upload.png` - PDF hochladen
- `url-add.png` - URL hinzufügen
- `text-input.png` - Text eingeben
- `knowledge-processing.png` - Verarbeitungs-Status

### Analytics
- `analytics-dashboard.png` - Analytics Dashboard
- `analytics-metrics.png` - Analytics Metriken
- `analytics-trends.png` - Tägliche Trends

### Weitere
- `compliance-panel.png` - Compliance-Panel

## Screenshot-Erstellung

### Option 1: Browser DevTools
1. Öffnen Sie `/{locale}/screenshots?section={section-id}`
2. Öffnen Sie Browser DevTools (F12)
3. Wählen Sie den Bereich aus
4. Rechtsklick → "Screenshot node" oder "Capture node screenshot"

### Option 2: Browser Extension
- Verwenden Sie Extensions wie "Full Page Screen Capture" oder "Awesome Screenshot"

### Option 3: Manuell
1. Navigieren Sie zu `/{locale}/screenshots?section={section-id}`
2. Scrollen Sie zum gewünschten Bereich
3. Machen Sie einen Screenshot (Cmd+Shift+4 auf Mac, Snipping Tool auf Windows)
4. Speichern Sie als PNG in `/public/docs/screenshots/`

## Bildformat

- Format: PNG
- Empfohlene Größe: Mindestens 1200px Breite
- Optimierung: Verwenden Sie Tools wie TinyPNG für Komprimierung

## Screenshot-Bereiche

Alle Screenshot-Bereiche sind auf `/screenshots` verfügbar mit folgenden IDs:

- `registration-form`
- `registration-email`
- `registration-password`
- `dashboard-overview`
- `dashboard-stats`
- `bot-creation-form`
- `bot-builder-canvas`
- `node-palette`
- `node-properties`
- `node-connections`
- `message-node`
- `question-node`
- `condition-node`
- `ai-node`
- `knowledge-node`
- `whatsapp-setup-wizard`
- `bsp-selection`
- `gdpr-consent`
- `360dialog-dashboard`
- `360dialog-api-key`
- `360dialog-success`
- `twilio-credentials`
- `messagebird-api-key`
- `knowledge-overview`
- `pdf-upload`
- `url-add`
- `text-input`
- `knowledge-processing`
- `analytics-dashboard`
- `analytics-metrics`
- `analytics-trends`
- `template-selector`
- `compliance-panel`
- `settings-profile`
- `settings-account`

## Automatisierung

Für zukünftige Automatisierung könnte ein Puppeteer-Script verwendet werden:

```javascript
const puppeteer = require('puppeteer');

async function takeScreenshots() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  const sections = [
    'registration-form',
    'dashboard-overview',
    // ... weitere
  ];
  
  for (const section of sections) {
    await page.goto(`http://localhost:3000/de/screenshots?section=${section}`);
    await page.waitForSelector('#screenshot-content');
    await page.screenshot({
      path: `public/docs/screenshots/${section}.png`,
      clip: { x: 0, y: 0, width: 1200, height: 800 }
    });
  }
  
  await browser.close();
}
```

