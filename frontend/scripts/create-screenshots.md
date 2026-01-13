# Screenshot-Erstellung Anleitung

## Wichtig: Nur echte Screenshots aus der App

**KEINE Placeholder!** Alle Screenshots müssen echte Screenshots aus der laufenden App sein.

## Screenshot-Spezifikationen

### Hauptseite Screenshots

#### 1. `dashboard-demo.png`
- **Route:** `/de/dashboard` oder `/de/demo/dashboard`
- **Kontext:** Dashboard mit Bot-Übersicht, Statistiken (Gesamt Bots, Aktive Bots, Pausierte Bots, Entwürfe), Real-time Analytics
- **Erwartete Elemente:**
  - Bot-Liste mit Status-Anzeigen
  - Statistik-Karten oben
  - "Neuen Bot erstellen" Button
  - Suchfunktion
- **Größe:** 1920x1080 oder 1600x900
- **Format:** PNG, optimiert

#### 2. `bot-builder-demo.png`
- **Route:** `/de/bots/[id]/edit` oder `/de/demo/bot-builder`
- **Kontext:** Visueller Drag & Drop Flow-Editor mit Node-Palette, Canvas und Eigenschaften-Panel
- **Erwartete Elemente:**
  - Node-Palette links
  - Canvas in der Mitte mit Nodes
  - Eigenschaften-Panel rechts
  - Verbindungen zwischen Nodes
- **Größe:** 1920x1080 oder 1600x900
- **Format:** PNG, optimiert

#### 3. `features-demo.png`
- **Route:** `/de/demo/features`
- **Kontext:** Features-Übersicht mit DSGVO-Compliance, AI-Integration, Analytics
- **Erwartete Elemente:**
  - Feature-Karten
  - Icons/Badges
  - Beschreibungen
- **Größe:** 1920x1080 oder 1600x900
- **Format:** PNG, optimiert

#### 4. `analytics-demo.png`
- **Route:** `/de/bots/[id]/analytics` oder `/de/demo/analytics`
- **Kontext:** Analytics Dashboard mit Metriken, Trends, Conversion-Tracking
- **Erwartete Elemente:**
  - Metriken-Karten (Gespräche, Nachrichten, Conversion)
  - Trends-Grafik
  - Filter-Optionen
- **Größe:** 1920x1080 oder 1600x900
- **Format:** PNG, optimiert

#### 5. `knowledge-demo.png`
- **Route:** `/de/bots/[id]/knowledge` oder `/de/demo/knowledge`
- **Kontext:** Wissensquellen-Verwaltung mit PDF-Upload, URL-Integration
- **Erwartete Elemente:**
  - Liste der Wissensquellen
  - Upload-Button (PDF, URL, Text)
  - Status-Anzeigen (Bereit, In Verarbeitung, Fehler)
- **Größe:** 1920x1080 oder 1600x900
- **Format:** PNG, optimiert

#### 6. `settings-demo.png`
- **Route:** `/de/settings` oder `/de/demo/settings`
- **Kontext:** Einstellungen mit Bot-Konfiguration, WhatsApp-Integration, Compliance
- **Erwartete Elemente:**
  - Profil-Einstellungen
  - WhatsApp-Integration
  - Compliance-Panel
  - Account-Aktionen
- **Größe:** 1920x1080 oder 1600x900
- **Format:** PNG, optimiert

## Dokumentations Screenshots

### Registrierung
- `registration-form.png` - Vollständiges Registrierungsformular
- `registration-email.png` - E-Mail-Eingabefeld mit Validierung
- `registration-password.png` - Passwort-Eingabefeld mit Stärke-Anzeige

### Dashboard
- `dashboard-overview.png` - Dashboard-Übersicht
- `dashboard-stats.png` - Statistik-Karten

### Bot-Erstellung
- `bot-creation-form.png` - Bot-Erstellungsformular
- `template-selector.png` - Vorlagen-Auswahl-Dialog

### Bot Builder
- `bot-builder-canvas.png` - Canvas mit Node-Palette und Eigenschaften-Panel
- `node-palette.png` - Node-Palette mit allen Node-Typen
- `node-properties.png` - Eigenschaften-Panel
- `node-connections.png` - Node-Verbindungen

### Nodes
- `message-node.png` - Nachrichten-Node
- `question-node.png` - Fragen-Node
- `condition-node.png` - Bedingungs-Node
- `ai-node.png` - AI-Node
- `knowledge-node.png` - Knowledge-Node

### WhatsApp Setup
- `whatsapp-setup-wizard.png` - Setup-Wizard
- `bsp-selection.png` - BSP-Auswahl
- `gdpr-consent.png` - DSGVO-Consent

### BSP-spezifisch
- `360dialog-dashboard.png` - 360dialog Dashboard
- `360dialog-api-key.png` - API-Key Eingabe
- `360dialog-success.png` - Erfolgreiche Verbindung
- `twilio-credentials.png` - Twilio Credentials
- `messagebird-api-key.png` - MessageBird API-Key

### Wissensquellen
- `knowledge-overview.png` - Übersicht
- `pdf-upload.png` - PDF-Upload
- `url-add.png` - URL hinzufügen
- `text-input.png` - Text eingeben
- `knowledge-processing.png` - Verarbeitungs-Status

### Analytics
- `analytics-dashboard.png` - Analytics Dashboard
- `analytics-metrics.png` - Metriken-Karten
- `analytics-trends.png` - Trends-Grafik

### Vorlagen
- `template-multi-tier.png` - Multi-Tier Support
- `template-customer-service.png` - Kundenservice
- `template-e-commerce.png` - E-Commerce
- `template-booking.png` - Buchung

### Weitere
- `compliance-panel.png` - Compliance-Panel
- `settings-profile.png` - Profil-Einstellungen
- `settings-account.png` - Account-Aktionen
- `embed-code-generator.png` - Code Generator

## Screenshot-Erstellung Workflow

1. **App starten:**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Route öffnen:**
   - Öffne die entsprechende Route im Browser
   - Stelle sicher, dass die Seite vollständig geladen ist
   - Scrolle zu relevanten Bereichen

3. **Screenshot machen:**
   - **Browser DevTools:** F12 → Cmd+Shift+P → "Capture screenshot"
   - **Mac:** Cmd+Shift+4 für Bereich, Cmd+Shift+3 für Vollbild
   - **Chrome Extension:** z.B. "Full Page Screen Capture"

4. **Screenshot optimieren:**
   - Öffne in Bildbearbeitungsprogramm (z.B. Preview, GIMP, Photoshop)
   - Beschneide auf relevante Bereiche
   - Stelle sicher, dass wichtige Elemente sichtbar sind
   - Reduziere Dateigröße (PNG-Kompression)
   - Ziel: < 500KB pro Screenshot

5. **Speichern:**
   - Speichere im korrekten Verzeichnis (`public/screenshots/` oder `public/docs/screenshots/`)
   - Verwende den korrekten Dateinamen
   - Format: PNG

6. **Validieren:**
   ```bash
   npx tsx scripts/validate-screenshots.ts
   ```

7. **Synchronisieren:**
   ```bash
   ./scripts/sync-images.sh
   ```

## Tipps

- **Konsistenz:** Verwende ähnliche Browser-Fenstergrößen für alle Screenshots
- **Qualität:** Stelle sicher, dass Text lesbar ist
- **Relevanz:** Zeige nur relevante Bereiche, keine leeren Bereiche
- **Aktualität:** Erstelle Screenshots regelmäßig neu, wenn sich die UI ändert
- **Daten:** Verwende Demo-Daten oder anonymisierte Daten

## Checkliste vor Screenshot-Erstellung

- [ ] App läuft lokal oder auf Server
- [ ] Route ist korrekt und vollständig geladen
- [ ] Alle relevanten Elemente sind sichtbar
- [ ] Keine persönlichen Daten sichtbar
- [ ] Browser-Fenstergröße ist konsistent
- [ ] Screenshot zeigt den beschriebenen Kontext

