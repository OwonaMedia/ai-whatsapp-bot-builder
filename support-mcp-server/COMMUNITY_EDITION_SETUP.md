# n8n Community Edition Setup - Telegram Approval Workflow

**Datum:** 2025-11-27  
**Problem:** n8n Community Edition hat keine Environment Variables

---

## ⚠️ Wichtig: Community Edition Limitation

Die n8n Community Edition unterstützt **keine Environment Variables**. Daher müssen die Telegram-Daten direkt in den Code Nodes eingetragen werden.

---

## 🔧 Lösung: Telegram-Daten in Code Nodes

Die Telegram-Daten müssen direkt in den Code Nodes eingetragen werden:

### 1. Format Telegram Message Node

In diesem Node müssen die Telegram-Daten eingetragen werden:

```javascript
const TELEGRAM_BOT_TOKEN = 'DEIN_BOT_TOKEN_HIER'; // z.B. '123456789:ABCdefGHIjklMNOpqrsTUVwxyz'
const TELEGRAM_CHAT_ID = 'DEIN_CHAT_ID_HIER'; // z.B. '123456789'
```

### 2. Answer Callback Query Node

In diesem Node muss der Bot Token eingetragen werden:

```javascript
const TELEGRAM_BOT_TOKEN = 'DEIN_BOT_TOKEN_HIER';
```

### 3. Notify Result Node

In diesem Node muss der Bot Token eingetragen werden:

```javascript
const TELEGRAM_BOT_TOKEN = 'DEIN_BOT_TOKEN_HIER';
```

---

## 📋 Setup-Anleitung

### Schritt 1: Telegram Bot Token ermitteln

1. Öffne Telegram und suche nach `@BotFather`
2. Sende `/mybots` und wähle deinen Bot
3. Kopiere den **Bot Token** (z.B. `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### Schritt 2: Telegram Chat ID ermitteln

1. Sende eine Nachricht an deinen Bot
2. Öffne: `https://api.telegram.org/bot<BOT_TOKEN>/getUpdates`
3. Suche nach `"chat":{"id":123456789}` - das ist deine Chat ID
4. Alternativ: Nutze `@get_id_bot` auf Telegram

### Schritt 3: Workflow bearbeiten

1. Öffne n8n: http://automat.owona.de
2. Öffne Workflow: `YElKFBy2dANe1oQE`
3. Bearbeite die folgenden Nodes:

#### Node: "Format Telegram Message"

1. Öffne den Node
2. Im Code, ersetze:
   ```javascript
   const TELEGRAM_BOT_TOKEN = 'DEIN_BOT_TOKEN_HIER';
   const TELEGRAM_CHAT_ID = 'DEIN_CHAT_ID_HIER';
   ```
3. Mit deinen echten Werten:
   ```javascript
   const TELEGRAM_BOT_TOKEN = '123456789:ABCdefGHIjklMNOpqrsTUVwxyz';
   const TELEGRAM_CHAT_ID = '123456789';
   ```

#### Node: "Answer Callback Query"

1. Öffne den Node
2. Im Code, ersetze:
   ```javascript
   const TELEGRAM_BOT_TOKEN = 'DEIN_BOT_TOKEN_HIER';
   ```
3. Mit deinem echten Wert:
   ```javascript
   const TELEGRAM_BOT_TOKEN = '123456789:ABCdefGHIjklMNOpqrsTUVwxyz';
   ```

#### Node: "Notify Result"

1. Öffne den Node
2. Im Code, ersetze:
   ```javascript
   const TELEGRAM_BOT_TOKEN = 'DEIN_BOT_TOKEN_HIER';
   ```
3. Mit deinem echten Wert:
   ```javascript
   const TELEGRAM_BOT_TOKEN = '123456789:ABCdefGHIjklMNOpqrsTUVwxyz';
   ```

### Schritt 4: Workflow speichern und aktivieren

1. Klicke auf **Save** (oder Strg+S)
2. Aktiviere den Workflow (Toggle oben rechts)

---

## 🧪 Test

Nach dem Setup:

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

## 🔒 Sicherheit

**WICHTIG:** Die Telegram-Daten sind jetzt im Workflow-Code gespeichert!

- ✅ Workflow ist nur für dich sichtbar (Personal Project)
- ⚠️ Niemals Workflow-Code öffentlich teilen
- ⚠️ Regelmäßig Bot Token rotieren
- ⚠️ Nur autorisierte Personen haben Zugriff auf n8n

---

## 📝 Alternative: Workflow-Variablen (n8n Pro/Enterprise)

Falls du später auf n8n Pro/Enterprise upgradest, kannst du die Daten in Environment Variables verschieben:

1. Settings → Environment Variables
2. Füge `TELEGRAM_BOT_TOKEN` und `TELEGRAM_CHAT_ID` hinzu
3. Ersetze in Code Nodes: `const TELEGRAM_BOT_TOKEN = $env.TELEGRAM_BOT_TOKEN;`

---

**Erstellt:** 2025-11-27  
**Workflow ID:** YElKFBy2dANe1oQE

