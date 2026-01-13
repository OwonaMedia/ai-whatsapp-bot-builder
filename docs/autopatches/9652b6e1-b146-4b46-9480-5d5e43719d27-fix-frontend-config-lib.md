# Autopatch Plan – fix-frontend_config-lib/pdf/parsePdf.ts

- Ticket: `9652b6e1-b146-4b46-9480-5d5e43719d27`
- Erstellt: 2025-11-28T13:51:02.551Z


## Kontext
Autopatch: Abweichung von Reverse Engineering Blaupause - lib/pdf/parsePdf.ts - PDF-Upload-Problem erkannt (Datei existiert, aber Upload funktioniert nicht)

### Ausgangssituation
Beim Hochladen einer PDF-Datei kommt die Fehlermeldung "Worker-Modul nicht gefunden". Die Datei wird nicht verarbeitet.

## Ziel
Abweichung von dokumentiertem Zustand beheben: lib/pdf/parsePdf.ts - PDF-Upload-Problem erkannt (Datei existiert, aber Upload funktioniert nicht)

## Betroffene Dateien
- lib/pdf/parsePdf.ts

## Änderungsschritte
1. Problem: lib/pdf/parsePdf.ts - PDF-Upload-Problem erkannt (Datei existiert, aber Upload funktioniert nicht)
2. Dokumentierter Zustand: PDF-Verarbeitungs-Konfiguration: lib/pdf/parsePdf.ts
3. - ✅ Datei existiert: /Users/salomon/Documents/products/ai-whatsapp-bot-builder/frontend/lib/pdf/parsePdf.ts
4. - ⚠️  Ticket beschreibt PDF-Upload-Problem, Datei existiert aber Upload funktioniert nicht
5. - 💡 Mögliche Ursachen: Worker-Pfad-Problem, Upload-Route-Problem, oder Embedding-Generierung
6. - Prüfe lib/pdf/parsePdf.ts auf Worker-Pfad-Referenzen
7. - Validiere pdf-parse Dependency
8. - Prüfe Build-Konfiguration für Worker-Module

## Tests & Validierung
1. lib/pdf/parsePdf.ts entspricht dokumentiertem Zustand
2. Datei existiert: /Users/salomon/Documents/products/ai-whatsapp-bot-builder/frontend/lib/pdf/parsePdf.ts

## Rollout/Deployment
1. `npm run build`
2. `pm2 restart whatsapp-bot-builder --update-env`

## System-Zustand

### Aktuelle Datei-Inhalte

#### lib/pdf/parsePdf.ts
```typescript
import { PDFParse } from 'pdf-parse';

export type ParsedPdfResult = {
  text: string;
  pageCount: number;
  pages: Array<{ text: string; num: number }>;
};

export async function parsePdfBuffer(buffer: Buffer): Promise<ParsedPdfResult> {
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    const pages = Array.isArray(result.pages) ? result.pages : [];
    const pageCount =
      typeof result.total === 'number'
        ? result.total
        : pages.length;

    return {
      text: result.text ?? '',
      pageCount,
      pages,
    };
  } finally {
    try {
      await parser.destroy();
    } catch (error) {
      console.warn('[parsePdfBuffer] Failed to destroy PDF parser instance:', error);
    }
  }
}


```

### Abhängigkeiten
- `@supabase/ssr`: ^0.7.0
- `@supabase/supabase-js`: ^2.39.3
- `@types/pdfkit`: ^0.17.3
- `pdf-parse`: ^2.4.5
- `pdfkit`: ^0.17.2

### Reverse Engineering Referenzen
- Konfiguration: lib/pdf/parsePdf.ts
- Typ: frontend_config
- Beschreibung: PDF-Verarbeitungs-Konfiguration: lib/pdf/parsePdf.ts
- Abweichung: lib/pdf/parsePdf.ts - PDF-Upload-Problem erkannt (Datei existiert, aber Upload funktioniert nicht)

## Code-Änderungen (Diff)

### Betroffene Funktionen
- parsePdfBuffer

## Kontext & Abhängigkeiten

### Betroffene Komponenten
- lib/pdf/parsePdf.ts

## Fehlerbehandlung & Rollback

### Mögliche Fehler
- worker nicht gefunden
- module not found
- upload fehlgeschlagen
- parsing fehler
- embedding fehler
- pdf upload
- pdf hochladen

### Rollback-Strategie
Wiederherstellung von Backup oder Git-Revert

### Validierungsschritte
1. lib/pdf/parsePdf.ts funktioniert korrekt
2. Tests durchführen

### Monitoring
- Logs prüfen
- Fehlerrate überwachen