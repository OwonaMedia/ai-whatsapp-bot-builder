# Remote-Server Setup

## Umgebungsvariablen

Der Support MCP Server benötigt die folgende Umgebungsvariable für Remote-Betrieb:

### FRONTEND_ROOT

**Wichtig:** Diese Variable muss auf dem Remote-Server gesetzt werden, damit der `ProblemVerifier` die Frontend-Dateien korrekt findet.

```bash
FRONTEND_ROOT=/var/www/whatsapp-bot-builder/frontend
```

### Konfiguration

Die Variable kann auf verschiedene Weise gesetzt werden:

1. **In `ecosystem.config.js`** (bereits konfiguriert):
```javascript
env: {
  FRONTEND_ROOT: '/var/www/whatsapp-bot-builder/frontend',
}
```

2. **In `.env` Datei** (im `support-mcp-server` Verzeichnis):
```
FRONTEND_ROOT=/var/www/whatsapp-bot-builder/frontend
```

3. **Als System-Umgebungsvariable**:
```bash
export FRONTEND_ROOT=/var/www/whatsapp-bot-builder/frontend
```

### Warum ist das wichtig?

Der `ProblemVerifier` prüft Frontend-Dateien (z.B. `lib/pdf/parsePdf.ts`, `app/api/knowledge/upload/route.ts`), um zu verifizieren, ob ein Problem tatsächlich vorliegt. Ohne die korrekte `FRONTEND_ROOT` Variable würde das System nach Dateien auf dem lokalen Mac suchen statt auf dem Remote-Server.

### Lokale Entwicklung

Für lokale Entwicklung wird automatisch ein Fallback verwendet:
- Wenn `FRONTEND_ROOT` nicht gesetzt ist, wird `../frontend` relativ zum `support-mcp-server` Verzeichnis verwendet.

### Deployment

Nach dem Deployment auf dem Remote-Server:

1. Stelle sicher, dass `FRONTEND_ROOT` in `ecosystem.config.js` gesetzt ist
2. Oder setze die Variable in der `.env` Datei
3. Starte PM2 neu: `pm2 restart support-mcp-server --update-env`

