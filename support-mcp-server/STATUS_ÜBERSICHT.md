# Status-Übersicht: WhatsApp Support-System

**Stand:** November 2025  
**Letzte Änderung:** Workflow YElKFBy2dANe1oQE aktiviert (2025-11-27), Fehler behoben

---

## ✅ Was wurde implementiert

### 1. **n8n Workflow: Telegram Approval (YElKFBy2dANe1oQE)**

**Status:** ✅ **AKTIV** (seit 2025-11-27)

**Funktionalität:**
- Webhook-Endpoint: `/webhook/telegram-approval`
- Empfängt AutoFix-Anfragen (Hetzner-Befehle, Supabase-Migrationen, RLS-Policies)
- Sendet Telegram-Nachrichten mit "✅ Ja" / "❌ Nein" Buttons
- Speichert Antworten in Supabase `support_automation_events`
- Callback-Handling für Button-Klicks

**Dokumentation:** `N8N_WORKFLOW_SETUP.md`, `N8N_SUPABASE_CREDENTIALS.md`

**Erledigt:**
- [x] Workflow in n8n aktiviert ✅
- [x] Supabase Tabelle `support_automation_events` existiert ✅
- [x] Workflow-Fehler behoben (Supabase Operation, Error-Handling) ✅
- [x] Community Edition Setup: Telegram-Daten direkt in Nodes eingetragen ✅
- [x] Workflow erfolgreich getestet - Telegram-Nachricht wird gesendet ✅
- [x] Supabase Credentials in n8n konfiguriert ✅
- [x] Migration: ticket_id von UUID zu TEXT (für String-Ticket-IDs) ✅
- [x] Callback-Flow vollständig funktionsfähig ✅
- [x] End-to-End Test erfolgreich: Webhook → Telegram → Callback → Supabase ✅
- [x] Integration Test erfolgreich: Request-Format kompatibel, waitForApproval findet Antwort ✅

---

### 2. **Ticket-System: Multi-Level Escalation**

**Status:** ✅ Implementiert

**Komponenten:**

#### a) TicketResolutionGuarantee
- **6-Level Escalation System:**
  1. Level 1: AutoFix (bereits versucht)
  2. Level 2: Alternative AutoFix-Strategien
  3. Level 3: Manuelle Intervention mit Telegram-Benachrichtigung
  4. Level 4: Escalation nach Timeout (30 Minuten)
  5. Level 5: Fallback-Lösung (Workaround)
  6. Level 6: Finale Garantie (manuelle Bearbeitung erforderlich)

**Datei:** `src/services/ticketResolutionGuarantee.ts`

#### b) TelegramNotificationService
- Sendet Approval-Requests an n8n Workflow
- Wartet auf Bestätigungen (Polling von Supabase)
- Sendet Ergebnis-Benachrichtigungen

**Datei:** `src/services/telegramNotification.ts`

---

### 3. **Tier-1 Support-Verbesserungen**

**Status:** ✅ Implementiert (laut Memory)

**Verbesserungen:**
- Neues Formular
- Auto-Acknowledgement
- Reply-Route

**Zu prüfen:**
- [ ] Formular im Frontend aktiv?
- [ ] Auto-Acknowledgement funktioniert?
- [ ] Reply-Route korrekt konfiguriert?

---

### 4. **Tier-2 Supabase-Diagnostik**

**Status:** ✅ Implementiert

**Funktionalität:**
- RPC-Funktion `support_supabase_diagnostics`
- Analysiert:
  - Verwaiste Profile
  - Problematische Subscriptions
  - Audit-Log Fehler (24h)
  - Workflow-Fehler (24h)
- Erstellt Knowledge-Dokumente für Tickets

**Datei:** `src/services/tier2/supabaseDiagnostics.ts`

---

### 5. **Hetzner-Automatisierung**

**Status:** ⚠️ Teilweise implementiert, noch nicht vollständig

**Implementiert:**
- ✅ Hetzner SSH-Verbindung (Config vorhanden)
- ✅ Whitelist für erlaubte Befehle (`hetznerWhitelist.ts`)
- ✅ AutoFix-Executor mit Telegram-Bestätigung
- ✅ HetznerMonitor für API-Änderungen

**Erlaubte Befehle:**
- PM2: restart, stop, start, reload, logs, save, list
- Caddy: reload, validate, test
- systemctl: restart, reload, status (nur für caddy, docker, n8n)
- Docker: restart, stop, start, logs (nur für whatsapp-bot-builder, n8n, mcp-afrika-container)

**Fehlt noch:**
- ⏳ Hetzner Tier-2 Diagnostik (Systemressourcen, Logs, Deployment-Infos)
- ⏳ Server-Diagnosedaten für automatische Problemerkennung
- ⏳ Integration mit Ticket-System für Server-Probleme

**Dateien:**
- `src/services/actions/hetznerWhitelist.ts`
- `src/services/actions/autopatchExecutor.ts` (applyHetznerCommand)
- `src/services/monitoring/server-infrastructure.ts` (HetznerMonitor)

---

## 🔍 Aktueller Stand - Was zu prüfen ist

### 1. **Workflow YElKFBy2dANe1oQE**

**Prüfungen:**
```bash
# 1. Prüfe ob Workflow in n8n aktiviert ist
# Öffne: http://automat.owona.de
# Suche nach Workflow ID: YElKFBy2dANe1oQE
# Prüfe: "Active" Toggle ist aktiviert

# 2. Prüfe Environment Variables in n8n
# Settings → Environment Variables
# TELEGRAM_BOT_TOKEN=...
# TELEGRAM_CHAT_ID=...

# 3. Prüfe Supabase Tabelle
# SQL Editor in Supabase:
SELECT * FROM support_automation_events LIMIT 5;

# 4. Teste Webhook
curl -X POST http://automat.owona.de/webhook/telegram-approval \
  -H "Content-Type: application/json" \
  -d '{
    "ticketId": "test-ticket-123",
    "instructionType": "hetzner-command",
    "description": "PM2 Restart Test",
    "command": "pm2 restart whatsapp-bot-builder"
  }'
```

### 2. **Support-MCP-Server Konfiguration**

**Prüfungen:**
```bash
# 1. Prüfe .env Datei auf Server
ssh root@whatsapp.owona.de
cd /var/www/whatsapp-bot-builder/products/ai-whatsapp-bot-builder/support-mcp-server
cat .env | grep -E "(N8N_WEBHOOK_URL|HETZNER_|TELEGRAM)"

# 2. Prüfe ob Service läuft
pm2 list | grep support-mcp-server

# 3. Prüfe Logs
pm2 logs support-mcp-server --lines 50
```

### 3. **Supabase Tabellen**

**Prüfungen:**
```sql
-- Prüfe ob support_automation_events existiert
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'support_automation_events';

-- Prüfe Struktur
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'support_automation_events';

-- Prüfe RLS Policies
SELECT * FROM pg_policies 
WHERE tablename = 'support_automation_events';
```

---

## 📋 Nächste Schritte

### Priorität 1: Workflow aktivieren & testen

1. **Workflow in n8n aktivieren**
   - Öffne n8n: http://automat.owona.de
   - Suche Workflow `YElKFBy2dANe1oQE`
   - Aktiviere "Active" Toggle
   - Prüfe Webhook-URL

2. **Environment Variables konfigurieren**
   - Telegram Bot Token erstellen (falls nicht vorhanden)
   - Chat ID ermitteln
   - In n8n Environment Variables eintragen

3. **Supabase Tabelle erstellen** (falls nicht vorhanden)
   ```sql
   CREATE TABLE IF NOT EXISTS support_automation_events (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     ticket_id UUID NOT NULL REFERENCES support_tickets(id),
     action_type TEXT NOT NULL,
     payload JSONB NOT NULL,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   
   CREATE INDEX IF NOT EXISTS idx_support_automation_events_ticket_id 
     ON support_automation_events(ticket_id);
   CREATE INDEX IF NOT EXISTS idx_support_automation_events_action_type 
     ON support_automation_events(action_type);
   CREATE INDEX IF NOT EXISTS idx_support_automation_events_created_at 
     ON support_automation_events(created_at);
   ```

4. **Integration testen**
   - Test-Request senden (siehe oben)
   - Prüfe Telegram-Nachricht
   - Klicke Button
   - Prüfe Supabase Eintrag

### Priorität 2: Hetzner Tier-2 Diagnostik

**Fehlt noch:**
- Hetzner Server-Diagnostik Service
- Systemressourcen-Monitoring (CPU, RAM, Disk)
- Log-Analyse (PM2, Caddy, Docker)
- Deployment-Info-Sammlung

**Vorschlag:**
- Erstelle `src/services/tier2/hetznerDiagnostics.ts` (analog zu `supabaseDiagnostics.ts`)
- Implementiere SSH-basierte Diagnostik
- Integriere in Ticket-Router für Server-Probleme

### Priorität 3: Ticket-System Monitoring

**Zu implementieren:**
- Dashboard für Ticket-Status
- Metriken: AutoFix-Erfolgsrate, Escalation-Level, Response-Zeiten
- Alerts für ungelöste Tickets nach 30 Minuten

---

## 🔗 Wichtige Dateien

### Workflow & Integration
- `N8N_WORKFLOW_SETUP.md` - Workflow-Dokumentation
- `src/services/telegramNotification.ts` - Telegram-Service
- `src/services/ticketResolutionGuarantee.ts` - Escalation-System

### Hetzner-Automatisierung
- `src/services/actions/hetznerWhitelist.ts` - Erlaubte Befehle
- `src/services/actions/autopatchExecutor.ts` - Befehl-Ausführung
- `src/services/monitoring/server-infrastructure.ts` - Hetzner-Monitor

### Tier-2 Diagnostik
- `src/services/tier2/supabaseDiagnostics.ts` - Supabase-Diagnostik
- `src/services/tier2/hetznerDiagnostics.ts` - ⏳ Fehlt noch

### Konfiguration
- `SERVER_ENV_SETUP.md` - Server-Anmeldedaten
- `env.example` - Environment-Variablen Template
- `src/services/config.ts` - Config-Validierung

---

## 📊 System-Architektur

```
Support Ticket
    ↓
Ticket Router
    ↓
AutoFix (Level 1)
    ↓ (bei Fehler)
Alternative Strategies (Level 2)
    ↓ (bei Fehler)
Manual Intervention (Level 3)
    ├─→ Telegram Approval Request
    │   └─→ n8n Workflow (YElKFBy2dANe1oQE)
    │       └─→ Telegram Bot
    │           └─→ Button Click
    │               └─→ Supabase (support_automation_events)
    │                   └─→ Polling & Execution
    ↓ (bei Timeout)
Timeout Escalation (Level 4)
    ↓ (bei Fehler)
Workaround (Level 5)
    ↓ (bei Fehler)
Final Guarantee (Level 6)
```

---

## ⚠️ Bekannte Probleme / Offene Punkte

1. **Hetzner Tier-2 Diagnostik fehlt**
   - Server-Diagnosedaten nicht verfügbar
   - Systemressourcen-Monitoring fehlt
   - Log-Analyse nicht implementiert

2. **Workflow-Status unklar**
   - Nicht sicher ob Workflow aktiviert ist
   - Environment Variables möglicherweise nicht konfiguriert
   - Supabase Tabelle möglicherweise nicht erstellt

3. **Integration noch nicht getestet**
   - Telegram-Bestätigung nicht getestet
   - End-to-End-Flow nicht validiert

---

## 📝 Notizen

- **Memory:** "Tier-1 Supportflows wurden verbessert (neues Formular, Auto-Acknowledgement, Reply-Route). Tier-2 Supabase-Diagnose per RPC implementiert; Hetzner-Automatisierung steht noch aus und benötigt Server-Diagnosedaten (Systemressourcen, Logs, Deploymentinfos)."

- **Letzte Änderung:** Workflow YElKFBy2dANe1oQE erstellt, Ticket-System umgestellt für mehr eigenständige Problemlösung

---

**Erstellt:** 2025-11-27  
**Nächste Aktualisierung:** Nach Workflow-Aktivierung und Hetzner-Diagnostik-Implementierung

