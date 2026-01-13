# Sales MCP Server - Deployment Anleitung

## Übersicht

Der Sales MCP Server ist eine **Supabase Edge Function**, die spezialisiert auf Verkauf, Vertrieb und Marketing ist. Sie läuft direkt auf Supabase (nicht auf Hetzner) und kennt alle Produkte, Preise und Features.

## ✅ Was wurde erstellt

1. **Supabase Edge Function**: `supabase/functions/sales-chat/index.ts`
2. **Agent Profiles**: Sales Agent, Marketing Agent, Product Expert
3. **Product Knowledge Base**: Vollständige Produktinformationen eingebettet
4. **Chatbot API Route**: Angepasst für automatisches Routing (Sales vs. Support)
5. **Leads-Tabelle**: Migration für Lead-Erstellung

## 🚀 Deployment-Schritte

### Schritt 1: Supabase Migration ausführen

```bash
# Führe die Leads-Tabelle Migration aus
supabase migration up
```

Oder manuell in Supabase Dashboard:
- SQL Editor öffnen
- `supabase/migrations/016_leads_table.sql` ausführen

### Schritt 2: Environment Variables setzen

In Supabase Dashboard → Edge Functions → Settings:

- `SUPABASE_URL`: Automatisch gesetzt
- `SUPABASE_SERVICE_ROLE_KEY`: Automatisch gesetzt
- `GROQ_API_KEY`: Dein Groq API Key (für LLM-Antworten)

### Schritt 3: Edge Function deployen

```bash
cd products/ai-whatsapp-bot-builder

# Supabase CLI Login (falls noch nicht eingeloggt)
supabase login

# Edge Function deployen
supabase functions deploy sales-chat
```

### Schritt 4: Frontend Environment Variables prüfen

Stelle sicher, dass in `.env.local` (Frontend) vorhanden:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Schritt 5: Frontend deployen

```bash
cd frontend
npm run build
# Deploy wie gewohnt
```

## 🧪 Testing

### Test 1: Sales-Anfrage

```bash
curl -X POST https://whatsapp.owona.de/api/support/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Was kostet der WhatsApp Bot Builder?",
    "locale": "de"
  }'
```

**Erwartete Antwort**: Preis-Informationen vom Sales Agent

### Test 2: Marketing-Anfrage

```bash
curl -X POST https://whatsapp.owona.de/api/support/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Was kann der WhatsApp Bot Builder?",
    "locale": "de"
  }'
```

**Erwartete Antwort**: Feature-Informationen vom Product Expert

### Test 3: Support-Anfrage

```bash
curl -X POST https://whatsapp.owona.de/api/support/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Es gibt ein Problem mit der Registrierung",
    "locale": "de"
  }'
```

**Erwartete Antwort**: Support-Ticket wird erstellt (bestehende Logik)

## 📊 Routing-Logik

Der Chatbot erkennt automatisch, ob es eine Sales/Marketing-Anfrage oder eine Support-Anfrage ist:

**Sales/Marketing** (→ Sales MCP Server):
- Preis, Kosten, Kaufen, Abo
- Features, Funktionen, Produkt
- Marketing, Kampagne, Demo
- Testversion, Trial

**Support** (→ Support MCP Server):
- Problem, Fehler, Bug
- Funktioniert nicht
- Fehlgeschlagen, schiefgelaufen

## 🔧 Konfiguration

### Agent Profiles

Die Agent Profiles sind in `supabase/functions/sales-chat/index.ts` definiert:

- **Sales Agent**: Verkauf, Preise, Abschlüsse
- **Marketing Agent**: Marketing, Content, Kampagnen
- **Product Expert**: Features, Use Cases, Technische Details

### Produkte

Produkte sind aktuell hardcoded in der Edge Function. Für Erweiterungen:

1. Produkt-Array in `index.ts` erweitern
2. Oder: Produkte aus Supabase-Tabelle laden (empfohlen für Skalierung)

## 📝 Nächste Schritte

1. ✅ Migration ausführen
2. ✅ Edge Function deployen
3. ✅ Frontend deployen
4. ✅ Testen
5. ⏳ Produkte in Datenbank-Tabelle verschieben (optional)
6. ⏳ Analytics für Leads hinzufügen (optional)

## 🐛 Troubleshooting

### Edge Function nicht erreichbar

- Prüfe Supabase Dashboard → Edge Functions → Logs
- Prüfe Environment Variables
- Prüfe CORS-Einstellungen

### Keine LLM-Antworten

- Prüfe `GROQ_API_KEY` in Supabase Edge Function Settings
- Prüfe Groq API Quota
- Fallback-Antworten sollten trotzdem funktionieren

### Leads werden nicht erstellt

- Prüfe Migration wurde ausgeführt
- Prüfe RLS Policies
- Prüfe Service Role Key

## 📚 Weitere Informationen

- **Edge Function Code**: `supabase/functions/sales-chat/index.ts`
- **Chatbot API Route**: `frontend/app/api/support/chat/route.ts`
- **Migration**: `supabase/migrations/016_leads_table.sql`

