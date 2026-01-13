---
title: Tier‑2 Incident Playbook
version: 2025-11-09
---

# Tier‑2 Incident Playbook – Support MCP

Dieses Playbook definiert den verbindlichen Arbeitsablauf für alle Tier‑2-Agenten (`supabase-analyst-agent`, `hetzner-ops-agent`, `frontend-diagnostics-agent`). Es dient als Referenz für den MCP und wird automatisch in die Wissensbasis geladen.

---

## 1. Gemeinsame Leitplanken

1. **Kontext sichern**
   - Support-Ticket, letzte Kundenmeldungen, interne Notizen lesen.
   - Offene `support_automation_events` prüfen.
   - Prüfen, ob bereits Eskalationen laufen (Feld `escalation_path`).

2. **Wissensbasis konsultieren**
   - Reverse-Engineering (`/reverse-engineering/*.md`) nach passenden Abschnitten durchsuchen.
   - `docs/architecture.md`, `docs/EXPERTEN_REVIEW_AUTH.md`, `docs/SUPABASE_FACTORY_PLAYBOOK.md` sowie dieses Playbook heranziehen.

3. **Hypothese formulieren**
   - Fehlerbild + mögliche Ursache schriftlich festhalten (interne Notiz).
   - Benötigte Tools bestimmen (Supabase RPC, SSH, npm, …).

4. **Analyse durchführen** (siehe Spezialabschnitte unten).
   - Alle Kommandos mit Timestamp im Ticket loggen (`support_ticket_messages.internal_only = true`).
   - Automations-Events (`support_automation_events`) für wichtige Schritte schreiben.

5. **Fix oder nächste Schritte dokumentieren**
   - Klare, nummerierte Handlungsschritte.
   - Falls ungelöst: Blocker + empfohlene nächste Aktion + benötigte Ressourcen.
   - Immer Bezug zur Hypothese herstellen („Hypothese bestätigt/widerlegt“).

6. **Weitergabe an Tier 1**
   - Kurze Zusammenfassung für Tier 1 formulieren (interne Notiz).
   - Empfohlene Kundenkommunikation skizzieren („Kunde bitte um X“).

---

## 2. Supabase Analyst Agent – Strategy

### 2.1 Diagnose
1. **Health Check**
   - `getMonitoringSnapshot` in `frontend/lib/monitoring/snapshot.ts` lesen.
   - Supabase-Dashboards: Auth-Logs, Edge Functions, Postgres Logs.
2. **Sitzungen & Auth**
   - `auth.sessions`, `auth.users`, `profiles` konsistent?
   - Trigger `handle_new_user()`, Funktion `create_free_subscription()` prüfen.
3. **RLS & Policies**
   - `pg_policy` für betroffene Tabellen durchgehen.
   - SQL-Export aus `reverse-engineering/05_SECURITY.md` verwenden.
4. **Fehlermeldungen reproduzieren**
   - `supabase.rpc('<fn>', …)` mit identischen Parametern testen.
   - `supabase.auth.getUser()`/`verifyOtp()` Pfade prüfen.

### 2.2 Reparatur
1. **SQL/Migration vorbereiten**
   - Draft in Markdown (`/support-mcp-server/tmp/sql/…`) oder Ticketnotiz.
   - Prüfen, ob Migration bereits existiert (`supabase/migrations`).
2. **Trockentest**
   - `EXPLAIN` oder `ROLLBACK`-Block verwenden.
   - RLS: `alter policy … using ( … )`.
3. **Ausführen**
   - Via `pg_execute_sql` oder `apply_migration`.
   - Erfolgs-/Fehlerstatus im Ticket dokumentieren.
4. **Validieren**
   - Reproduktionsschritt erneut ausführen.
   - Wenn erfolgreich: Datenänderungen (z. B. korrigierte Zeilen) angeben.

### 2.3 Kommunikation
- Interne Notiz mit:
  1. Ursache
  2. Getätigte Aktionen (SQL, Migrationen)
  3. Ergebnis / Follow-up

---

## 3. Hetzner Ops Agent – Strategy

### 3.1 Diagnose
1. **Systemstatus**
   - `uptime`, `df -h`, `free -m`, `top -b -n1`.
   - `journalctl -u whatsapp-bot-builder --since "-30min"`.
2. **PM2 & Services**
   - `pm2 status`, `pm2 logs whatsapp-bot-builder --lines 200 --nostream`.
   - Nginx/Caddy: `systemctl status caddy`, `journalctl -u caddy --since "-15min"`.
3. **Netzwerk**
   - `ss -tulpen | grep 3000`, Firewall-Regeln (ufw/nftables).
4. **Deploy-Pipeline**
   - `/var/www/whatsapp-bot-builder/frontend/.next` Timestamp.
   - Letzte Deployments in `support_automation_events` prüfen.

### 3.2 Reparatur
1. **Gezielte Neustarts**
   - `pm2 restart whatsapp-bot-builder --update-env`.
   - Bei Caddy/Nginx: `systemctl reload caddy`.
2. **Konfigurations-Fix**
   - Änderungen unter `/var/www/...` vornehmen (immer Backup!).  
   - `git status` dokumentieren, falls Repo vorhanden.
3. **Deployment**
   - `npm install --omit=dev --legacy-peer-deps && npm run build`.
   - Ergebnisse mit Exit-Code loggen.

### 3.3 Kommunikation
- Interne Notiz mit:
  - Gefundene Root Cause (Log-Zeilen angeben).
  - Durchgeführte Kommandos (inkl. Zeit).
  - Nächste Schritte (z. B. Monitoring aktiv halten).

---

## 4. Frontend Diagnostics Agent – Strategy

### 4.1 Diagnose
1. **Build Errors**
   - `npm run build` lokal (Staging) oder auf Server (Screenshots).
   - `.next/server/chunks/*` nach Digest-Fehlern durchsuchen.
2. **Lint/Test**
   - `npm run lint`, `npm run test` (falls vorhanden).
   - Resultate in Ticketnotiz protokollieren.
3. **Assets & CSP**
   - Prüfen, ob `next.config.js` aktuelle CSP enthält.
   - Netzwerktraces für fehlende Assets.

### 4.2 Reparatur
1. **Hotfix vorbereiten**
   - Änderung in lokalem Workspace (Cursor) durchführen.
   - Tests erneut ausführen.
2. **Deployment Steps**
   - `rsync` oder CI/Pipeline laut `reverse-engineering/07_DEPLOYMENT.md`.
   - Auf Server Build + `pm2 restart`.
3. **Verifikation**
   - Betroffene Seite via `curl`/Browser testen.
   - Screenshots generieren, falls UI-Bug.

### 4.3 Kommunikation
- Interne Notiz mit:
  - Fehlerursache (Datei/Komponente).
  - Fix (PR-Referenz oder Commit).
  - Schritte für QA/Kunde (z. B. Cache leeren).

---

## 5. Eskalation & Übergabe

1. **Nicht lösbar?**
   - Blocker formulieren („Benötigt manuellen Zugriff auf Meta Business Manager“).
   - `support_ticket_messages` → interne Nachricht mit Tag `manual_followup`.
   - `support_automation_events` → `manual_followup` mit Kontext.

2. **Externe Recherche**
   - `support-ticket_messages` + Quellenliste (URL, Datum, Kernaussage).
   - Update der Knowledge Base einplanen (`registerKnowledgeSuggestionAction`).

3. **Hand-over an menschliches Team**
   - `assigned_agent` auf verantwortliche Person setzen.
   - Zusammenfassung in weniger als 5 Sätzen: Problem, Ursache, durchgeführte Schritte, aktueller Zustand, empfohlene Maßnahme.

---

## 6. Checklisten (Kurzfassung)

### Supabase Analyst
- [ ] Auth/Profiles konsistent?
- [ ] Policies + Funktionen geprüft?
- [ ] SQL-Script vorbereitet, getestet, ausgeführt?
- [ ] Erfolg + Datenvalidierung dokumentiert?

### Hetzner Ops
- [ ] CPU/RAM/Disk ok?
- [ ] Logs auf Fehler geprüft?
- [ ] Dienste gezielt neu gestartet?
- [ ] Änderungen & Ergebnisse protokolliert?

### Frontend Diagnostics
- [ ] Build/Lint erneut ausgeführt?
- [ ] Fehlerursache identifiziert (Datei/Chunk)?
- [ ] Fix implementiert + deployt?
- [ ] Frontend Smoke-Test dokumentiert?

---

## 7. Aktualisierung

Dieses Playbook wird regelmäßig aktualisiert. Änderungen müssen als Knowledge Suggestion im internen Portal (`/intern`) erfasst werden, damit der MCP seine Wissensbasis synchronisieren kann.


