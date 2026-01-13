## Statusprotokoll (letzte 48 Stunden)

**Stand:** 14.11.2025 –  (GMT+1)

### 1. Zielsetzung der letzten 48 Stunden
- Wiederherstellung der Erreichbarkeit von `whatsapp.owona.de` und `automat.owona.de`.
- Stabilisierung der Support-MCP-Services (Supabase Realtime, Autopatch/File Writer, Monitoring).
- Vorbereitung eines Testdurchlaufs für das Ticketsystem inkl. ESLint-Stabilisierung und Monitoring-Erweiterung.

### 2. Durchgeführte Arbeiten & Erkenntnisse
- **Prozess- und Infrastrukturpflege**
  - PM2-Apps (`whatsapp-bot-builder`, `support-mcp-server`, `support-mcp-router`, `file-writer-worker`, `automat`) mehrfach geprüft bzw. geplante Neustarts vorbereitet.
  - Caddy-Logs analysiert: Fehlerhinweise auf nicht erreichbare internen Ports (3000/3009) identifiziert → Hinweis, dass die Apps tatsächlich nicht laufen.
- **Support-MCP-Server**
  - Neue Realtime-Metriken (`ticketChannelStatus`, `messageChannelStatus`, `realtimeReconnects`) in `ticketRouter` und Healthcheck integriert.
  - Supabase-Client mit explizitem `realtimeUrl`, Auth-Headern sowie `ws`-Polyfill ausgestattet.
  - `/metrics` um Prometheus-Ausgabe erweitert; Healthcheck gibt Realtime-Status und Reconnect-Zähler aus.
  - Autopatch-Flow abgesichert: File-Writer-Worker-Port auf `3004` vereinheitlicht, `FILE_WRITER_URL` angepasst.
- **Monitoring & Tests**
  - Monitoring-Erweiterung vorbereitet (zusätzliche Kennzahlen, Prometheus-Format).
  - Testlauf des Ticketsystems geplant, jedoch noch nicht durchgeführt, weil die Apps offline blieben.
- **Serverzugriff / SSH**
  - Acht verschiedene SSH-Versuche (mit und ohne PTY, inkl. `sshpass`) scheiterten: Verbindung wird direkt nach dem Login-Versuch geschlossen → vermutlich PTY/SSH-Restriktion oder Fail2ban-Block.
  - Aktuell dadurch keine Möglichkeit, `pm2 list` oder Neustarts auf dem Server auszuführen.

### 3. Blocker
- **SSH-Zugriff**: Keine der bereitgestellten Zugangsdaten ermöglicht derzeit eine vollständige Shell (Fehler „Failed to get a pseudo terminal“ bzw. sofortiger Verbindungsabbruch). Ohne funktionierenden Zugriff können keine Prozesse gestartet oder Logs eingesehen werden.

### 4. Offene Punkte / Nächste Schritte
1. Serverzugang wiederherstellen (Fail2ban/Firewall prüfen, alternative Benutzer oder Hetzner-Konsole nutzen).
2. Nach erfolgreichem Login:
   - `pm2 list` und Neustart aller betroffenen Prozesse.
   - Sicherstellen, dass `support-mcp-server` und `file-writer-worker` mit Port 3004 laufen.
   - Caddy-Status prüfen und Domains testen.
3. Anschließend: Prüfender Ticketsystem-Testlauf inkl. Monitoring/ESLint-Check.
4. Realtime-Überwachung weiter beobachten und ggf. zusätzliche Logs aktivieren.

> Dieses Dokument wurde erstellt, um den Arbeitsstand für zukünftige Sessions zu sichern. Bitte in kommenden Chats darauf referenzieren.

