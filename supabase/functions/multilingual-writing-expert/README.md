# Multilingual Writing Expert - Supabase Edge Function

MCP Server für multikulturelles Schreiben von E-Books.

## Features

- 🌍 Multikulturelles Schreiben (DE, EN, FR, ES, etc.)
- 📚 Genre-Expertise (Fiction, Non-Fiction, Technical)
- ✍️ Schreibstil-Anpassung
- 🌐 Kulturelle Lokalisierung

## Deployment

```bash
supabase functions deploy multilingual-writing-expert
```

## Environment Variables

- `OLLAMA_URL`: URL zu Ollama API (z.B. `http://91.99.232.126:11434/v1`)
  - Für lokales LLM auf Hetzner-Server
  - Standard: `http://91.99.232.126:11434/v1`

