# Autopatch Plan – fix-lib/pdf/parsePdf.ts

- Ticket: `0a4352a3-dfa5-4083-ab13-5cdf6f83f665`
- Erstellt: 2025-11-26T15:22:18.640Z
- Locale: de

## Kontext
Autopatch: lib/pdf/parsePdf.ts Konfiguration korrigieren

### Ausgangssituation
pdf in Wissensquelle node hochladen schlägt fehl

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