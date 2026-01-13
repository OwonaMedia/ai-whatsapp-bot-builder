# Workflow YElKFBy2dANe1oQE - Aktivierungsbestätigung

**Datum:** 2025-11-27  
**Status:** ✅ **AKTIV**

---

## ✅ Erfolgreich aktiviert

Der Workflow "Telegram Approval für AutoFix-Eingriffe WhatsApp.owona.de" ist erfolgreich aktiviert.

### Workflow-Details

- **ID:** `YElKFBy2dANe1oQE`
- **Name:** Telegram Approval für AutoFix-Eingriffe WhatsApp.owona.de
- **Status:** Active
- **Erstellt:** 2025-11-27T15:58:30.957Z
- **Zuletzt aktualisiert:** 2025-11-27T16:42:07.000Z

### Behobene Fehler

1. ✅ **Supabase Node:** Operation von `insert` auf `create` geändert
2. ✅ **Webhook Node:** Error-Handling hinzugefügt (`onError: "continueRegularOutput"`)
3. ✅ **Supabase Credentials:** Konfiguriert und zugewiesen

### System-Status

- **Supabase Tabelle:** `support_automation_events` existiert (48 Einträge vorhanden)
- **Webhook-Endpoint:** `/webhook/telegram-approval` aktiv
- **Telegram Trigger:** Callback-Handling aktiv

---

## 🧪 Test-Anleitung

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
- ✅ HTTP 200 Response: `{ "success": true, "message": "Telegram-Bestätigungsanfrage gesendet", "ticketId": "test-ticket-123" }`
- ✅ Telegram-Nachricht mit "✅ Ja" und "❌ Nein" Buttons

### 2. Test Button-Klick

1. Klicke auf "✅ Ja" oder "❌ Nein" in Telegram
2. **Erwartetes Ergebnis:**
   - ✅ Callback-Query wird beantwortet
   - ✅ Eintrag in Supabase `support_automation_events`
   - ✅ Bestätigungsnachricht in Telegram

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
    "timestamp": "2025-11-27T..."
  }
}
```

---

## ⚠️ Noch zu prüfen

### Environment Variables in n8n

Prüfe ob folgende Variablen in n8n konfiguriert sind:
- `TELEGRAM_BOT_TOKEN` - Telegram Bot Token
- `TELEGRAM_CHAT_ID` - Telegram Chat ID

**Prüfung:**
1. n8n öffnen: http://automat.owona.de
2. Settings → Environment Variables
3. Prüfe ob beide Variablen vorhanden sind

### Supabase Credentials

Prüfe ob Supabase Credentials im "Save to Supabase" Node zugewiesen sind:
1. Workflow öffnen: `YElKFBy2dANe1oQE`
2. Node "Save to Supabase" öffnen
3. Prüfe: **Credential for Supabase** ist ausgewählt

**Details:** Siehe `N8N_SUPABASE_CREDENTIALS.md`

---

## 📊 Workflow-Struktur

### Flow 1: Approval Request (Webhook → Telegram)
1. **Webhook - Approval Request** → `/webhook/telegram-approval`
2. **Format Telegram Message** → Formatiert Nachricht mit Buttons
3. **Send Telegram Message** → Sendet an Telegram
4. **Respond to Webhook** → Bestätigt erfolgreiche Übertragung

### Flow 2: Callback Handling (Telegram → Supabase)
1. **Telegram Trigger - Callback** → Empfängt Button-Klicks
2. **Parse Callback Data** → Extrahiert ticketId, approved, instructionType
3. **Answer Callback Query** → Bestätigt Button-Klick
4. **Save to Supabase** → Speichert in `support_automation_events`
5. **Notify Result** → Sendet Bestätigungsnachricht

---

## 🔗 Integration mit Support-MCP-Server

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
  30 * 60 * 1000 // Timeout: 30 Minuten
);
```

---

## 📝 Nächste Schritte

1. ✅ Workflow aktiviert
2. ⏳ Environment Variables prüfen (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`)
3. ⏳ Supabase Credentials prüfen
4. ⏳ Test-Request senden
5. ⏳ End-to-End-Test durchführen
6. ⏳ Integration mit Support-MCP-Server testen

---

**Erstellt:** 2025-11-27  
**Workflow ID:** YElKFBy2dANe1oQE

