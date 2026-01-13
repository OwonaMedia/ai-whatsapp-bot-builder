# Support MCP Agenten-Architektur (Stand 2025-11-08)

Diese Spezifikation erweitert den Support-MCP um eine Zwei-Stufen-Agentenlandschaft. **Tier 1** interagiert mit Kunden, **Tier 2** liefert tiefe Analysen/Fixes ohne direkten Kundenkontakt. Die Tier‑2‑Agenten nutzen zuerst unser Reverse-Engineering-Wissen, bevor externe Quellen herangezogen werden.

---

## Wissensquellen & Reihenfolge
1. **Reverse Engineering /docs & /reverse-engineering**  
   - z. B. `reverse-engineering/WHATSAPP_BOT_REVERSE_ENGINEERING_DATABASE.md`, `docs/architecture.md`.
   - Enthält Auth-Flow, Supabase-Tabellen, Deployments, Fehlerhistorie.
2. **Support-MCP Knowledge Base**  
   - Markdown-Inhalte im MCP (`SupportContext.knowledgeBase`) inkl. Cursor-Setup, SaaS-Dokumentation.
3. **Externe Expertensuche (global)**  
   - Nur wenn Tier 2 nach den beiden oberen Quellen nicht weiterkommt (z. B. neue API-Deprecation).
   - Ergebnisse werden als interne Notiz gespeichert.

---

## Tier 1 – Kundenorientierte Agenten

| Agent | Zweck | Tools (Allowlist) | Prompt-Highlights |
|-------|-------|-------------------|-------------------|
| `support-agent` | Verträge, Rechnungen, Abos, einfache Troubleshooting-Schritte. | `fetchBillingStatus`, `listInvoices`, `triggerResendInvoice`, Zugriff auf Support-Tickets (lesen/schreiben). | Begrüßung, Quick-Replies anzeigen, nur präzise Fragen stellen. Nutzt Silent Checks (z. B. „Prüfe PayPal-Status…“). |
| `ui-debug-agent` | UI-Fehler, Browser-Checks, Reproduktionen. | `fetchFrontendLogs`, `triggerStagingCheck`, `getDeploymentInfo`. | Führt Silent Checks (Konsole, Network), liefert klare Schritte. Fragt nur gezielt (Buttons `[Neu laden] [Nein]`). |
| `escalation-agent` | Automatisierte Bewertung + Eskalation, wenn Tier 1 scheitert. | `createInternalNote`, `setTicketPriority`, `notifyOnCall`. | Verdichtet Kontext, entscheidet, welche Tier‑2-Agenten aktiv werden, erstellt ggf. menschliche Aufgaben. |

- **UX-Regeln (für alle Tier 1-Agenten)**  
  - Quick Replies/Buttons (z. B. „Auszahlung erneut prüfen“).  
  - Silent Checks mit kurzer Statusmeldung („Ich prüfe…“).  
  - Progressive Disclosure: Technische Details nur intern.

---

## Tier 2 – Deep Tech Agenten (keine Kundensicht)

| Agent | Aufruf durch | Fokus | Tools (Allowlist) | Externe Recherche? |
|-------|--------------|-------|-------------------|---------------------|
| `supabase-analyst-agent` | `support-agent`, `escalation-agent` | Auth/DB/RLS/Jobs prüfen & fixen. | Supabase Service Role (SQL, RPC, RLS-Checker), `pg-monitor`, Zugriff auf Reverse-Engineering-SQL-Skripte. | Nur wenn Reverse-Engineering & Knowledge Base keine Lösung liefern → externe Supabase-Quellen. |
| `hetzner-ops-agent` | `escalation-agent` | Server-Health, Deployments, Logs (Caddy, PM2, Docker). | SSH/Hetzner API (Read/Write), `journalctl`, `pm2`, `caddy`, `docker`. | Erst nach Abgleich mit internen Deployment-Guides. |
| `frontend-diagnostics-agent` | `ui-debug-agent`, `escalation-agent` | Build-Errors, Asset-Checks, Lint/Tests. | Git/Repo-Access (read-only), `npm run lint/test/build`, Playwright/Lighthouse (read). | Nur wenn interne Docs keine passende Lösung bieten. |

- **Verpflichtendes Vorgehen:** Das Playbook `support-mcp-server/docs/tier2-playbook.md` beschreibt Analyse- und Reparaturschritte für jeden Tier‑2-Agenten. Der MCP referenziert dieses Playbook automatisch in jedem Prompt – Abweichungen müssen dokumentiert und begründet werden.

### Arbeitsablauf Tier 2
1. Erhalte Auftrag + Zusammenfassung vom Tier‑1- oder Escalation-Agent.  
2. Konsultiere Reverse-Engineering-Dokumente + MCP Knowledge Base.  
3. Führe Checks/Änderungen aus (Allowlist beachten).  
4. Ergebnisse als **interne Nachricht** (`internal_only=true`, `author_name` mit Agent-Label) speichern.  
5. Falls nicht lösbar → markiere „Externe Recherche nötig“, beschaffe globales Expertenwissen, dokumentiere Quellen und Lösung.  
6. Melde Status an anfordernden Tier‑1-Agent (z. B. via `escalation-agent`).

---

## Ticket-Datenmodell (Erweiterungen)

- `support_ticket_messages`
  - `author_name` (implementiert)
  - `internal_only` (geplant – nur Tier-1/2 sichtbar)
  - `quick_reply_options` JSON (z. B. `["Prüfe PayPal","Nein"]`)
- `support_tickets`
  - `assigned_agent` (optional)
  - `last_escalation` Timestamp + `escalation_path`

---

## Silent Checks & Quick Replies

- **Silent Checks:** Tier 1 ruft API/Tool auf, bevor er Kunden fragt.  
  - z. B. `support-agent` → `checkPaymentsStatus` (Tier 2 optional).  
  - Ergebnis: Kurzer Satz („PayPal-Webhooks OK, letzte erfolgreiche Zahlung vor 2 Std.“).
- **Quick Replies:**  
  - `support_ticket_messages.quick_reply_options = ["Prüfe Auszahlung erneut", "Noch nicht"]`  
  - Frontend rendert Buttons. Auswahl wird als neue Kundennachricht gespeichert (mit Optionstext).

---

## Eskalationslogik (Pseudo-Code)

```
if tier1.status == "unresolved":
    escalationAgent.collectContext(ticket)
    if ticket.category == "billing" or error_source == "supabase":
        supabaseAnalystAgent.run()
    if ticket.category == "ui" or ui-errors-found:
        frontendDiagnosticsAgent.run()
    if server-metrics abnormal:
        hetznerOpsAgent.run()
    gather results -> escalate summary -> update ticket status & priority
```

---

## Monitoring & Reporting
- Jede Tier‑2-Aktion schreibt ein `support_automation_events`-Log mit:
  - `agent`, `action_type`, `summary`, `links` (Logs, Commits).
- Dashboards (z. B. Supabase) zeigen Erfolgsquote, Zeit bis Lösung, Eskalationsrate.

---

### Nächste Schritte
1. Backend-Schema erweitern (`internal_only`, `quick_reply_options`).  
2. MCP Router anpassen (Tier‑1/Tier‑2 Orchestrierung).  
3. Frontend UX-Prototyp (Buttons, Silent Status).  
4. Automatisierte Tests und Rollout.


