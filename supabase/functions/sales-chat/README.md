# Sales MCP Server - Supabase Edge Function

## Übersicht

Der Sales MCP Server ist eine Supabase Edge Function, die spezialisiert auf Verkauf, Vertrieb und Marketing ist. Sie kennt alle Produkte, Preise und Features und kann Kunden bei Verkaufsgesprächen unterstützen.

## Features

- **Sales Agent**: Spezialisiert auf Verkauf, Lead-Qualifizierung, Angebotserstellung
- **Marketing Agent**: Spezialisiert auf Marketing, Content, Kampagnen
- **Product Expert**: Kennt alle Produkte, Features, Preise im Detail
- **Product Knowledge Base**: Vollständige Produktinformationen eingebettet
- **Lead-Erstellung**: Automatische Lead-Erstellung bei Interesse

## Agent Profiles

### Sales Agent
- Verkauf und Abschlüsse
- Preis-Kommunikation
- Testversionen anbieten
- Einwände behandeln

### Marketing Agent
- Marketing-Strategien
- Content-Empfehlungen
- Kampagnen-Informationen
- Lead-Generierung

### Product Expert
- Detaillierte Produktinfos
- Feature-Vergleiche
- Use Cases erklären
- Technische Details

## Produkte

Aktuell unterstützt:
- **WhatsApp Bot Builder**: 29 EUR/Monat, 14-tägige Testversion

## API

**Endpoint**: `POST /functions/v1/sales-chat`

**Request Body**:
```json
{
  "message": "Was kostet der WhatsApp Bot Builder?",
  "userId": "optional-user-id",
  "locale": "de",
  "conversationHistory": []
}
```

**Response**:
```json
{
  "response": "Unser WhatsApp Bot Builder kostet 29 EUR/Monat...",
  "agent": "sales-agent",
  "productRecommendations": [...]
}
```

## Environment Variables

- `SUPABASE_URL`: Supabase Projekt-URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service Role Key
- `OLLAMA_URL`: URL zu Ollama API (z.B. `http://91.99.232.126:11434/v1`)
  - Für lokales LLM auf Hetzner-Server
  - Standard: `http://91.99.232.126:11434/v1`

## Deployment

```bash
supabase functions deploy sales-chat
```

## Verwendung im Chatbot

Die Chatbot API Route (`/api/support/chat`) sollte angepasst werden, um diesen Sales MCP Server zu nutzen statt des Support MCP Servers.

