# Multilingual Writing Expert - Deployment Guide

## Edge Function deployen

```bash
cd products/ebook-automation-system
supabase functions deploy multilingual-writing-expert
```

## Environment Variables setzen

In Supabase Dashboard → Edge Functions → Settings:

- `OLLAMA_URL`: URL zu Ollama API (z.B. `http://91.99.232.126:11434/v1`)
  - Für lokales LLM auf Hetzner-Server
  - Standard: `http://91.99.232.126:11434/v1`

## Test

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/multilingual-writing-expert \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "KI-gestützte Automatisierung",
    "genre": "non-fiction",
    "language": "de",
    "targetAudience": "Erwachsene",
    "length": "medium"
  }'
```

