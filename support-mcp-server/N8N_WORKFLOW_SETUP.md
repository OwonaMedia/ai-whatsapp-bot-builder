# n8n Workflow Setup: Telegram Approval für AutoFix-Eingriffe

## Übersicht

Der n8n Workflow "Telegram Approval für AutoFix-Eingriffe" ermöglicht es, kritische AutoFix-Eingriffe (Hetzner-Befehle, Supabase-Migrationen, RLS-Policies) per Telegram zu genehmigen oder abzulehnen.

**Workflow ID:** `YElKFBy2dANe1oQE`

## Workflow-Struktur

### Flow 1: Approval Request (Webhook → Telegram)

1. **Webhook - Approval Request**
   - Endpoint: `/webhook/telegram-approval`
   - Methode: POST
   - Empfängt: `{ ticketId, instructionType, description, command?, sql? }`

2. **Format Telegram Message**
   - Formatiert die Nachricht mit Ticket-Details
   - Erstellt Inline-Keyboard mit "✅ Ja" und "❌ Nein" Buttons

3. **Send Telegram Message**
   - Sendet Nachricht an konfigurierten Telegram-Chat
   - Verwendet Telegram Bot API direkt (HTTP Request)

4. **Respond to Webhook**
   - Bestätigt erfolgreiche Übertragung

### Flow 2: Callback Handling (Telegram → Supabase)

1. **Telegram Trigger - Callback**
   - Wartet auf Callback-Queries (Button-Klicks)
   - Filter: `callback_query` Updates

2. **Parse Callback Data**
   - Extrahiert: `ticketId`, `instructionType`, `approved` (true/false)
   - Format: `approve:${ticketId}:${instructionType}` oder `reject:${ticketId}:${instructionType}`

3. **Answer Callback Query**
   - Bestätigt Button-Klick an Telegram
   - Verhindert erneutes Klicken

4. **Save to Supabase**
   - Speichert Antwort in `support_automation_events` Tabelle
   - Felder:
     - `ticket_id`: Ticket ID
     - `action_type`: `telegram_approval`
     - `payload`: `{ approved: boolean, instructionType: string, timestamp: string }`
     - `created_at`: Timestamp

5. **Notify Result**
   - Sendet Bestätigungsnachricht an Telegram
   - "✅ Eingriff wurde genehmigt..." oder "❌ Eingriff wurde abgelehnt..."

## Setup-Anleitung

### 1. Telegram Bot erstellen

1. Öffne Telegram und suche nach `@BotFather`
2. Sende `/newbot` und folge den Anweisungen
3. Speichere den **Bot Token** (z.B. `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
4. Optional: Setze Bot-Beschreibung mit `/setdescription`

### 2. Telegram Chat ID ermitteln

1. Sende eine Nachricht an deinen Bot
2. Öffne: `https://api.telegram.org/bot<BOT_TOKEN>/getUpdates`
3. Suche nach `"chat":{"id":123456789}` - das ist deine Chat ID
4. Alternativ: Nutze `@get_id_bot` auf Telegram

### 3. n8n Environment Variables konfigurieren

Füge folgende Variablen in n8n hinzu (Settings → Environment Variables):

```bash
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=123456789
```

### 4. Supabase Credentials konfigurieren

1. Öffne den "Save to Supabase" Node
2. Konfiguriere Supabase Credentials:
   - **Project URL**: `https://your-project.supabase.co`
   - **Service Role Key**: Dein Service Role Key (für Schreibzugriff)

### 5. Webhook URL konfigurieren

1. Aktiviere den Workflow in n8n
2. Kopiere die Webhook-URL aus dem "Webhook - Approval Request" Node
3. Format: `http://automat.owona.de/webhook/telegram-approval` oder `https://your-n8n-instance.com/webhook/telegram-approval`
4. Füge diese URL in die `.env`-Datei des support-mcp-server ein:
   ```
   N8N_WEBHOOK_URL=http://automat.owona.de/webhook/telegram-approval
   ```

### 6. Supabase Tabelle prüfen

Stelle sicher, dass die Tabelle `support_automation_events` existiert:

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
```

## Workflow aktivieren

1. Öffne den Workflow in n8n
2. Klicke auf "Active" Toggle (oben rechts)
3. Der Workflow ist jetzt aktiv und wartet auf:
   - Webhook-Anfragen (POST `/webhook/telegram-approval`)
   - Telegram Callback-Queries (Button-Klicks)

## Testen

### 1. Test Webhook-Anfrage

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
- Telegram-Nachricht mit "✅ Ja" und "❌ Nein" Buttons
- Webhook-Response: `{ "success": true, "message": "Telegram-Bestätigungsanfrage gesendet", "ticketId": "test-ticket-123" }`

### 2. Test Button-Klick

1. Klicke auf "✅ Ja" oder "❌ Nein" in Telegram
2. **Erwartetes Ergebnis:**
   - Callback-Query wird beantwortet
   - Eintrag in Supabase `support_automation_events`
   - Bestätigungsnachricht in Telegram

### 3. Prüfe Supabase Eintrag

```sql
SELECT * FROM support_automation_events 
WHERE ticket_id = 'test-ticket-123' 
ORDER BY created_at DESC 
LIMIT 1;
```

**Erwartetes Ergebnis:**
```json
{
  "ticket_id": "test-ticket-123",
  "action_type": "telegram_approval",
  "payload": {
    "approved": true,
    "instructionType": "hetzner-command",
    "timestamp": "2025-11-27T15:58:30.957Z"
  }
}
```

## Troubleshooting

### Problem: Telegram-Nachricht wird nicht gesendet

**Lösung:**
1. Prüfe `TELEGRAM_BOT_TOKEN` in n8n Environment Variables
2. Prüfe `TELEGRAM_CHAT_ID` in n8n Environment Variables
3. Teste Bot Token: `https://api.telegram.org/bot<TOKEN>/getMe`
4. Prüfe n8n Execution Logs für Fehler

### Problem: Callback-Query wird nicht empfangen

**Lösung:**
1. Prüfe ob Telegram Trigger aktiv ist
2. Prüfe ob `updates: ['callback_query']` korrekt konfiguriert ist
3. Prüfe Telegram Bot Webhook: `https://api.telegram.org/bot<TOKEN>/getWebhookInfo`
4. Setze Webhook manuell: `https://api.telegram.org/bot<TOKEN>/setWebhook?url=<N8N_WEBHOOK_URL>`

### Problem: Supabase Eintrag fehlt

**Lösung:**
1. Prüfe Supabase Credentials im "Save to Supabase" Node
2. Prüfe ob Tabelle `support_automation_events` existiert
3. Prüfe RLS-Policies (müssen Service Role Key erlauben)
4. Prüfe n8n Execution Logs für Fehler

### Problem: Workflow läuft nicht

**Lösung:**
1. Prüfe ob Workflow aktiviert ist (Active Toggle)
2. Prüfe n8n Health: `http://automat.owona.de/healthz`
3. Prüfe n8n Execution History
4. Prüfe n8n Logs für Fehler

## Integration mit Support-MCP-Server

Der `TelegramNotificationService` im support-mcp-server sendet automatisch Anfragen an diesen Workflow:

```typescript
await telegramNotificationService.sendApprovalRequest({
  ticketId: 'ticket-123',
  instructionType: 'hetzner-command',
  description: 'PM2 Restart',
  command: 'pm2 restart whatsapp-bot-builder'
});
```

Der Service wartet dann auf die Antwort in Supabase:

```typescript
const response = await telegramNotificationService.waitForApproval(
  'ticket-123',
  'hetzner-command',
  30 // Timeout in Minuten
);
```

## Sicherheit

- **Bot Token**: Niemals in Code committen, nur in Environment Variables
- **Chat ID**: Nur autorisierte Chat IDs sollten Nachrichten empfangen
- **Webhook URL**: Verwende HTTPS in Produktion
- **Supabase RLS**: Stelle sicher, dass nur Service Role Key schreiben kann

## Nächste Schritte

1. ✅ Workflow aktivieren
2. ✅ Environment Variables konfigurieren
3. ✅ Supabase Tabelle prüfen
4. ✅ Test-Request senden
5. ✅ Integration mit Support-MCP-Server testen





