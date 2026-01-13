# OWONA Support MCP Server

Der **Support-MCP-Server** automatisiert den Kundendienst des WhatsApp Bot Builders:

- überwacht neue Tickets (`support_tickets`, `support_ticket_messages`)
- nutzt die GROQ LLM API, Reverse-Engineering-Dokumente und UX-Guidelines als Wissen
- führt (zukünftig) Korrektur-Aktionen direkt in Supabase / auf dem Hetzner-Server aus

## Features

- **Knowledge Fusion:** lädt Markdown-Dokumente aus `reverse engineering/` und `docs/`.
- **Ticket Automatisierung:** erstellt automatisch Antworten, aktualisiert Status und protokolliert den Analyseplan.
- **Task Router:** unterscheidet Kategorien (UX, Auth, Infrastruktur) und kann passende Workflows starten.
- **Structured Output:** erwartet vom LLM eine JSON-Antwort (Status, Summary, Action-Liste).
- **Logging:** Pino-Logger mit strukturierter Ausgabe.

## Setup

```bash
cd support-mcp-server
npm install
cp env.example .env
# .env anpassen (Supabase Admin Key, GROQ API Key, Knowledge-Pfade)
npm run dev        # Entwicklungsmodus (tsx watch)
# oder
npm run build && npm start
```

### Umgebungsvariablen

| Variable | Beschreibung |
|----------|--------------|
| `SUPABASE_SERVICE_URL` | Supabase Projekt-URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role Key (volle Rechte, sicher verwahren!) |
| `GROQ_API_KEY` | LLM-Zugriff für Analysen/Antworten |
| `HETZNER_API_TOKEN` | Optional, für Infrastruktur-Befehle |
| `KNOWLEDGE_ROOT` | Pfad zu Reverse-Engineering / Wissensdokumenten |
| `UX_GUIDE_ROOT` | Pfad zu UX-Guidelines / Screenshots |
| `LOG_LEVEL` | `info` (Default), `debug`, `warn`, `error` |

## Architektur

```
Supabase (Realtime) ---> Support MCP Server ---> Supabase (Tickets/Status)
                                  |
                                  +--> GROQ LLM (Antwort & Aktionsplan)
                                  +--> Knowledge Base (Markdown Files)
                                  +--> Hetzner API / Deploy Hooks (Auto-Fixes)
```

Hauptmodule (`src/`):

- `config.ts` – läd & validiert Env-Variablen
- `supabaseClient.ts` – Wrapper für Abfragen & Realtime
- `knowledgeBase.ts` – Scannt Markdown-Wissen, bereitet Kontexte auf
- `llmClient.ts` – Schnittstelle zur GROQ API (strukturierte Prompts)
- `automation.ts` – Ausführung von Actions (Supabase/Hetzner/UX)
- `ticketRouter.ts` – Ticket-Event-Handler + Statuswechsel
- `index.ts` – start() Entry-Point

## TODO / Roadmap

- [ ] Automatisches Einspielen von UX-Fixes (Git Patch, PM2 Restart)
- [ ] Hetzner Command Executor (SSH / API)
- [ ] Integration mit n8n für komplexe Playbooks
- [ ] Tests & Mocks für LLM / Supabase

## Lizenz

Proprietär – Nutzung auf die OWONA WhatsApp Plattform beschränkt.

