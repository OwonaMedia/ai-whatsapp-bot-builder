# Autopatch Plan – fix-api_endpoint-/api/bots/

- Ticket: `eb10bcd5-ba27-4ac8-92bd-199e4d9bcf08`
- Erstellt: 2025-11-28T12:55:23.236Z


## Kontext
Autopatch: Abweichung von Reverse Engineering Blaupause - /api/bots/ Route fehlt (dokumentiert als erforderlich)

### Ausgangssituation
Problem: whatsapp.owona.de und owona.de zeigen 502 Bad Gateway Fehler.

Diagnose:
- DNS funktioniert (owona.de → 91.99.232.126)
- Ping funktioniert
- Port 80/443 sind offen
- HTTP/HTTPS gibt 502 Bad Gateway zurück

Ursache: Caddy läuft, aber Next.js (PM2) läuft nicht oder ist nicht erreichbar.

Erwartete AutoFix:
1. pm2 restart whatsapp-bot-builder
2. systemctl restart caddy
3. Prüfe ob Services laufen: pm2 status && systemctl status caddy

## Ziel
Abweichung von dokumentiertem Zustand beheben: /api/bots/ Route fehlt (dokumentiert als erforderlich)

## Betroffene Dateien
- app/api/api/bots//route.ts

## Änderungsschritte
1. Problem: /api/bots/ Route fehlt (dokumentiert als erforderlich)
2. Dokumentierter Zustand: - `GET /api/bots/[id]/compliance` - Compliance-Check abrufen
3. - ❌ API Route fehlt: /Users/salomon/Documents/products/ai-whatsapp-bot-builder/frontend/app/api/api/bots/route.ts
4. - Prüfe /api/bots/ Route
5. - Validiere Request/Response
6. - Prüfe Error Handling
7. - Prüfe Middleware und Authentication

## Tests & Validierung
1. /api/bots/ entspricht dokumentiertem Zustand

## Rollout/Deployment
1. `npm run build`
2. `pm2 restart whatsapp-bot-builder --update-env`

## Kontext & Abhängigkeiten

### API-Endpunkte
- /api/bots/

## Fehlerbehandlung & Rollback

### Mögliche Fehler
- fehler
- 500
- 404
- funktioniert nicht
- schiefgelaufen
- error
- failed
- nicht erreichbar

### Rollback-Strategie
Wiederherstellung von Backup oder Git-Revert

### Validierungsschritte
1. /api/bots/ funktioniert korrekt
2. Tests durchführen

### Monitoring
- Logs prüfen
- Fehlerrate überwachen