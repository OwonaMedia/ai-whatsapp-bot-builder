# 🤖 Dokumentations-Automatisierung

## Übersicht

Das System automatisiert die Dokumentations-Pflege durch:
- **Automatische Code-Überwachung** (File Watcher)
- **Intelligente Änderungs-Erkennung** (Diff-Analyse)
- **MCP Server für Text-Generierung** (24/7)
- **Automatische Screenshot-Erstellung** (nur bei Änderungen)

## Komponenten

### 1. MCP Server (`docs-automation-server.js`)
- Läuft 24/7 als PM2 Service
- Bietet Tools für Dokumentations-Generierung
- Analysiert Code und generiert Texte
- Erstellt Screenshots auf Anfrage

**Tools:**
- `generate_documentation_text` - Generiert professionellen Dokumentations-Text
- `create_screenshot` - Erstellt Screenshots für Dokumentation
- `update_documentation` - Aktualisiert Dokumentations-Sektionen
- `detect_changes` - Analysiert Code-Änderungen
- `analyze_component` - Analysiert React-Komponenten

### 2. File Watcher (`watch-docs.js`)
- Überwacht Code-Änderungen in Echtzeit
- Erkennt betroffene Dokumentations-Sektionen
- Trigger automatische Updates
- Nutzt MCP Server für Text-Generierung

**Überwachte Dateien:**
- `app/**/*.tsx` - Alle App-Seiten
- `components/**/*.tsx` - Alle Komponenten
- `lib/**/*.ts` - Alle Library-Funktionen

### 3. Screenshot-Generator (`generate-screenshots.js`)
- Erstellt Screenshots für alle Dokumentations-Bereiche
- Unterstützt einzelne Sektionen oder alle
- Cache-System für Performance

## Installation

```bash
cd /var/www/whatsapp-bot-builder/frontend
bash scripts/setup-docs-automation.sh
```

Das Script:
1. Installiert Abhängigkeiten (chokidar, @modelcontextprotocol/sdk)
2. Erstellt Verzeichnisse
3. Setzt Berechtigungen
4. Startet MCP Server als PM2 Service
5. Startet File Watcher als PM2 Service

## Verwendung

### Manuelle Screenshot-Erstellung

```bash
# Alle Screenshots
npm run screenshots

# Einzelne Sektion
BASE_URL=http://localhost:3000 node scripts/generate-screenshots.js --section=registration-form
```

### Watcher manuell starten

```bash
npm run watch-docs
```

### MCP Server manuell starten

```bash
npm run mcp-docs-server
```

## PM2 Management

```bash
# Status anzeigen
pm2 list | grep docs

# Logs anzeigen
pm2 logs docs-automation-mcp
pm2 logs docs-watcher

# Neustart
pm2 restart docs-automation-mcp docs-watcher

# Stoppen
pm2 stop docs-automation-mcp docs-watcher

# Starten
pm2 start docs-automation-mcp docs-watcher
```

## Funktionsweise

### 1. Code-Änderung erkannt
```
Datei geändert → File Watcher erkennt Änderung → Analyse betroffener Sektionen
```

### 2. Dokumentations-Update
```
Betroffene Sektion identifiziert → MCP Server analysiert Code → Generiert neuen Text
```

### 3. Screenshot-Update
```
Prüft ob Screenshot aktualisiert werden muss → Erstellt Screenshot → Aktualisiert Dokumentation
```

### 4. Dokumentation aktualisiert
```
Neuer Text + Screenshots → Dokumentations-Datei aktualisiert → Build & Deploy
```

## File-zu-Sektion-Mapping

Die automatische Erkennung mappt Dateien zu Dokumentations-Sektionen:

- `SignupForm.tsx` → `registration`
- `DashboardContent.tsx` → `dashboard`
- `BotBuilder.tsx` → `bot-builder`
- `WhatsAppSetupWizard.tsx` → `whatsapp-setup`
- `KnowledgeManagement.tsx` → `knowledge`
- `AnalyticsDashboard.tsx` → `analytics`
- `TemplateSelector.tsx` → `templates`
- `CompliancePanel.tsx` → `compliance`
- `settings/page.tsx` → `settings`

## Konfiguration

### Environment Variables

```bash
# Base URL für Screenshots
BASE_URL=http://localhost:3000

# Locale
LOCALE=de
```

### PM2 Ecosystem

Erstellen Sie `ecosystem.config.js` für bessere PM2-Verwaltung:

```javascript
module.exports = {
  apps: [
    {
      name: 'docs-automation-mcp',
      script: './mcp-servers/docs-automation-server.js',
      interpreter: 'node',
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      min_uptime: 1000,
    },
    {
      name: 'docs-watcher',
      script: './scripts/watch-docs.js',
      interpreter: 'node',
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      min_uptime: 1000,
    },
  ],
};
```

## Troubleshooting

**Problem: MCP Server startet nicht**
```bash
# Prüfe Logs
pm2 logs docs-automation-mcp

# Prüfe Abhängigkeiten
npm list @modelcontextprotocol/sdk puppeteer
```

**Problem: Watcher erkennt keine Änderungen**
```bash
# Prüfe Logs
pm2 logs docs-watcher

# Prüfe Watch-Patterns
cat scripts/watch-docs.js | grep WATCH_PATTERNS
```

**Problem: Screenshots werden nicht erstellt**
```bash
# Prüfe ob Server läuft
curl http://localhost:3000

# Prüfe Browser
pm2 logs docs-automation-mcp | grep browser
```

## Erweiterte Features

### Git Integration

Das System kann auch Git-Diffs analysieren:

```javascript
// In watch-docs.js
const gitDiff = await execAsync(`git diff ${filePath}`);
await this.detectChanges({ filePath, gitDiff });
```

### Intelligentes Caching

Screenshots werden nur neu erstellt wenn:
- Code-Änderungen erkannt werden
- Features/Props/Funktionen geändert wurden
- Cache-Hash sich geändert hat

### MCP Server Tools erweitern

Fügen Sie neue Tools hinzu in `docs-automation-server.js`:

```javascript
{
  name: 'your_new_tool',
  description: 'Beschreibung',
  inputSchema: { /* Schema */ },
}
```

## Performance

- **File Watcher:** Debounce von 2 Sekunden
- **Screenshot-Cache:** MD5-Hash basiert
- **MCP Server:** Läuft persistent (kein Restart bei jedem Request)
- **PM2:** Auto-Restart bei Fehlern

## Monitoring

```bash
# Ressourcen-Verbrauch
pm2 monit

# Status-Dashboard
pm2 status

# Detaillierte Logs
pm2 logs --lines 100
```

## Best Practices

1. **Commit vor Auto-Update:** Dokumentations-Änderungen werden automatisch committed
2. **Review Updates:** Prüfen Sie automatisch generierte Texte
3. **Cache-Management:** Cache regelmäßig prüfen und bei Bedarf löschen
4. **Logs überwachen:** Regelmäßig Logs prüfen für Fehler

## Wartung

```bash
# Cache löschen
rm mcp-servers/.docs-cache.json

# Screenshots neu erstellen
npm run screenshots

# Services neu starten
pm2 restart all
```

