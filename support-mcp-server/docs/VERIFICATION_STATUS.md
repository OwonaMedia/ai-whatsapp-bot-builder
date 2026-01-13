# Problem-Verifikation Status

## Aktueller Stand

### ✅ Erweitert (mit Funktionalitäts-Prüfung)

1. **PDF-Probleme** (`config-frontend_config-lib/pdf/parsePdf.ts`, `pdf-worker-module-not-found`)
   - ✅ Datei-Existenz-Prüfung
   - ✅ Worker-Modul-Referenzen
   - ✅ pdf-parse Import
   - ✅ Upload-Route-Prüfung
   - ✅ chunkText-Funktion (Infinite-Loop-Schutz)
   - ✅ Embedding-Generierung
   - ✅ Error Handling
   - ✅ package.json Dependency-Prüfung
   - ✅ Upload-Funktionalitäts-Prüfung (erkennt Upload-Probleme auch bei vorhandener Datei)

### ✅ Erweitert (mit Funktionalitäts-Prüfung)

2. **API-Endpoints** (`config-api_endpoint-*`)
   - ✅ Route-Existenz-Prüfung
   - ✅ Error Handling-Prüfung
   - ✅ Supabase Client-Prüfung
   - ✅ Request-Validierung (Zod)
   - ✅ Response-Format-Prüfung
   - ✅ HTTP-Methoden-Prüfung
   - ✅ Authentifizierung-Prüfung
   - ✅ Spezifische Funktionalitäts-Prüfung (Upload, Payment, etc.)

3. **Frontend-Konfigurationen** (`config-frontend_config-*`)
   - ✅ Datei-Existenz-Prüfung
   - ✅ PDF-spezifische Prüfung (wenn PDF-Datei)
   - ✅ React-Komponenten-Prüfung ('use client' Directive)
   - ✅ TypeScript-Typen-Prüfung
   - ✅ Import-Prüfung (Supabase, etc.)
   - ✅ Error Handling-Prüfung
   - ✅ Häufige Fehlermuster-Erkennung

4. **Env-Variablen** (`config-env_var-*`)
   - ✅ Variable-Existenz in .env.local
   - ✅ Format-Validierung (URL, Key/Secret)
   - ✅ Leere Werte-Prüfung
   - ✅ Abhängigkeits-Prüfung (z.B. Supabase)

5. **Database-Settings** (`config-database_setting-*`)
   - ✅ RLS-Policy-Problem-Erkennung
   - ✅ Tabellen-Existenz-Problem-Erkennung
   - ✅ Foreign Key-Problem-Erkennung
   - ✅ Schema-Problem-Erkennung
   - ✅ Generische Database-Problem-Erkennung

6. **Deployment-Configs** (`config-deployment_config-*`)
   - ✅ PM2-Problem-Erkennung
   - ✅ Port-Konflikt-Erkennung
   - ✅ Service-Verfügbarkeits-Problem-Erkennung
   - ✅ Deployment-spezifische Problem-Erkennung

### ✅ Spezifische Pattern-IDs (eigene Verifikation)

7. **knowledge-upload-failed** - Eigene Verifikation vorhanden
8. **missing-translation** - Eigene Verifikation vorhanden
9. **missing-env-variable** - Eigene Verifikation vorhanden
10. **whatsapp-link-button-issue** - Eigene Verifikation vorhanden

### ⚠️ Fallback

11. **verifyGenericProblem** - Nur Keyword-basierte Prüfung

## Empfohlene Erweiterungen

### Für API-Endpoints:
- Prüfe auf spezifische Funktionalität (z.B. Upload, Payment, etc.)
- Prüfe Abhängigkeiten (Supabase Client, externe APIs)
- Prüfe Request/Response-Validierung
- Prüfe Authentifizierung/Autorisierung

### Für Frontend-Konfigurationen:
- Prüfe auf spezifische Funktionalität basierend auf Dateityp
- Prüfe Imports und Abhängigkeiten
- Prüfe auf häufige Fehlermuster (z.B. Hydration-Mismatch, Memory Leaks)
- Prüfe TypeScript-Typen

### Für Env-Variablen:
- Prüfe ob Variable tatsächlich verwendet wird
- Prüfe Format-Validierung (URLs, Keys, etc.)
- Prüfe Abhängigkeiten (z.B. wenn SUPABASE_URL fehlt, prüfe alle Supabase-Aufrufe)

### Für Database-Settings:
- Prüfe RLS-Policies
- Prüfe Tabellen-Existenz
- Prüfe Foreign Key Constraints
- Prüfe Indexes

### Für Deployment-Configs:
- Prüfe PM2-Status
- Prüfe Service-Verfügbarkeit
- Prüfe Port-Konflikte
- Prüfe Log-Dateien auf Fehler

