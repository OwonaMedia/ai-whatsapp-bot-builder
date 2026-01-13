# Test-Ergebnis: Workflow YElKFBy2dANe1oQE

**Datum:** 2025-11-27  
**Test-Zeitpunkt:** 16:45 UTC

---

## Test-Request gesendet

```bash
curl -X POST https://automat.owona.de/webhook/telegram-approval \
  -H "Content-Type: application/json" \
  -d '{
    "ticketId": "test-ticket-123",
    "instructionType": "hetzner-command",
    "description": "PM2 Restart Test",
    "command": "pm2 restart whatsapp-bot-builder"
  }'
```

**HTTP Status:** ✅ 200 OK  
**Response:** Leer (0 bytes)

---

## Execution-Status

**Letzte 2 Executions:**
- Execution ID: `39248` - Status: `error` (16:45:45 UTC)
- Execution ID: `39247` - Status: `error` (16:45:41 UTC)

**Beide Executions sind fehlgeschlagen!**

---

## Mögliche Fehlerursachen

### 1. Environment Variables fehlen

**Symptom:** Workflow kann `TELEGRAM_BOT_TOKEN` oder `TELEGRAM_CHAT_ID` nicht finden

**Prüfung:**
1. Öffne n8n: http://automat.owona.de
2. Settings → Environment Variables
3. Prüfe ob vorhanden:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`

**Lösung:**
- Falls fehlend: Siehe `ENV_VARIABLES_PRÜFUNG.md`

### 2. Telegram Bot Token ungültig

**Symptom:** Telegram API gibt Fehler zurück

**Prüfung:**
```bash
curl https://api.telegram.org/bot<DEIN_BOT_TOKEN>/getMe
```

**Erwartetes Ergebnis:**
```json
{
  "ok": true,
  "result": {
    "id": 123456789,
    "is_bot": true,
    "first_name": "...",
    "username": "..."
  }
}
```

**Falls `"ok": false`:**
- Bot Token ist ungültig
- Erstelle neuen Token über BotFather

### 3. Telegram Chat ID ungültig

**Symptom:** Telegram kann Nachricht nicht senden

**Prüfung:**
1. Sende Test-Nachricht an Bot
2. Prüfe Updates: `https://api.telegram.org/bot<TOKEN>/getUpdates`
3. Suche nach `"chat":{"id":...}`

### 4. Supabase Credentials fehlen

**Symptom:** "Save to Supabase" Node schlägt fehl

**Prüfung:**
1. Workflow öffnen: `YElKFBy2dANe1oQE`
2. Node "Save to Supabase" öffnen
3. Prüfe: **Credential for Supabase** ist ausgewählt

**Lösung:**
- Siehe `N8N_SUPABASE_CREDENTIALS.md`

---

## Nächste Schritte

1. ✅ Test-Request gesendet
2. ⏳ Execution-Details prüfen (in n8n UI)
3. ⏳ Environment Variables prüfen
4. ⏳ Telegram Bot Token testen
5. ⏳ Telegram Chat ID prüfen
6. ⏳ Supabase Credentials prüfen
7. ⏳ Erneut testen

---

## Detaillierte Fehleranalyse

Um die genaue Fehlerursache zu finden:

1. **Öffne n8n:** http://automat.owona.de
2. **Gehe zu:** Workflows → YElKFBy2dANe1oQE
3. **Klicke auf:** "Executions" Tab
4. **Öffne:** Execution ID `39248` oder `39247`
5. **Prüfe:** Welcher Node ist fehlgeschlagen?
6. **Prüfe:** Fehlermeldung im Node

**Häufige Fehlermeldungen:**

- `Environment variable 'TELEGRAM_BOT_TOKEN' is not set`
  - → Environment Variable fehlt
- `401 Unauthorized` (Telegram API)
  - → Bot Token ungültig
- `400 Bad Request: chat not found` (Telegram API)
  - → Chat ID ungültig
- `Supabase credentials not configured`
  - → Supabase Credentials fehlen

---

**Erstellt:** 2025-11-27  
**Workflow ID:** YElKFBy2dANe1oQE

