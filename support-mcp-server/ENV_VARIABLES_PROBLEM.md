# Environment Variables Problem: TELEGRAM_BOT_TOKEN wird nicht aufgelöst

**Datum:** 2025-11-27  
**Problem:** Environment Variable `TELEGRAM_BOT_TOKEN` wird nicht korrekt aufgelöst

---

## 🔍 Problem-Analyse

### Fehler in Execution

**Execution ID:** 39257, 39258  
**Fehler:** `404 - Not Found`  
**URL:** `https://api.telegram.org/bot/sendMessage` (Token fehlt!)

**Erwartete URL:** `https://api.telegram.org/bot<TOKEN>/sendMessage`  
**Tatsächliche URL:** `https://api.telegram.org/bot/sendMessage`

### Ursache

Die Environment Variable `TELEGRAM_BOT_TOKEN` wird nicht korrekt aufgelöst. Mögliche Gründe:

1. **Variable nicht gesetzt** - Variable existiert nicht in n8n
2. **Falscher Name** - Variable heißt anders (z.B. `TELEGRAM_TOKEN` statt `TELEGRAM_BOT_TOKEN`)
3. **Syntax-Problem** - Expression-Syntax in n8n falsch
4. **Workflow-Neustart** - Workflow muss nach Variablen-Änderung neu geladen werden

---

## ✅ Lösung

### Schritt 1: Environment Variables in n8n prüfen

1. Öffne n8n: http://automat.owona.de
2. **Settings** → **Environment Variables**
3. Prüfe ob vorhanden:
   - `TELEGRAM_BOT_TOKEN` (exakter Name!)
   - `TELEGRAM_CHAT_ID` (exakter Name!)

### Schritt 2: Variablen-Namen prüfen

**WICHTIG:** Die Variablen müssen exakt so heißen:
- `TELEGRAM_BOT_TOKEN` (nicht `TELEGRAM_TOKEN`, nicht `BOT_TOKEN`)
- `TELEGRAM_CHAT_ID` (nicht `CHAT_ID`, nicht `TELEGRAM_CHAT`)

### Schritt 3: Workflow neu laden

Nach Änderung der Environment Variables:
1. Workflow deaktivieren
2. Workflow speichern
3. Workflow wieder aktivieren

Oder:
1. n8n neu starten (falls möglich)

### Schritt 4: Expression-Syntax prüfen

Die Expression im Workflow verwendet:
```
{{ $env.TELEGRAM_BOT_TOKEN }}
```

**Alternative Syntax (falls nötig):**
```
{{ $env['TELEGRAM_BOT_TOKEN'] }}
```

---

## 🧪 Test

Nach Korrektur der Environment Variables:

```bash
curl -X POST https://automat.owona.de/webhook/telegram-approval \
  -H "Content-Type: application/json" \
  -d '{
    "ticketId": "test-env-fixed",
    "instructionType": "hetzner-command",
    "description": "Test nach Environment Variables Fix",
    "command": "pm2 restart whatsapp-bot-builder"
  }'
```

**Erwartetes Ergebnis:**
- ✅ HTTP 200
- ✅ Response: `{"success": true, "message": "Telegram-Bestätigungsanfrage gesendet", "ticketId": "test-env-fixed"}`
- ✅ Telegram-Nachricht mit Buttons

**Falls weiterhin Fehler:**
- Prüfe Execution-Details in n8n
- Prüfe ob URL jetzt Token enthält: `https://api.telegram.org/bot<TOKEN>/sendMessage`

---

## 📋 Checkliste

- [ ] Environment Variables in n8n prüfen
- [ ] Variablen-Namen exakt prüfen (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`)
- [ ] Workflow neu laden/aktivieren
- [ ] Test-Request senden
- [ ] Execution-Details prüfen
- [ ] URL in Execution prüfen (sollte Token enthalten)

---

**Erstellt:** 2025-11-27  
**Workflow ID:** YElKFBy2dANe1oQE

