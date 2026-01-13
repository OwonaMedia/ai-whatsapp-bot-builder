# Supabase Credentials für n8n Workflow

## Für den Supabase Node im Workflow YElKFBy2dANe1oQE

### Benötigte Credentials

1. **Project URL:**
   ```
   https://ugsezgnkyhcmsdpohuwf.supabase.co
   ```

2. **Service Role Key** (für Schreibzugriff auf `support_automation_events`)
   - ⚠️ **WICHTIG:** Verwende den **Service Role Key**, nicht den Anon Key!
   - Der Service Role Key umgeht Row Level Security (RLS) und ermöglicht Schreibzugriff

### Wo finde ich den Service Role Key?

1. Öffne Supabase Dashboard: https://supabase.com/dashboard
2. Wähle Projekt: `ugsezgnkyhcmsdpohuwf`
3. Gehe zu: **Settings** → **API**
4. Unter **Project API keys** findest du:
   - **anon** `public` key (nicht verwenden)
   - **service_role** `secret` key ← **DIESEN VERWENDEN**

### n8n Credentials konfigurieren

1. Öffne n8n: http://automat.owona.de
2. Gehe zu: **Credentials** → **New**
3. Wähle: **Supabase**
4. Fülle aus:
   - **Name:** `Supabase WhatsApp Bot Builder`
   - **Host:** `https://ugsezgnkyhcmsdpohuwf.supabase.co`
   - **Service Role Secret:** `[Service Role Key hier eintragen]`
5. **Save**

### Im Workflow zuweisen

1. Öffne Workflow: `YElKFBy2dANe1oQE`
2. Klicke auf Node: **"Save to Supabase"**
3. Unter **Credential for Supabase** wähle: `Supabase WhatsApp Bot Builder`
4. **Save** Workflow

### Sicherheitshinweise

⚠️ **WICHTIG:**
- **Service Role Key niemals in Code committen!**
- **Service Role Key nur in n8n Credentials speichern!**
- **Service Role Key hat volle Datenbankrechte - sicher verwahren!**
- **Nur für Server-seitige Anwendungen verwenden!**

### Testen

Nach Konfiguration kannst du testen:

```bash
curl -X POST http://automat.owona.de/webhook/telegram-approval \
  -H "Content-Type: application/json" \
  -d '{
    "ticketId": "test-ticket-123",
    "instructionType": "hetzner-command",
    "description": "PM2 Restart Test",
    "command": "pm2 restart whatsapp-bot-builder"
  }'
```

**Erwartetes Ergebnis:**
- Telegram-Nachricht wird gesendet
- Nach Button-Klick wird Eintrag in `support_automation_events` erstellt

### Prüfen ob Tabelle existiert

```sql
-- In Supabase SQL Editor ausführen:
SELECT * FROM support_automation_events LIMIT 5;
```

Falls Tabelle nicht existiert, erstelle sie:

```sql
CREATE TABLE IF NOT EXISTS support_automation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id),
  action_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_automation_events_ticket_id 
  ON support_automation_events(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_automation_events_action_type 
  ON support_automation_events(action_type);
CREATE INDEX IF NOT EXISTS idx_support_automation_events_created_at 
  ON support_automation_events(created_at);

-- RLS Policy für Service Role (umgeht RLS)
-- Service Role Key hat automatisch Bypass-Rechte
```

---

**Erstellt:** 2025-11-27  
**Projekt:** WhatsApp Bot Builder  
**Workflow:** YElKFBy2dANe1oQE

