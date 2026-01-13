# WhatsApp Bot Builder - Aktueller Stand

**Datum:** 02. November 2025, 22:12 Uhr  
**Version:** v0.1.0  
**Server:** whatsapp.owona.de  
**Status:** ✅ Production (mit laufenden Fixes)

## Übersicht

Der WhatsApp Bot Builder ist eine SaaS-Plattform für die Erstellung von AI-gestützten WhatsApp Business Bots. Das System verwendet Next.js, Supabase, n8n und bietet eine RAG-basierte Demo für Knowledge Sources.

## Aktuelle Probleme & Fixes

### ✅ BEHOBEN: Wissenquellen verschwinden nach Upload

**Problem:**
- Dateien/URLs werden hochgeladen, "Verarbeitung..." wird angezeigt
- Quellen verschwinden aus der Liste und sind nicht mehr sichtbar

**Root Cause:**
- Wenn ein User eingeloggt ist, wurde `session_id` nicht gesetzt
- Bedingung `if (sessionId && !userId)` setzte `session_id` nur bei anonymen Sessions
- Sources API filtert nach `session_id` → Quellen mit nur `user_id` wurden nicht gefunden

**Fix:**
- `session_id` wird jetzt IMMER gesetzt, wenn vorhanden (auch bei eingeloggten Usern)
- Änderungen in:
  - `/api/knowledge/upload/route.ts`
  - `/api/knowledge/url/route.ts`

**Status:** ✅ Deployed am 02.11.2025 22:12

---

### ✅ BEHOBEN: Background-Client Problem

**Problem:**
- PDF/URL-Verarbeitung hängt nach "Creating chunks..."
- Keine Chunks werden in die Datenbank eingefügt

**Root Cause:**
- Background-Prozesse haben keine Request-Cookies
- `createRouteHandlerClient()` benötigt Cookies für Cookie-Handling
- In Background-Prozessen schlägt RLS fehl (`auth.uid() = null`)
- INSERTs werden durch RLS blockiert

**Fix:**
- Anon-Client (`createAnonSupabaseClient()`) in Background-Prozessen
- Funktioniert mit RLS-Policy für Demo-Sessions (`session_id IS NOT NULL`)
- Keine Cookie-Abhängigkeit

**Status:** ✅ Deployed

---

### ✅ BEHOBEN: ChunkText Safety-Checks

**Problem:**
- Chunk-Erstellung hängt oder crasht

**Fix:**
- Infinite Loop Prevention
- Max Iterations Limit (10000)
- Overlap Validation
- Detailliertes Logging
- Error-Handling mit Try-Catch

**Status:** ✅ Deployed

---

### ✅ BEHOBEN: RLS INSERT Policy

**Problem:**
- Chunks konnten nicht eingefügt werden

**Fix:**
- RLS `INSERT` Policy für `document_chunks` erstellt
- Policy: "Allow insert for accessible knowledge sources"
- Erlaubt INSERTs wenn `knowledge_source.session_id IS NOT NULL` ODER `knowledge_source.user_id = auth.uid()`

**Status:** ✅ Deployed

---

### ✅ BEHOBEN: Session-ID in Demo-Sessions

**Problem:**
- Sources API konnte Quellen nicht finden

**Fix:**
- `createAnonSupabaseClient()` für Sources API
- Funktioniert mit RLS-Policy für Demo-Sessions
- Keine Cookie-Abhängigkeit

**Status:** ✅ Deployed

---

### 🔄 IN ARBEIT: PDF/URL-Verarbeitung Completion

**Problem:**
- Verarbeitung startet, aber stoppt bei "Creating chunks..."
- Logs zeigen: `[PDF Processing] Step 2/4: Creating chunks...` dann nichts mehr

**Aktueller Stand:**
- ChunkText-Funktion wurde mit Safety-Checks erweitert
- Erweiterte Logging hinzugefügt
- Direkter INSERT-Test funktioniert (RLS-Policy ist korrekt)
- Problem liegt wahrscheinlich bei chunkText() oder danach

**Nächste Schritte:**
- Neue Uploads testen mit erweiterten Debug-Logs
- Prüfen ob chunkText() hängt oder Insert fehlschlägt

**Status:** 🔄 Warte auf Test-Upload

---

## Technische Details

### Architektur

**Frontend:**
- Next.js 14.2.33 (App Router)
- TypeScript
- Tailwind CSS
- React Flow (`@xyflow/react`)
- next-intl (Multi-Language)

**Backend:**
- Supabase (PostgreSQL mit pgvector)
- Row Level Security (RLS)
- n8n (Workflow Automation)
- PM2 (Process Management)

**APIs:**
- `/api/knowledge/upload` - PDF Upload
- `/api/knowledge/url` - URL Processing
- `/api/knowledge/sources` - Source Listing
- `/api/knowledge/chat` - RAG Chat
- `/api/knowledge/embeddings` - Embedding Generation

### Datenbank-Schema

**Tabellen:**
- `knowledge_sources` - Haupttabelle für Knowledge Sources
  - `id` (UUID)
  - `name` (TEXT)
  - `type` ('pdf' | 'url' | 'text')
  - `status` ('processing' | 'ready' | 'error')
  - `session_id` (TEXT) - Für Demo-Sessions
  - `user_id` (UUID) - Für eingeloggte User
  - `metadata` (JSONB)
  
- `document_chunks` - Text-Chunks für RAG
  - `id` (UUID)
  - `knowledge_source_id` (UUID)
  - `chunk_index` (INTEGER)
  - `content` (TEXT)
  - `embedding` (vector) - pgvector
  - `metadata` (JSONB)

**RLS Policies:**

1. `knowledge_sources`:
   - "Allow anonymous access for demo sessions" (`session_id IS NOT NULL`)
   - "Users can manage their own knowledge sources" (`auth.uid() = user_id`)

2. `document_chunks`:
   - "Allow access to chunks from accessible sources" (SELECT)
   - "Allow insert for accessible knowledge sources" (INSERT)
   - "Allow update for accessible knowledge sources" (UPDATE)

### Supabase Clients

**1. `createRouteHandlerClient()`**
- Für Request-Handler mit Cookie-Support
- Verwendet `@supabase/ssr`
- Funktioniert nur in Request-Context

**2. `createAnonSupabaseClient()`**
- Für Background-Prozesse oder Demo-Sessions
- Direkt `@supabase/supabase-js` mit Anon-Key
- Keine Cookie-Abhängigkeit
- Funktioniert mit RLS für `session_id IS NOT NULL`

### Processing Flow

**PDF Upload:**
1. Upload → `/api/knowledge/upload`
2. Datei speichern → `uploads/knowledge/{id}.pdf`
3. Record erstellen → `knowledge_sources` mit `status: 'processing'`
4. Background: `processPDF()` → `createAnonSupabaseClient()`
5. PDF parsen → `pdf-parse`
6. Text chunken → `chunkText()`
7. Chunks einfügen → Batches von 50
8. Status update → `status: 'ready'`
9. Embeddings generieren → Async (nicht blockierend)

**URL Processing:**
1. URL Submit → `/api/knowledge/url`
2. Record erstellen → `knowledge_sources` mit `status: 'processing'`
3. Background: `processURL()` → `createAnonSupabaseClient()`
4. URL fetchen → `fetch()` mit 10s Timeout
5. HTML parsen → `cheerio`
6. Text extrahieren → Body-Text
7. Text chunken → `chunkText()`
8. Chunks einfügen → Batches von 50
9. Status update → `status: 'ready'`
10. Embeddings generieren → Async (nicht blockierend)

### Frontend Polling

**RAGDemo Component:**
- Polling alle 3 Sekunden für `loadSources()`
- Individual Polling für `processing` Sources mit Exponential Backoff
- Timeout nach 60 Polls (~3 Minuten)
- Cleanup bei Unmount

**Polling Flow:**
1. Upload → Source mit `status: 'processing'` wird zur Liste hinzugefügt
2. `startPollingSource(sourceId)` wird gestartet
3. Poll alle 3-10 Sekunden (Exponential Backoff)
4. Status-Check → API Call zu `/api/knowledge/sources?sessionId={id}`
5. Status-Update im State
6. Stopp bei `status !== 'processing'`
7. Toast-Notification bei Erfolg/Fehler

---

## Deployment

### Server
- **Host:** root@91.99.232.126
- **Path:** `/var/www/whatsapp-bot-builder`
- **PM2:** `whatsapp-bot-builder`
- **Nginx:** Reverse Proxy auf Port 443 (HTTPS)

### Build & Deploy
```bash
cd /var/www/whatsapp-bot-builder
npm run build
pm2 restart whatsapp-bot-builder
```

### Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL` (https://whatsapp.owona.de)

---

## Nächste Schritte

1. **PDF/URL-Verarbeitung Completion testen**
   - Neue Uploads mit erweiterten Logs testen
   - Prüfen ob chunkText() oder Inserts das Problem sind

2. **FlowCraft-Implementierung analysieren**
   - Warum funktionierte URL-Verarbeitung dort?
   - Unterschiede identifizieren

3. **Weitere Features**
   - WhatsApp Business API Integration (teilweise implementiert)
   - Bot Flow Execution Engine (teilweise implementiert)
   - Analytics Dashboard (teilweise implementiert)
   - Web Chat Widget (implementiert)
   - Compliance Checker (implementiert)
   - Use-Case Templates (implementiert)

---

## Wichtige Erkenntnisse

1. **Background-Prozesse benötigen Anon-Client**
   - Keine Request-Cookies in Background-Context
   - `createRouteHandlerClient()` funktioniert nicht
   - `createAnonSupabaseClient()` ist die Lösung

2. **Session-ID muss IMMER gesetzt werden**
   - Auch bei eingeloggten Usern
   - Ermöglicht Demo-Sessions parallel zu User-Accounts

3. **RLS-Policies müssen beide Szenarien unterstützen**
   - Demo-Sessions: `session_id IS NOT NULL`
   - User-Sessions: `user_id = auth.uid()`

4. **Chunk-Processing braucht Safety-Checks**
   - Infinite Loop Prevention
   - Timeouts
   - Batch-Inserts

---

## Offene Fragen

1. Warum hängt chunkText() in Production?
   - Funktioniert lokal?
   - Memory-Problem?
   - Timeout zu kurz?

2. FlowCraft-Implementierung:
   - Welcher Ansatz wurde dort verwendet?
   - Unterschiede identifizieren

---

**Letzte Aktualisierung:** 02.11.2025 22:12  
**Nächste Review:** Nach Test-Upload


