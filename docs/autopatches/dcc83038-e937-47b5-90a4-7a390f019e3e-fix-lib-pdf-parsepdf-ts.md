# Autopatch Plan – fix-lib/pdf/parsePdf.ts

- Ticket: `dcc83038-e937-47b5-90a4-7a390f019e3e`
- Erstellt: 2025-11-26T15:53:25.430Z
- Locale: de

## Kontext
Autopatch: lib/pdf/parsePdf.ts Konfiguration korrigieren

### Ausgangssituation
test_ebook.pdf upload auf Hauptseite klappt nicht

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