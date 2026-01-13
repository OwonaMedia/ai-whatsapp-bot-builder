# Integration Test Plan - Telegram Approval Workflow

**Datum:** 2025-11-27  
**Status:** ⏳ **BEREIT FÜR TEST**

---

## ✅ Was bereits funktioniert

1. ✅ **n8n Workflow** - Vollständig funktionsfähig
2. ✅ **Webhook-Endpoint** - Empfängt Requests korrekt
3. ✅ **Telegram-Integration** - Nachrichten werden gesendet
4. ✅ **Callback-Handling** - Button-Klicks funktionieren
5. ✅ **Supabase-Integration** - Einträge werden erstellt
6. ✅ **Request-Format** - `action: 'request_approval'` wird akzeptiert

---

## 🧪 Test-Plan

### Schritt 1: Prüfe Server-Konfiguration

**Auf Server prüfen:**
```bash
ssh root@whatsapp.owona.de
cd /var/www/whatsapp-bot-builder/products/ai-whatsapp-bot-builder/support-mcp-server
cat .env | grep N8N_WEBHOOK_URL
```

**Erwartet:**
```
N8N_WEBHOOK_URL=https://automat.owona.de/webhook/telegram-approval
```

**Falls nicht gesetzt:**
```bash
echo "N8N_WEBHOOK_URL=https://automat.owona.de/webhook/telegram-approval" >> .env
pm2 restart support-mcp-server
```

---

### Schritt 2: Test-Request direkt senden

**Bereits getestet:**
```bash
curl -X POST https://automat.owona.de/webhook/telegram-approval \
  -H "Content-Type: application/json" \
  -d '{
    "action": "request_approval",
    "ticketId": "integration-test-001",
    "instructionType": "hetzner-command",
    "description": "Integration Test - PM2 Restart",
    "command": "pm2 restart whatsapp-bot-builder"
  }'
```

**Ergebnis:** ✅ Erfolgreich (Execution 39302)

---

### Schritt 3: Prüfe ob Telegram-Nachricht kam

**In Telegram prüfen:**
- Nachricht sollte angekommen sein
- Buttons "✅ Ja" und "❌ Nein" sollten sichtbar sein

**Falls nicht:**
- Prüfe n8n Execution Logs
- Prüfe Telegram Bot Token
- Prüfe Chat ID

---

### Schritt 4: Test mit echtem Ticket

**Option A: Über Support-MCP-Server MCP-Tool**

Falls ein MCP-Tool existiert, um Tickets zu erstellen:
1. Erstelle ein Ticket mit einem Problem, das einen Hetzner-Befehl benötigt
2. Der AutoFix-Executor sollte automatisch `sendApprovalRequest` aufrufen
3. Prüfe ob Telegram-Nachricht kommt

**Option B: Manuell testen**

1. Erstelle ein Test-Ticket in Supabase
2. Rufe `applyHetznerCommand` direkt auf (falls möglich)
3. Prüfe ob Telegram-Nachricht kommt

---

### Schritt 5: Prüfe waitForApproval

**Nach Button-Klick:**
1. Klicke auf "✅ Ja" in Telegram
2. Prüfe ob Eintrag in Supabase erstellt wurde
3. Prüfe ob `waitForApproval` die Antwort findet
4. Prüfe ob Befehl ausgeführt wird

**Zu prüfen:**
```sql
SELECT * FROM support_automation_events 
WHERE ticket_id = 'integration-test-001' 
ORDER BY created_at DESC 
LIMIT 1;
```

---

## 🔍 Was zu prüfen ist

### 1. Server-Konfiguration
- [ ] `N8N_WEBHOOK_URL` in `.env` gesetzt?
- [ ] Support-MCP-Server läuft (PM2)?
- [ ] Logs zeigen keine Fehler?

### 2. Request-Format
- [x] Webhook akzeptiert `action: 'request_approval'` ✅
- [x] Telegram-Nachricht wird gesendet ✅
- [ ] `waitForApproval` findet Antwort?

### 3. Integration
- [ ] `sendApprovalRequest` wird aufgerufen?
- [ ] `waitForApproval` findet Eintrag in Supabase?
- [ ] Befehl wird nach Genehmigung ausgeführt?

---

## 📋 Test-Szenario

### Szenario 1: PM2 Restart

**Ticket:**
- Problem: "WhatsApp Bot läuft nicht"
- AutoFix: `pm2 restart whatsapp-bot-builder`
- Erfordert: Telegram-Bestätigung

**Erwarteter Flow:**
1. Ticket wird erstellt
2. AutoFix erkennt Problem
3. `applyHetznerCommand` wird aufgerufen
4. `sendApprovalRequest` sendet an n8n
5. Telegram-Nachricht kommt
6. Button-Klick → Supabase Eintrag
7. `waitForApproval` findet Antwort
8. Befehl wird ausgeführt

---

## 🐛 Bekannte Probleme

### Problem 1: Request-Format
**Status:** ✅ **GELÖST**
- Der Workflow akzeptiert `action: 'request_approval'` Feld
- Die Daten werden korrekt extrahiert

### Problem 2: ticket_id Format
**Status:** ✅ **GELÖST**
- Migration von UUID zu TEXT durchgeführt
- String-Ticket-IDs funktionieren jetzt

---

## 📝 Nächste Schritte

1. **Server-Konfiguration prüfen** (N8N_WEBHOOK_URL)
2. **Test-Ticket erstellen** (manuell oder über MCP)
3. **Kompletten Flow testen** (Ticket → Telegram → Approval → Execution)
4. **Logs prüfen** (Support-MCP-Server Logs)

---

**Status:** ⏳ **BEREIT FÜR TEST**

