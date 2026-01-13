# 🧠 RAG-Setup Anleitung

## Übersicht

Das RAG (Retrieval-Augmented Generation) System ermöglicht es, mit KI basierend auf eigenen Wissensquellen (PDFs oder URLs) zu chatten.

## Setup

### 1. Supabase pgvector Extension aktivieren

In Supabase SQL Editor ausführen:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2. Migration ausführen

Die Migration `003_rag_knowledge_sources.sql` in Supabase ausführen:

1. Gehen Sie zu Supabase Dashboard → SQL Editor
2. Öffnen Sie die Datei `supabase/migrations/003_rag_knowledge_sources.sql`
3. Kopieren Sie den Inhalt und führen Sie ihn aus

### 3. Environment Variables

Stellen Sie sicher, dass folgende Umgebungsvariablen gesetzt sind:

```env
# OpenAI für Embeddings
OPENAI_API_KEY=your_openai_api_key

# GROQ für Chat
GROQ_API_KEY=your_groq_api_key

# App URL (für API-Calls)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Upload-Verzeichnis erstellen

Erstellen Sie das Upload-Verzeichnis für PDFs:

```bash
mkdir -p uploads/knowledge
```

Für Production sollten PDFs in Supabase Storage gespeichert werden statt lokal.

## Funktionsweise

### 1. PDF-Upload
- Benutzer lädt PDF hoch
- PDF wird geparst und in Chunks aufgeteilt (800 Zeichen mit 100 Zeichen Overlap)
- Jeder Chunk erhält ein Embedding (OpenAI text-embedding-3-small)
- Embeddings werden in Supabase gespeichert

### 2. URL-Verarbeitung
- Benutzer gibt URL ein
- HTML wird geladen und bereinigt (Scripts, Styles entfernt)
- Text wird extrahiert und in Chunks aufgeteilt
- Embeddings werden generiert und gespeichert

### 3. Chat
- Benutzer stellt Frage
- Frage wird in Embedding umgewandelt
- Vector-Similarity-Search findet relevante Chunks (Top 5)
- Relevante Chunks werden als Context an GROQ API gesendet
- GROQ generiert Antwort basierend nur auf dem Context

## API Endpoints

### POST `/api/knowledge/upload`
PDF hochladen

**Request:**
- `file`: PDF-Datei (FormData)
- `sessionId`: Session ID für Demo

**Response:**
```json
{
  "id": "uuid",
  "name": "document.pdf",
  "status": "processing"
}
```

### POST `/api/knowledge/url`
URL hinzufügen

**Request:**
```json
{
  "url": "https://example.com",
  "sessionId": "session_id"
}
```

### POST `/api/knowledge/chat`
Chat-Nachricht senden

**Request:**
```json
{
  "message": "Was steht in dem Dokument?",
  "sessionId": "session_id",
  "sourceIds": ["uuid1", "uuid2"]
}
```

**Response:**
```json
{
  "response": "KI-Antwort...",
  "sources": [
    {
      "id": "chunk_id",
      "content": "Auszug aus dem Chunk...",
      "similarity": 0.85
    }
  ]
}
```

### GET `/api/knowledge/sources?sessionId=xxx`
Wissensquellen abrufen

## Vector Search

Die Funktion `match_document_chunks` verwendet Cosine Similarity für die Suche:

```sql
SELECT * FROM match_document_chunks(
  query_embedding := '[0.1, 0.2, ...]'::vector(1536),
  match_threshold := 0.7,
  match_count := 5,
  source_ids := ARRAY['uuid1', 'uuid2']::UUID[]
);
```

## Verbesserungen für Production

1. **Supabase Storage** statt lokales Dateisystem
2. **Background Jobs** für Processing (Supabase Edge Functions)
3. **Streaming Responses** für besseres UX
4. **Rate Limiting** für API-Calls
5. **Caching** für häufige Queries
6. **Error Retry Logic** für Embedding-Generierung
7. **Progress Updates** via WebSocket/SSE

## Troubleshooting

### Embeddings werden nicht generiert
- Prüfen Sie `OPENAI_API_KEY`
- Prüfen Sie API-Logs

### Vector Search findet keine Ergebnisse
- Prüfen Sie, ob Embeddings in `document_chunks` vorhanden sind
- Reduzieren Sie `match_threshold` (z.B. 0.5)
- Prüfen Sie, ob `source_ids` korrekt sind

### PDF-Parsing schlägt fehl
- Prüfen Sie, ob PDF verschlüsselt ist
- Prüfen Sie File Size (max. 10MB)
- Prüfen Sie Logs für Details

