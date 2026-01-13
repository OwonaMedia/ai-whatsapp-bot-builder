# Ticket-Vorschlag für Integration-Test

**Datum:** 2025-11-27  
**Zweck:** Integration-Test des Telegram Approval Workflows

---

## 🎯 Vorgeschlagenes Ticket

### Option 1: PM2 Restart (Empfohlen)

**Titel:** WhatsApp Bot läuft nicht - PM2 Restart erforderlich

**Beschreibung:**
```
Der WhatsApp Bot auf whatsapp.owona.de reagiert nicht mehr. 
PM2 Prozess muss neu gestartet werden, um die Verbindung wiederherzustellen.

Erforderliche Aktion: PM2 Restart für whatsapp-bot-builder
```

**Erwarteter AutoFix:**
- **Befehl:** `pm2 restart whatsapp-bot-builder`
- **Typ:** `hetzner-command`
- **Erfordert Bestätigung:** ✅ Ja (Telegram Approval)

**Warum dieser Befehl:**
- ✅ In Whitelist erlaubt
- ✅ Häufiges Problem (Prozess hängt)
- ✅ Sicher (nur Restart, keine Datenverlust)
- ✅ Schnell testbar

---

### Option 2: Caddy Reload

**Titel:** Caddy Konfiguration aktualisiert - Reload erforderlich

**Beschreibung:**
```
Die Caddy-Konfiguration wurde aktualisiert, aber Caddy lädt die neue 
Konfiguration nicht automatisch. Ein Reload ist erforderlich, um die 
Änderungen zu aktivieren.

Erforderliche Aktion: Caddy Reload
```

**Erwarteter AutoFix:**
- **Befehl:** `caddy reload`
- **Typ:** `hetzner-command`
- **Erfordert Bestätigung:** ✅ Ja (Telegram Approval)

**Warum dieser Befehl:**
- ✅ In Whitelist erlaubt
- ✅ Häufiges Problem nach Config-Änderungen
- ✅ Sicher (nur Reload, kein Restart)

---

### Option 3: Docker Container Restart

**Titel:** n8n Container reagiert nicht - Restart erforderlich

**Beschreibung:**
```
Der n8n Docker Container auf whatsapp.owona.de reagiert nicht mehr.
Workflows werden nicht ausgeführt. Ein Container-Restart ist erforderlich.

Erforderliche Aktion: Docker Restart für n8n Container
```

**Erwarteter AutoFix:**
- **Befehl:** `docker restart n8n`
- **Typ:** `hetzner-command`
- **Erfordert Bestätigung:** ✅ Ja (Telegram Approval)

**Warum dieser Befehl:**
- ✅ In Whitelist erlaubt
- ✅ Kritischer Service (n8n)
- ✅ Sicher (Container-Restart)

---

## 📋 Empfehlung

**Option 1 (PM2 Restart) ist am besten für den Test:**

**Gründe:**
1. ✅ Häufigstes Problem
2. ✅ Schnell testbar
3. ✅ Keine Auswirkungen auf andere Services
4. ✅ Klare Erfolgsmessung (Bot antwortet wieder)

---

## 🎫 Ticket-Details (für Option 1)

**Titel:**
```
WhatsApp Bot läuft nicht - PM2 Restart erforderlich
```

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

**Kategorie:** `server-issue` oder `infrastructure`

**Priorität:** `medium` oder `high`

**Erwarteter AutoFix:**
- **Type:** `hetzner-command`
- **Command:** `pm2 restart whatsapp-bot-builder`
- **Description:** "PM2 Restart für whatsapp-bot-builder - Bot reagiert nicht"
- **RequiresApproval:** `true`
- **WhitelistCheck:** `true`

---

## 🔍 Was passiert beim Ticket-Erstellen

1. **Ticket wird erstellt** in Supabase `support_tickets`
2. **AutoFix wird ausgelöst** (Ticket Router erkennt Problem)
3. **AutoFix-Executor** erkennt Hetzner-Befehl
4. **sendApprovalRequest** wird aufgerufen
5. **Telegram-Nachricht** kommt (mit "✅ Ja" / "❌ Nein")
6. **Button-Klick** → Supabase Eintrag
7. **waitForApproval** findet Antwort
8. **Befehl wird ausgeführt** (SSH zu Hetzner Server)
9. **Ergebnis wird geloggt**

---

## ✅ Checkliste für Ticket-Erstellung

- [ ] Ticket-Titel: "WhatsApp Bot läuft nicht - PM2 Restart erforderlich"
- [ ] Beschreibung: Siehe oben
- [ ] Kategorie: `server-issue` oder `infrastructure`
- [ ] Priorität: `medium` oder `high`
- [ ] Erwarteter AutoFix: Hetzner-Befehl mit `requiresApproval: true`

---

**Status:** ✅ **BEREIT FÜR TICKET-ERSTELLUNG**

