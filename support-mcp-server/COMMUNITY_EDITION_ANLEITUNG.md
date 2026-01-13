# Community Edition Setup - Schritt-für-Schritt Anleitung

**Datum:** 2025-11-27  
**Workflow:** YElKFBy2dANe1oQE

---

## ✅ Workflow wurde angepasst

Der Workflow wurde für die n8n Community Edition angepasst. Die Telegram-API-Aufrufe werden jetzt direkt in Code Nodes gemacht, da Environment Variables nicht verfügbar sind.

---

## 📋 Was du jetzt tun musst

### Schritt 1: Telegram Bot Token und Chat ID ermitteln

1. **Bot Token:**
   - Öffne Telegram → `@BotFather`
   - Sende `/mybots` → Wähle deinen Bot
   - Kopiere den **Bot Token** (z.B. `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

2. **Chat ID:**
   - Sende eine Nachricht an deinen Bot
   - Öffne: `https://api.telegram.org/bot<BOT_TOKEN>/getUpdates`
   - Suche nach `"chat":{"id":123456789}` - das ist deine Chat ID
   - Alternativ: Nutze `@get_id_bot` auf Telegram

### Schritt 2: Workflow in n8n bearbeiten

1. Öffne n8n: http://automat.owona.de
2. Öffne Workflow: `YElKFBy2dANe1oQE`
3. Bearbeite die folgenden **3 Nodes**:

---

#### Node 1: "Format Telegram Message"

1. Klicke auf den Node "Format Telegram Message"
2. Im Code-Editor, suche nach:
   ```javascript
   const TELEGRAM_BOT_TOKEN = 'DEIN_BOT_TOKEN_HIER';
   const TELEGRAM_CHAT_ID = 'DEIN_CHAT_ID_HIER';
   ```
3. Ersetze mit deinen echten Werten:
   ```javascript
   const TELEGRAM_BOT_TOKEN = '123456789:ABCdefGHIjklMNOpqrsTUVwxyz';
   const TELEGRAM_CHAT_ID = '123456789';
   ```
4. Klicke auf **Execute Node** (optional, zum Testen)
5. Klicke auf **Save**

---

#### Node 2: "Answer Callback Query"

1. Klicke auf den Node "Answer Callback Query"
2. Im Code-Editor, suche nach:
   ```javascript
   const TELEGRAM_BOT_TOKEN = 'DEIN_BOT_TOKEN_HIER';
   ```
3. Ersetze mit deinem echten Wert:
   ```javascript
   const TELEGRAM_BOT_TOKEN = '123456789:ABCdefGHIjklMNOpqrsTUVwxyz';
   ```
4. Klicke auf **Save**

---

#### Node 3: "Notify Result"

1. Klicke auf den Node "Notify Result"
2. Im Code-Editor, suche nach:
   ```javascript
   const TELEGRAM_BOT_TOKEN = 'DEIN_BOT_TOKEN_HIER';
   ```
3. Ersetze mit deinem echten Wert:
   ```javascript
   const TELEGRAM_BOT_TOKEN = '123456789:ABCdefGHIjklMNOpqrsTUVwxyz';
   ```
4. Klicke auf **Save**

---

### Schritt 3: Workflow speichern und aktivieren

1. Klicke auf **Save** (oder Strg+S / Cmd+S)
2. Aktiviere den Workflow (Toggle oben rechts: "Active")

---

## 🧪 Test

Nach dem Setup, teste den Workflow:

```bash
curl -X POST https://automat.owona.de/webhook/telegram-approval \
  -H "Content-Type: application/json" \
  -d '{
    "ticketId": "test-community-edition",
    "instructionType": "hetzner-command",
    "description": "Test Community Edition Setup",
    "command": "pm2 restart whatsapp-bot-builder"
  }'
```

**Erwartetes Ergebnis:**
- ✅ HTTP 200
- ✅ Response: `{"success": true, "message": "Telegram-Bestätigungsanfrage gesendet", "ticketId": "test-community-edition"}`
- ✅ Telegram-Nachricht mit "✅ Ja" und "❌ Nein" Buttons

---

## ⚠️ Wichtige Hinweise

1. **Sicherheit:** Die Telegram-Daten sind jetzt im Workflow-Code gespeichert
   - ✅ Workflow ist nur für dich sichtbar (Personal Project)
   - ⚠️ Niemals Workflow-Code öffentlich teilen
   - ⚠️ Regelmäßig Bot Token rotieren

2. **Node-Typen:** Die Nodes "Answer Callback Query" und "Notify Result" sind jetzt Code Nodes (nicht mehr HTTP Request Nodes)

3. **"Send Telegram Message" Node:** Dieser Node wurde entfernt, da die Telegram-Nachricht jetzt direkt im "Format Telegram Message" Node gesendet wird

---

## 🔧 Troubleshooting

### Problem: "Telegram API Fehler: 401"

**Lösung:** Bot Token ist falsch oder ungültig
- Prüfe Bot Token in allen 3 Nodes
- Stelle sicher, dass der Token vollständig ist (inkl. Doppelpunkt)

### Problem: "Telegram API Fehler: 400 - chat not found"

**Lösung:** Chat ID ist falsch
- Prüfe Chat ID im "Format Telegram Message" Node
- Stelle sicher, dass du eine Nachricht an den Bot gesendet hast

### Problem: Workflow läuft nicht

**Lösung:**
1. Prüfe ob Workflow aktiviert ist (Active Toggle)
2. Prüfe n8n Execution History für Fehler
3. Prüfe ob alle 3 Nodes korrekt konfiguriert sind

---

**Erstellt:** 2025-11-27  
**Workflow ID:** YElKFBy2dANe1oQE

