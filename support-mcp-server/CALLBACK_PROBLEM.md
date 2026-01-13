# Callback-Problem identifiziert und behoben

**Datum:** 2025-11-27  
**Problem:** Callback-Queries werden empfangen, aber `answerCallbackQuery` schlägt fehl

---

## 🔍 Problem-Analyse

### Was funktioniert:
1. ✅ Telegram Trigger empfängt Callback-Queries
2. ✅ Parse Callback Data extrahiert Daten korrekt
3. ✅ Workflow läuft durch

### Was nicht funktioniert:
1. ❌ `answerCallbackQuery` schlägt fehl mit:
   - "Bad Request: query is too old and response timeout expired or query ID is invalid"
   - Problem: `callback_query_id` wird falsch formatiert

### Root Cause:
- `callback_query_id` wird als Zahl interpretiert und möglicherweise gerundet
- Telegram erwartet exakte String-Übergabe
- JSON-Expression `{{ $json.callbackQueryId }}` formatiert große Zahlen falsch

---

## ✅ Lösung

### Fix 1: Answer Callback Query Node
**Vorher:**
```json
{
  "callback_query_id": {{ $json.callbackQueryId }},
  "text": "{{ $json.approved ? \"✅ Eingriff genehmigt\" : \"❌ Eingriff abgelehnt\" }}",
  "show_alert": false
}
```

**Nachher:**
```json
{{ JSON.stringify({
  "callback_query_id": String($json.callbackQueryId),
  "text": $json.approved ? "✅ Eingriff genehmigt" : "❌ Eingriff abgelehnt",
  "show_alert": false
}) }}
```

### Fix 2: Notify Result Node
**Vorher:**
```json
{
  "chat_id": {{ $json.chatId }},
  "text": "{{ $json.approved ? \"✅ Eingriff wurde genehmigt...\" : \"❌ Eingriff wurde abgelehnt...\" }}",
  "parse_mode": "Markdown"
}
```

**Nachher:**
```json
{{ JSON.stringify({
  "chat_id": String($json.chatId),
  "text": $json.approved ? "✅ Eingriff wurde genehmigt und wird ausgeführt." : "❌ Eingriff wurde abgelehnt. Alternative Lösungen werden erarbeitet.",
  "parse_mode": "Markdown"
}) }}
```

---

## 🧪 Test

Nach dem Fix:
1. Sende Test-Request
2. Klicke auf "✅ Ja" oder "❌ Nein" in Telegram
3. **Erwartetes Ergebnis:**
   - ✅ Callback-Query wird beantwortet
   - ✅ Supabase Eintrag wird erstellt
   - ✅ Bestätigungsnachricht wird gesendet

---

**Status:** ✅ **BEHOBEN**

