# External API Monitoring System

## Übersicht

Das External API Monitoring System überwacht kontinuierlich Änderungen in externen APIs und Services, die die Funktionalität der Plattform beeinflussen können. Es erkennt automatisch Änderungen und versucht, diese automatisch zu aktualisieren, wenn möglich.

## Überwachte Provider

- **Meta/WhatsApp**: Graph API Versionen, Webhook-Änderungen, Rate Limits, Deprecations
- **Stripe**: API Changelog, Webhook Signature Changes
- **PayPal**: API Changelog, Webhook Changes
- **Mollie**: API Changelog
- **Hetzner**: API Changelog (falls verwendet)
- **n8n**: Version Updates
- **Supabase**: Feature Updates, Changelog

## Architektur

### Monitoring Service

Der `MonitoringService` koordiniert alle Monitore und führt regelmäßige Checks durch:

- **Check-Intervall**: Standardmäßig 24 Stunden (konfigurierbar via `EXTERNAL_API_CHECK_INTERVAL_MS`)
- **Automatische Updates**: Low/Medium Impact Changes werden automatisch verarbeitet
- **Manuelle Review**: High/Critical Changes erfordern manuelle Intervention

### Monitore

Jeder Provider hat einen eigenen Monitor, der von `ExternalAPIMonitor` erbt:

- `MetaWhatsAppMonitor`: Überwacht Meta Graph API Änderungen
- `StripeMonitor`: Überwacht Stripe API Änderungen
- `PayPalMonitor`: Überwacht PayPal API Änderungen
- `MollieMonitor`: Überwacht Mollie API Änderungen
- `HetznerMonitor`: Überwacht Hetzner API Änderungen
- `N8nMonitor`: Überwacht n8n Version Updates
- `SupabaseMonitor`: Überwacht Supabase Feature Updates

### Update Handler

Der `UpdateHandler` verarbeitet erkannte Änderungen und versucht automatische Updates:

- **API Updates**: Nicht-breaking Changes werden automatisch aktualisiert
- **Version Updates**: API-Versionen werden aktualisiert
- **Webhook Changes**: Webhook-Signaturen werden aktualisiert
- **Breaking Changes**: Erfordern manuelle Intervention
- **Deprecations**: Deprecated Code wird durch neue Implementierungen ersetzt

## Datenbank

### Tabelle: `external_api_changes`

Speichert alle erkannten Änderungen:

- `id`: UUID
- `provider`: Provider-Name (z.B. "Meta/WhatsApp")
- `change_type`: Typ der Änderung (api_update, breaking_change, deprecation, version_update, webhook_change)
- `title`: Titel der Änderung
- `description`: Beschreibung
- `impact`: Auswirkung (low, medium, high, critical)
- `detected_at`: Zeitpunkt der Erkennung
- `updated_at`: Zeitpunkt der Aktualisierung
- `status`: Status (detected, in_progress, updated, failed)
- `auto_updated`: Ob automatisch aktualisiert wurde
- `affected_services`: Array von betroffenen Services
- `metadata`: Zusätzliche Metadaten (JSONB)

## Konfiguration

### Umgebungsvariablen

- `EXTERNAL_API_CHECK_INTERVAL_MS`: Check-Intervall in Millisekunden (Standard: 24 Stunden)

### Beispiel

```bash
EXTERNAL_API_CHECK_INTERVAL_MS=86400000  # 24 Stunden
```

## Verwendung

### Monitoring Service starten

Der Monitoring Service startet automatisch beim Start des Support MCP Servers:

```typescript
const monitoringService = new MonitoringService(supabase, logger);
monitoringService.start();
```

### Manuelle Checks

```typescript
// Alle Provider checken
await monitoringService.runChecks();

// Spezifischen Provider checken
await monitoringService.checkProvider('Meta/WhatsApp');
```

### Status abfragen

```typescript
const status = monitoringService.getStatus();
console.log(status);
```

## Automatische Updates

### Update-Strategien

1. **API Updates** (low/medium impact):
   - Automatische Code/Config Updates
   - Testing
   - Deployment

2. **Version Updates**:
   - API-Version in Config aktualisieren
   - Breaking Changes prüfen
   - Code-Updates falls nötig

3. **Webhook Changes**:
   - Webhook-Signature Verification aktualisieren
   - Handler-Updates falls nötig

4. **Breaking Changes**:
   - Manuelle Intervention erforderlich
   - Keine automatischen Updates

5. **Deprecations**:
   - Deprecated Code identifizieren
   - Durch neue Implementierung ersetzen

### Update-Prozess

1. **Detection**: Änderung wird erkannt
2. **Impact Analysis**: Auswirkungen werden analysiert
3. **Update Generation**: Automatische Code/Config Updates werden generiert
4. **Validation**: Updates werden getestet (falls möglich)
5. **Deployment**: Updates werden automatisch deployed
6. **Verification**: Erfolgreiche Integration wird verifiziert

## Dashboard Integration

Die erkannten Änderungen werden im `/intern` Dashboard angezeigt:

- **Tab: Externe Änderungen**: Übersicht aller Provider-Änderungen
- **Provider Status**: Status pro Provider (OK, Warning, Error)
- **Change Log**: Detaillierte Liste aller Änderungen
- **Filter**: Nach Provider, Status, Impact filtern
- **Export**: CSV-Export für Reports

## Erweiterung

### Neuen Monitor hinzufügen

1. Erstelle neue Monitor-Klasse:

```typescript
export class NewProviderMonitor extends ExternalAPIMonitor {
  constructor(supabase: SupportSupabaseClient, logger: Logger) {
    super(supabase, logger, 'NewProvider');
  }

  async checkForChanges(): Promise<ChangeDetectionResult> {
    // Implementierung
  }
}
```

2. In `monitoring-service.ts` registrieren:

```typescript
this.monitors = [
  // ... existing monitors
  new NewProviderMonitor(supabase, logger),
];
```

## Logging

Alle Monitoring-Aktivitäten werden geloggt:

- Info: Erfolgreiche Checks, erkannte Änderungen
- Warn: Fehlgeschlagene Checks, nicht anwendbare Updates
- Error: Kritische Fehler, Update-Fehler

## Sicherheit

- **RLS Policies**: Nur Service Role kann schreiben
- **Authentifizierte Nutzer**: Können lesen (für Dashboard)
- **Audit Logs**: Alle Updates werden geloggt
- **Rollback**: Bei fehlgeschlagenen Updates wird Rollback durchgeführt

