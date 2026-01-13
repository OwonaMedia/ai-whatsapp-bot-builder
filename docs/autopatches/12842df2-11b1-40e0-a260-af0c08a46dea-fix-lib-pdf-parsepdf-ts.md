# Autopatch Plan – fix-lib/pdf/parsePdf.ts

- Ticket: `12842df2-11b1-40e0-a260-af0c08a46dea`
- Erstellt: 2025-11-26T15:16:23.337Z
- Locale: de

## Kontext
Autopatch: lib/pdf/parsePdf.ts Konfiguration korrigieren

### Ausgangssituation
upload nicht möglich

## Ziel
PDF-Verarbeitungs-Konfiguration: lib/pdf/parsePdf.ts korrigieren

## Betroffene Dateien
- lib/pdf/parsePdf.ts

## Änderungsschritte
1. Prüfe lib/pdf/parsePdf.ts in lib/pdf/parsePdf.ts
2. Korrigiere Konfiguration basierend auf Reverse Engineering
3. - Prüfe lib/pdf/parsePdf.ts auf Worker-Pfad-Referenzen
4. - Validiere pdf-parse Dependency
5. - Prüfe Build-Konfiguration für Worker-Module

## Tests & Validierung
1. lib/pdf/parsePdf.ts funktioniert korrekt

## Rollout/Deployment
1. `npm run build`
2. `pm2 restart whatsapp-bot-builder --update-env`