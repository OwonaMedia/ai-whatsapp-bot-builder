# Autopatch Plan – api-pdf-worker-module-fix

- Ticket: `67a0308f-41ca-4463-baea-04f3afc32b6c`
- Erstellt: 2025-11-26T14:41:46.205Z
- Locale: de

## Kontext
Autopatch: PDF Worker-Modul nicht gefunden - Fix für pdf-parse Worker-Pfad.

### Ausgangssituation
upload nicht möglich

## Ziel
PDF Worker-Modul-Fehler beheben - pdf-parse Worker korrekt konfigurieren.

## Betroffene Dateien
- lib/pdf/parsePdf.ts
- app/api/knowledge/upload/route.ts
- package.json

## Änderungsschritte
1. Prüfe ob pdf-parse in package.json vorhanden ist
2. Entferne explizite Worker-Pfad-Referenzen aus parsePdf.ts
3. Stelle sicher, dass pdf-parse automatisch Worker lädt
4. Falls nötig: Worker-Pfad zur Build-Konfiguration hinzufügen
5. Teste PDF-Upload nach Fix

## Tests & Validierung
1. PDF hochladen testen
2. Browser-Konsole auf Worker-Fehler prüfen
3. RAG Chat mit PDF-Inhalt testen

## Rollout/Deployment
1. `npm install`
2. `npm run build`
3. `pm2 restart whatsapp-bot-builder --update-env`