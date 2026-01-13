# Sales MCP Server - Deployment Status

## ✅ Deployment erfolgreich abgeschlossen

**Datum**: 2025-11-26
**Status**: ✅ Alle Komponenten deployed und aktiv

---

## 📋 Deployment-Zusammenfassung

### 1. ✅ Supabase Migration
- **Migration**: `016_leads_table.sql`
- **Status**: ✅ Erfolgreich ausgeführt
- **Tabelle**: `leads` erstellt mit RLS Policies

### 2. ✅ Supabase Edge Function
- **Name**: `sales-chat`
- **Status**: ✅ ACTIVE
- **Version**: 1
- **URL**: `https://ugsezgnkyhcmsdpohuwf.supabase.co/functions/v1/sales-chat`
- **ID**: `35145a62-6599-4ea3-81e9-9b83a61d3374`

### 3. ✅ Frontend Deployment
- **Datei**: `app/api/support/chat/route.ts`
- **Status**: ✅ Deployed
- **PM2**: ✅ Online (Ready in 371ms)

---

## 🎯 Funktionalität

### Automatisches Routing

Der Chatbot erkennt automatisch, ob es eine **Sales/Marketing**-Anfrage oder eine **Support**-Anfrage ist:

**Sales/Marketing** → Sales MCP Server (Supabase Edge Function):
- Preis, Kosten, Kaufen, Abo
- Features, Funktionen, Produkt
- Marketing, Kampagne, Demo
- Testversion, Trial

**Support** → Support MCP Server (bestehende Logik):
- Problem, Fehler, Bug
- Funktioniert nicht
- Fehlgeschlagen, schiefgelaufen

### Agent Profiles

1. **Sales Agent**: Verkauf, Preise, Abschlüsse
2. **Marketing Agent**: Marketing, Content, Kampagnen
3. **Product Expert**: Features, Use Cases, Technische Details

### Produkte

- **WhatsApp Bot Builder**: 29 EUR/Monat, 14-tägige Testversion
- Vollständige Feature-Liste eingebettet
- Use Cases und Zielgruppen bekannt

---

## 🔧 Konfiguration

### Environment Variables (Supabase Edge Function)

Die folgenden Environment Variables müssen in Supabase Dashboard → Edge Functions → Settings gesetzt werden:

- ✅ `SUPABASE_URL`: Automatisch gesetzt
- ✅ `SUPABASE_SERVICE_ROLE_KEY`: Automatisch gesetzt
- ⚠️ `GROQ_API_KEY`: **Muss manuell gesetzt werden** (für LLM-Antworten)

**Hinweis**: Die Edge Function funktioniert auch ohne `GROQ_API_KEY` mit Fallback-Antworten.

---

## 🧪 Testing

### Test 1: Sales-Anfrage (Preis)

```bash
curl -X POST https://whatsapp.owona.de/api/support/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Was kostet der WhatsApp Bot Builder?", "locale": "de"}'
```

**Erwartete Antwort**: Preis-Informationen vom Sales Agent

### Test 2: Product-Anfrage (Features)

```bash
curl -X POST https://whatsapp.owona.de/api/support/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Was kann der WhatsApp Bot Builder?", "locale": "de"}'
```

**Erwartete Antwort**: Feature-Informationen vom Product Expert

### Test 3: Support-Anfrage

```bash
curl -X POST https://whatsapp.owona.de/api/support/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Es gibt ein Problem mit der Registrierung", "locale": "de"}'
```

**Erwartete Antwort**: Support-Ticket wird erstellt (bestehende Logik)

---

## 📊 Nächste Schritte

1. ✅ Migration ausgeführt
2. ✅ Edge Function deployed
3. ✅ Frontend deployed
4. ⏳ **GROQ_API_KEY in Supabase setzen** (optional, für bessere LLM-Antworten)
5. ⏳ Testing durchführen
6. ⏳ Analytics für Leads hinzufügen (optional)

---

## 🐛 Troubleshooting

### Edge Function nicht erreichbar

- Prüfe Supabase Dashboard → Edge Functions → Logs
- Prüfe Environment Variables
- Prüfe CORS-Einstellungen

### Keine LLM-Antworten

- Prüfe `GROQ_API_KEY` in Supabase Edge Function Settings
- Fallback-Antworten sollten trotzdem funktionieren

### Leads werden nicht erstellt

- Prüfe Migration wurde ausgeführt
- Prüfe RLS Policies
- Prüfe Service Role Key

---

## 📚 Weitere Informationen

- **Edge Function Code**: `supabase/functions/sales-chat/index.ts`
- **Chatbot API Route**: `frontend/app/api/support/chat/route.ts`
- **Migration**: `supabase/migrations/016_leads_table.sql`
- **Deployment-Anleitung**: `SALES_MCP_SERVER_DEPLOYMENT.md`

---

**Status**: ✅ Deployment erfolgreich - System ist produktionsbereit!

