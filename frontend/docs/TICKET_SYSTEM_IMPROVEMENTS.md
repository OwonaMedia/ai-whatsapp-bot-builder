# Ticket-System Verbesserungsvorschläge

**Erstellt:** 2025-01-27  
**Status:** Analyse abgeschlossen, Tickets müssen noch erstellt werden  
**System:** whatsapp.owona.de Support-Ticket-System

## Zusammenfassung

Das bestehende Ticket-System wurde analysiert. Es wurden **8 Verbesserungsvorschläge** identifiziert, die als Tickets erstellt werden sollen.

## Bestehendes System

### Komponenten
- **Frontend (Kunde):** `/de/support/messages` - SupportMessagesClient.tsx
- **Frontend (Intern):** `/de/intern` - InternalDashboard.tsx
- **API:** `/api/support-tickets` - REST API für Ticket-Erstellung
- **Backend:** Supabase `support_tickets` und `support_ticket_messages` Tabellen
- **MCP Server:** Tier-1/Tier-2 Automation

### Aktuelle Features
✅ Auto-Acknowledgement (Tier-1)  
✅ Auto-Escalation (Tier-2)  
✅ Internes Portal mit Metriken  
✅ SLA-Tracking (36h Threshold)  
✅ Knowledge Base Integration  
✅ Service Status Monitoring  

### Bekannte Probleme
❌ Realtime komplett deaktiviert (Polling statt Echtzeit-Updates)  
❌ Limit auf 100 Tickets im internen Portal  
❌ Keine E-Mail-Benachrichtigungen  
❌ Keine Rich-Text-Editor  
❌ Tier-2 Hetzner-Diagnose fehlt  

---

## Verbesserungsvorschläge

### 1. Realtime wieder aktivieren mit optimierter Nutzung
**Kategorie:** UX  
**Priorität:** High  
**Betroffen:** SupportMessagesClient.tsx, supabaseFactory.ts

**Problem:**
- Realtime ist komplett deaktiviert (wegen Quota-Überschreitung)
- Polling alle 8 Sekunden (unnötige API-Calls)
- Keine Echtzeit-Updates für Support-Team
- Schlechtere User Experience

**Lösung:**
- Realtime nur für aktives Ticket aktivieren (nicht für alle)
- Channel-Subscription optimieren (nur support_ticket_messages des aktuellen Tickets)
- Cleanup verbessern (Channel wird korrekt entfernt)
- Monitoring für Realtime-Nutzung implementieren

---

### 2. Pagination für internes Portal implementieren
**Kategorie:** UX  
**Priorität:** Medium  
**Betroffen:** app/[locale]/intern/data.ts, InternalDashboard.tsx

**Problem:**
- Nur die letzten 100 Tickets werden angezeigt (hardcoded Limit)
- Ältere Tickets sind nicht sichtbar

**Lösung:**
- Pagination im internen Portal implementieren
- Infinite Scroll oder "Load More" Button
- Filter nach Status, Priorität, Kategorie
- Suchfunktion für Tickets

---

### 3. Tier-2 Hetzner-Diagnose implementieren
**Kategorie:** Integration  
**Priorität:** High  
**Betroffen:** Supabase RPC, Tier-2 Automation

**Problem:**
- Tier-2 Diagnose existiert nur für Supabase (via RPC)
- Hetzner-Automatisierung steht noch aus

**Lösung:**
- Hetzner-Diagnose-RPC-Funktion erstellen
- Server-Diagnosedaten sammeln (Systemressourcen, Logs, Deployment-Infos)
- Integration in Tier-2 Automation
- Auto-Fix für bekannte Hetzner-Probleme

---

### 4. Rich-Text-Editor für Ticket-Nachrichten
**Kategorie:** UX  
**Priorität:** Medium  
**Betroffen:** SupportMessagesClient.tsx, InternalDashboard.tsx

**Problem:**
- Aktuell nur Plain-Text-Nachrichten
- Keine Formatierung, keine Markdown-Unterstützung

**Lösung:**
- Rich-Text-Editor (z.B. Tiptap oder Slate) integrieren
- Markdown-Unterstützung
- Code-Blocks mit Syntax-Highlighting
- @-Mentions für Team-Mitglieder
- Datei-Uploads/Attachments

---

### 5. E-Mail-Benachrichtigungen für Tickets
**Kategorie:** Integration  
**Priorität:** High  
**Betroffen:** Supabase Edge Functions, E-Mail-Service

**Problem:**
- Kunden erhalten keine E-Mail-Benachrichtigungen bei:
  - Neuen Antworten
  - Status-Änderungen
  - SLA-Warnungen

**Lösung:**
- E-Mail-Templates erstellen
- Supabase Edge Functions für E-Mail-Versand
- Benachrichtigungen bei neuen Antworten
- SLA-Warnungen (36h Threshold)
- Opt-out Option für Kunden

---

### 6. SLA-Tracking mit Alerts im internen Portal
**Kategorie:** UX  
**Priorität:** Medium  
**Betroffen:** InternalDashboard.tsx, data.ts

**Problem:**
- SLA wird berechnet (36h Threshold), aber es gibt keine aktiven Alerts oder Warnungen im Portal

**Lösung:**
- Visuelle Warnungen für Tickets nahe SLA-Limit
- Auto-Escalation bei SLA-Überschreitung
- Dashboard-Widget für SLA-Status
- E-Mail-Alerts für Support-Team

---

### 7. Automatische Ticket-Zuweisung basierend auf Agent-Load
**Kategorie:** Integration  
**Priorität:** Low  
**Betroffen:** Tier-1 Automation, Ticket-Router

**Problem:**
- Tickets werden manuell zugewiesen
- Keine automatische Lastverteilung

**Lösung:**
- Auto-Assignment basierend auf Agent-Load
- Round-Robin für neue Tickets
- Priorität-basierte Zuweisung
- Workload-Balancing

---

### 8. Export-Funktion für Tickets und Metriken
**Kategorie:** UX  
**Priorität:** Low  
**Betroffen:** InternalDashboard.tsx, API Routes

**Problem:**
- Keine Möglichkeit, Tickets oder Metriken zu exportieren (CSV, JSON, PDF)

**Lösung:**
- CSV-Export für Tickets
- PDF-Reports für Metriken
- JSON-Export für API-Integration
- Scheduled Reports (täglich/wöchentlich)

---

## Nächste Schritte

1. **Tickets erstellen:** Script `scripts/create-improvement-tickets.ts` ausführen (benötigt korrekte Environment-Variablen)
2. **Priorisierung:** Tickets nach Priorität sortieren und mit dem Team besprechen
3. **Umsetzung:** Tickets nacheinander abarbeiten, beginnend mit High-Priority

## Script zum Erstellen der Tickets

```bash
# Auf dem Server mit korrekten Environment-Variablen:
cd /path/to/frontend
npx tsx scripts/create-improvement-tickets.ts
```

**Hinweis:** Das Script benötigt:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- Einen existierenden User in der `profiles` Tabelle (system@owona.de oder admin@owona.de)

---

## Ab sofort: Alle Verbesserungen über Ticket-System

Ab sofort werden alle Verbesserungen und Erweiterungen für whatsapp.owona.de über das Ticket-System abgewickelt:

1. **Problem identifizieren** → Ticket erstellen
2. **Lösung implementieren** → Ticket-Status aktualisieren
3. **Testing** → Kommentar im Ticket
4. **Deployment** → Ticket als "resolved" markieren

Dies verbessert gleichzeitig das Ticket-System durch reale Nutzung und dokumentiert alle Änderungen.

