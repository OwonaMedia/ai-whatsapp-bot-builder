# Ticket-Status: WhatsApp Bot läuft nicht - PM2 Restart erforderlich

**Datum:** 2025-11-27 17:44:20 UTC  
**Ticket ID:** `e8e0e5dc-82ad-402f-bc5a-cb83ed70d21b`

---

## ✅ Ticket erstellt

**Status:** `waiting_customer`  
**Kategorie:** `bug`  
**Priorität:** `high`

**Titel:** WhatsApp Bot läuft nicht - PM2 Restart erforderlich

**Beschreibung:**
```
Der WhatsApp Bot auf whatsapp.owona.de reagiert nicht mehr auf Nachrichten.
Der PM2 Prozess scheint hängen geblieben zu sein. Ein Neustart des Prozesses
ist erforderlich, um die Verbindung wiederherzustellen.

Problem:
- Bot antwortet nicht auf Nachrichten
- PM2 Status zeigt möglicherweise "errored" oder "stopped"
- Logs zeigen keine neuen Einträge

Lösung:
PM2 Prozess "whatsapp-bot-builder" neu starten
```

---

## ⚠️ Aktueller Status

**Problem:** Das Ticket hat den Status `waiting_customer`, aber der TicketRouter verarbeitet nur Tickets mit Status `new` oder `investigating`.

**Lösung:** Das Ticket muss auf Status `new` oder `investigating` gesetzt werden, damit der AutoFix-Executor ausgelöst wird.

---

## 🔍 Nächste Schritte

### Option 1: Ticket-Status manuell ändern (Empfohlen)

```sql
UPDATE support_tickets 
SET status = 'new' 
WHERE id = 'e8e0e5dc-82ad-402f-bc5a-cb83ed70d21b';
```

**Was passiert dann:**
1. TicketRouter erkennt Ticket beim nächsten Polling (max. 30 Sekunden)
2. AutoFix wird ausgelöst
3. Hetzner-Befehl wird erkannt: `pm2 restart whatsapp-bot-builder`
4. Telegram-Bestätigung wird angefordert
5. Du erhältst Telegram-Nachricht mit "✅ Ja" / "❌ Nein" Buttons

---

### Option 2: Support-MCP-Server manuell triggern

Falls der Support-MCP-Server läuft, kann das Ticket auch manuell verarbeitet werden.

**Prüfe ob Server läuft:**
```bash
# Auf dem Server
pm2 list | grep support-mcp-server
```

**Falls nicht läuft:**
```bash
cd /var/www/whatsapp-bot-builder/products/ai-whatsapp-bot-builder/support-mcp-server
pm2 start npm --name support-mcp-server -- start
```

---

## 📋 Erwarteter Flow

1. ✅ **Ticket erstellt** → Status: `waiting_customer`
2. ⏳ **Status ändern** → Status: `new` oder `investigating`
3. ⏳ **TicketRouter erkennt Ticket** (Polling alle 30 Sekunden)
4. ⏳ **AutoFix wird ausgelöst**
5. ⏳ **Hetzner-Befehl erkannt:** `pm2 restart whatsapp-bot-builder`
6. ⏳ **Telegram-Bestätigung angefordert**
7. ⏳ **Telegram-Nachricht kommt** mit Buttons
8. ⏳ **Button-Klick** → Supabase Eintrag
9. ⏳ **Befehl wird ausgeführt** (SSH zu Hetzner)
10. ⏳ **Ticket wird gelöst**

---

## 🔧 Manuelle Status-Änderung

**SQL-Befehl:**
```sql
UPDATE support_tickets 
SET status = 'new' 
WHERE id = 'e8e0e5dc-82ad-402f-bc5a-cb83ed70d21b';
```

**Oder via Supabase Dashboard:**
1. Öffne Supabase Dashboard
2. Gehe zu `support_tickets` Tabelle
3. Finde Ticket mit ID `e8e0e5dc-82ad-402f-bc5a-cb83ed70d21b`
4. Ändere `status` von `waiting_customer` zu `new`
5. Speichere Änderung

---

## ✅ Checkliste

- [x] Ticket erstellt
- [ ] Status auf `new` oder `investigating` geändert
- [ ] TicketRouter erkennt Ticket
- [ ] AutoFix wird ausgelöst
- [ ] Telegram-Bestätigung kommt
- [ ] Button-Klick erfolgt
- [ ] Befehl wird ausgeführt
- [ ] Ticket wird gelöst

---

**Status:** ⏳ **WARTET AUF STATUS-ÄNDERUNG**

