# Environment Variables Prüfung für n8n Workflow

**Workflow:** YElKFBy2dANe1oQE  
**Datum:** 2025-11-27

---

## Benötigte Environment Variables

Der Workflow verwendet folgende Environment Variables:

1. **`TELEGRAM_BOT_TOKEN`** - Telegram Bot Token
2. **`TELEGRAM_CHAT_ID`** - Telegram Chat ID

### Verwendung im Workflow

Die Variablen werden in folgenden Nodes verwendet:
- **Send Telegram Message** (Zeile 1): `{{ $env.TELEGRAM_BOT_TOKEN }}` und `{{ $env.TELEGRAM_CHAT_ID }}`
- **Answer Callback Query** (Zeile 1): `{{ $env.TELEGRAM_BOT_TOKEN }}`
- **Notify Result** (Zeile 1): `{{ $env.TELEGRAM_BOT_TOKEN }}`

---

## Prüfung in n8n

### Schritt 1: n8n öffnen
1. Öffne: http://automat.owona.de
2. Logge dich ein

### Schritt 2: Environment Variables prüfen
1. Klicke auf **Settings** (oben rechts, Zahnrad-Icon)
2. Wähle **Environment Variables** aus dem Menü
3. Prüfe ob folgende Variablen vorhanden sind:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`

### Schritt 3: Variablen-Werte prüfen

**TELEGRAM_BOT_TOKEN:**
- Format: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`
- Sollte mit Zahlen beginnen, gefolgt von Doppelpunkt und alphanumerischen Zeichen
- Länge: ca. 40-50 Zeichen

**TELEGRAM_CHAT_ID:**
- Format: Zahl (z.B. `123456789` oder `-1001234567890` für Gruppen)
- Kann negativ sein für Gruppen-Chats

---

## Falls Variablen fehlen

### Telegram Bot Token erstellen

1. Öffne Telegram
2. Suche nach `@BotFather`
3. Sende `/newbot`
4. Folge den Anweisungen:
   - Bot-Name eingeben
   - Bot-Username eingeben (muss auf `bot` enden)
5. BotFather sendet dir den **Bot Token**
6. Kopiere den Token

### Telegram Chat ID ermitteln

**Methode 1: Über Bot**
1. Sende eine Nachricht an deinen Bot
2. Öffne: `https://api.telegram.org/bot<BOT_TOKEN>/getUpdates`
3. Suche nach `"chat":{"id":123456789}` - das ist deine Chat ID

**Methode 2: Über @get_id_bot**
1. Öffne Telegram
2. Suche nach `@get_id_bot`
3. Starte den Bot mit `/start`
4. Der Bot sendet dir deine Chat ID

### Variablen in n8n hinzufügen

1. In n8n: **Settings** → **Environment Variables**
2. Klicke auf **Add Variable**
3. Fülle aus:
   - **Name:** `TELEGRAM_BOT_TOKEN`
   - **Value:** `[Dein Bot Token]`
4. Klicke auf **Save**
5. Wiederhole für `TELEGRAM_CHAT_ID`

---

## Test der Environment Variables

### Test 1: Bot Token prüfen

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
    "first_name": "Dein Bot Name",
    "username": "dein_bot_username"
  }
}
```

### Test 2: Chat ID prüfen

```bash
curl https://api.telegram.org/bot<DEIN_BOT_TOKEN>/getUpdates
```

**Erwartetes Ergebnis:**
- Liste von Updates mit `"chat":{"id":...}` Einträgen
- Deine Chat ID sollte in den Updates erscheinen

---

## Troubleshooting

### Problem: Environment Variable wird nicht erkannt

**Lösung:**
1. Prüfe ob Variable korrekt geschrieben ist (Großbuchstaben, Unterstriche)
2. Prüfe ob Variable gespeichert wurde (Seite neu laden)
3. Prüfe ob Workflow neu geladen wurde nach Variablen-Änderung
4. Prüfe n8n Logs für Fehler

### Problem: Bot Token funktioniert nicht

**Lösung:**
1. Prüfe ob Token korrekt kopiert wurde (keine Leerzeichen)
2. Prüfe ob Bot noch aktiv ist: `https://api.telegram.org/bot<TOKEN>/getMe`
3. Erstelle neuen Bot Token über BotFather falls nötig

### Problem: Chat ID funktioniert nicht

**Lösung:**
1. Prüfe ob Chat ID korrekt ist (Zahl, kann negativ sein)
2. Prüfe ob Bot Nachrichten an diese Chat ID senden kann
3. Sende Test-Nachricht an Bot und prüfe Updates

---

## Nächste Schritte

Nach Prüfung der Environment Variables:
1. ✅ Environment Variables prüfen
2. ⏳ Test-Request senden
3. ⏳ Telegram-Nachricht prüfen
4. ⏳ Button-Klick testen
5. ⏳ Supabase Eintrag prüfen

---

**Erstellt:** 2025-11-27  
**Workflow ID:** YElKFBy2dANe1oQE

