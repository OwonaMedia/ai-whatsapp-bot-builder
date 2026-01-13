# Autopatch Architect (Tier 2 Agent)

**Aufgabe:**  
Dieser Agent erstellt für wiederkehrende Bugs eine strukturierte Autopatch-Spezifikation. Ziel ist, skalierbare Fix-Routinen aufzubauen, die später von Automatisierung oder dem Entwicklerteam umgesetzt werden können.

## Trigger
- Tier 1/Frontend-Diagnostics erstellen einen Plan mit `ux_update`, aber es existiert kein `fixId`.  
- Ein anderer Agent fordert explizit eine Autopatch-Spezifikation an (`autopatch_plan`).  
- Automatischer Pattern-Detector erkennt häufige Fehler (siehe Tabelle unten) und löst direkt `autopatch_plan` aus.

## Arbeitsweise
1. Analysiert Ticketbeschreibung, Knowledge Base und Reverse-Engineering-Dokumente.  
2. Erstellt eine Markdown-Datei unter `docs/autopatches/` mit:
   - Kontext & Ziel
   - Betroffene Dateien
   - Schritt-für-Schritt-Anleitung (Diff/Code-Skizzen)
   - Tests & Validierung
   - Rollout/Deployment-Notizen  
3. Dokumentiert das Ergebnis als System-Log (`Autopatch-Spezifikation erstellt: …`).  
4. Optional: erstellt To-Dos für manuelle Umsetzung (falls Automatisierung noch nicht existiert).

## Format der Autopatch-Aktion
```jsonc
{
  "type": "autopatch_plan",
  "description": "Autopatch für fehlende i18n-Labels erstellen",
  "payload": {
    "fixName": "i18n-missing-rag-add-text",
    "targetFiles": [
      "messages/de.json",
      "messages/en.json"
    ],
    "steps": [
      "Übersetzungseintrag rag.addText in allen locales ergänzen",
      "QA: RAG Playground neu laden und Eingabeformular prüfen"
    ],
    "validation": [
      "`npm run lint`",
      "Manual QA: Text/Titel-Eingabe prüfen"
    ],
    "rollout": [
      "`npm run build` im Projektroot ausführen",
      "`pm2 restart whatsapp-bot-builder --update-env`"
    ]
  }
}
```

## Kommunikation
- Primär internes Logging.  
- Kunden erhalten erst nach Umsetzung eine Rückmeldung (Standard Tier 1 Follow-up).

## Integrierte Pattern (Stand heute)

| Pattern-ID | Erkennung | Autopatch-Ziel |
|------------|-----------|----------------|
| `missing-translation` | Meldungen mit `MISSING_MESSAGE:<key>` | i18n-Key in allen `messages/*.json` ergänzen (+ Auto-Fix mit Standardübersetzungen, Build & Deploy) |
| `missing-locale-file` | Fehler `messages/<locale>.json` nicht gefunden | Basis-Locale klonen (`clone-locale-file`) und Deploy anstoßen |
| `missing-env-variable` | `Missing environment variable: XYZ` oder `process.env.XYZ is undefined` | Platzhalter in `.env.local` ergänzen (`env-add-placeholder`) und Restart anstoßen |
| `type-error-null-guard` | JavaScript-Fehler „Cannot read/set property … of undefined/null“ | Null-/Undefined-Safety einbauen (Optional Chaining/Fallbacks) |
| `reference-error-missing-import` | „ReferenceError: … is not defined“ | Fehlende Imports/Initialisierung ergänzen |
| `network-fetch-failed` | Meldungen mit `Failed to fetch`, `NetworkError`, `502/504`, `ECONNREFUSED` | API-Robustheit erhöhen (Monitoring, Retries, Error-UI) |

> Die Pattern-Bibliothek (`services/actions/autopatchPatterns.ts`) kann jederzeit um weitere Fehlerbilder erweitert werden.

## Auto-Fix-Routinen
- Für Patterns mit hinterlegten Anweisungen (`autoFixInstructions`) führt der Autopatch-Architect nach der Spezifikation `executeAutoFixInstructions()` aus.
- Beispiele:
  - `missing-translation`: fehlender Key wird direkt in allen Locale-Dateien ergänzt (inkl. Verschachtelung per `rag.addText`), anschließend laufen `npm run lint`, `npm run build`, `pm2 restart`.
  - `missing-locale-file`: erzeugt `messages/<locale>.json` auf Basis von `de.json` und stößt Build/Restart an.
  - `missing-env-variable`: ergänzt Platzhalter in `.env.local` und weist in interner Notiz auf Nachpflege hin.
- Ergebnis-Logs: „Autopatch AutoFix erfolgreich“ oder „AutoFix fehlgeschlagen – manuell prüfen“. Bei Erfolg erhält der Kunde automatisch ein Follow-up.

