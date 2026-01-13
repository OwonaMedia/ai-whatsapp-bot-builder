# Ticket-Lösung: PM2 Restart Pattern hinzugefügt

**Datum:** 2025-11-27  
**Ticket ID:** `e8e0e5dc-82ad-402f-bc5a-cb83ed70d21b`

---

## ✅ Problem gelöst

**Root Cause:** Es gab kein Pattern in `autopatchPatterns.ts`, das "PM2 Restart" oder "Hetzner-Befehl" in der Ticket-Beschreibung erkannt hat.

**Lösung:** Pattern `pm2-restart-required` wurde hinzugefügt.

---

## 🔧 Was wurde geändert

**Datei:** `src/services/actions/autopatchPatterns.ts`

**Neues Pattern:**
- **ID:** `pm2-restart-required`
- **Erkennt:** 
  - "PM2 restart" / "PM2 neu starten"
  - "Hetzner restart" / "Server-Befehl"
  - "Bot reagiert nicht" / "Bot läuft nicht"
- **Erstellt:** `hetzner-command` AutoFix-Instruction
- **Erfordert Bestätigung:** ✅ Ja (Telegram Approval)

---

## 📋 Nächste Schritte

### 1. Support-MCP-Server neu starten

**Auf dem Server:**
```bash
cd /var/www/whatsapp-bot-builder/products/ai-whatsapp-bot-builder/support-mcp-server
pm2 restart support-mcp-server
```

**Oder lokal (wenn auf Server deployed):**
```bash
# Code deployen
git add src/services/actions/autopatchPatterns.ts
git commit -m "Add PM2 restart pattern for AutoFix"
git push

# Auf Server: Code pullen und neu starten
```

### 2. Ticket-Status erneut auf `new` setzen

```sql
UPDATE support_tickets 
SET status = 'new' 
WHERE id = 'e8e0e5dc-82ad-402f-bc5a-cb83ed70d21b';
```

### 3. Warten auf AutoFix

- **TicketRouter** erkennt Ticket beim nächsten Polling (max. 30 Sekunden)
- **AutoFix** erkennt jetzt Pattern `pm2-restart-required`
- **Hetzer-Befehl** wird erstellt: `pm2 restart whatsapp-bot-builder`
- **Telegram-Bestätigung** wird angefordert
- **Du erhältst Telegram-Nachricht** mit "✅ Ja" / "❌ Nein" Buttons

---

## 🎯 Erwartetes Ergebnis

1. ✅ Pattern wird erkannt
2. ✅ AutoFix-Instruction: `hetzner-command` mit `pm2 restart whatsapp-bot-builder`
3. ✅ Telegram-Bestätigung wird angefordert
4. ✅ Telegram-Nachricht kommt
5. ✅ Button-Klick → Supabase Eintrag
6. ✅ Befehl wird ausgeführt (nach Bestätigung)
7. ✅ Ticket wird gelöst

---

## 📝 Pattern-Details

**Erkannte Keywords:**
- `pm2` + `restart` / `neu starten` / `neustart`
- `hetzner` + `restart`
- `bot` + `reagiert nicht` / `läuft nicht` / `hängt`

**Erkannte App-Namen:**
- `whatsapp-bot-builder` (Standard)
- `support-mcp-server`
- `n8n`
- Oder aus Text extrahiert

**AutoFix-Instruction:**
```typescript
{
  type: 'hetzner-command',
  command: 'pm2 restart whatsapp-bot-builder',
  description: 'PM2 Prozess "whatsapp-bot-builder" neu starten - Bot reagiert nicht mehr',
  requiresApproval: true,
  whitelistCheck: true,
}
```

---

**Status:** ✅ **PATTERN HINZUGEFÜGT - BEREIT FÜR TEST**

