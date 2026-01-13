## Monitoring-Stack für `whatsapp.owona.de`

Dieser Leitfaden beschreibt die lokale bzw. Server-Installation des Observability-Stacks (OpenTelemetry Collector, Prometheus, Grafana, Loki/Promtail, Alertmanager). Alle Komponenten liegen in `infra/monitoring/`.

### Komponentenübersicht

| Komponente | Aufgabe | Ports |
|------------|---------|-------|
| OpenTelemetry Collector (`otel-collector`) | Empfang der App-Traces/Metriken/Logs (OTLP) | `4317` (gRPC), `4318` (HTTP), `9464` (Prometheus-Export) |
| Prometheus | Zeitreihen-Datenbank & Alerting-Quelle | `9090` |
| Alertmanager | Versand von Alerts (Webhook -> MCP Alert-Service) | `9093` |
| Loki | Log-Speicher | `3100` |
| Promtail | Log-Shipper (liest `/var/log` und `/var/log/pm2`) | – |
| Grafana | Dashboards & Visualisierung | `3001` (intern auf 3000 gemappt) |

### Vorbereitung

1. **ENV-Variablen setzen** (z.B. in `/etc/environment` oder beim Start):
   ```bash
   export GRAFANA_ADMIN_USER="admin"
   export GRAFANA_ADMIN_PASSWORD="safe-password"
   export GRAFANA_DOMAIN="monitoring.whatsapp.owona.de"
   ```

2. **Node-/Nginx-Exporter installieren**
   - PM2 Prometheus Exporter (`pm2 install pm2-prometheus-exporter`) → läuft standardmäßig auf Port `9200`.
   - Node Exporter (System-Metriken) auf Host (Port `9100`).
   - Nginx VTS/Status Exporter (optional) auf Port `9113`.

3. **Logs prüfen**: PM2 schreibt nach `/var/log/pm2/*.log`. Promtail liest `/var/log/*.log` und `/var/log/pm2/*.log`. Falls Pfade abweichen → `promtail-config.yaml` anpassen.

### Stack starten

```bash
cd /var/www/whatsapp-bot-builder/infra/monitoring
docker compose up -d
```

> Hinweis: Datei heißt `docker-compose.yml`. Bei separatem Stack-Host kann `docker compose -f docker-compose.yml up -d` genutzt werden.

### Grafana

- Zugriff: `https://monitoring.whatsapp.owona.de` (oder laut Domain-Einstellung).
- Initial-Login: Admin-User laut ENV.
- Auto-Provisioning:
  - Datenquellen: Prometheus & Loki.
  - Dashboard: `System Overview` (`dashboards/system-overview.json`).

### OpenTelemetry-Anbindung (App-Seite)

Im Next.js-Projekt wurde `frontend/instrumentation.ts` ergänzt. Für Server-Deploy:

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT="http://127.0.0.1:4318/v1/traces"
export ENABLE_OTEL_TRACING="true"
```

Optional: Header für Auth → `OTEL_EXPORTER_OTLP_HEADERS="x-otlp-token=secret"`.

### Alertmanager → MCP

Standardmäßig zeigt `alertmanager.yml` auf `http://backend-mcp-alerts:8080/alerts`. Beim Deployment:

1. MCP-Alert-Service bereitstellen (z.B. Docker-Container).
2. URL in `alertmanager.yml` anpassen (`url: https://alerts.whatsapp.owona.de/api/mcp`).
3. Alternativ E-Mail/Slack/WhatsApp Alerts hinzufügen.

### Health Checks

Das Health-Check-Script (`frontend/scripts/health-check.ts`) kann per Cron ausgeführt werden:

```bash
*/5 * * * * cd /var/www/whatsapp-bot-builder/frontend && npm run health-check >> /var/log/whatsapp-health.log 2>&1
```

Bei Exit-Code ≠ 0 sollte ein MCP-Alert ausgelöst werden (z.B. Cron-Wrapper mit `|| curl MCP_ALERT_URL`).

### Datenaufbewahrung & DSGVO

- Prometheus Retention: 30 Tage (`--storage.tsdb.retention.time=30d`).
- Loki: lokaler Filesystem-Store. Rotationen bei Bedarf via Cron (ältere Dateien archivieren).
- `app_audit_log` / `log_workflow_events` (Supabase) → täglicher Export/Archivierung über Edge Function oder Supabase Cron (30 Tage).

### Troubleshooting

- **Collector empfängt nichts**: Prüfen, ob `ENABLE_OTEL_TRACING` gesetzt und OTLP-Endpunkt erreichbar.
- **Prometheus-Scrapes schlagen fehl**: Ports (9100, 9200, 9113) offen? Falls nicht, Exporter deaktivieren oder Targets entfernen.
- **Grafana ohne Datenquellen**: Provisioning-Ordner korrekt gemountet? Logs in `grafana`-Container prüfen.
- **Promtail Permission**: Container benötigt Leserechte auf `/var/log`. Ggf. `--privileged` vermeiden, stattdessen `:ro` mount + `chmod 755 /var/log/pm2`.

### Nächste Schritte

- MCP-Alert-Service implementieren (Webhook-Empfänger).
- Individuelle Dashboards (Bot-Performance, Payment-Conversions) erweitern.
- Synthetic Tests (k6/Artillery) integrieren und Alerts auf P95/P99 Latenzen einstellen.


