# Monitoring System Changelog

## Implementierte API-Checks

### Meta/WhatsApp Monitor ✅

- **API Version Check**: 
  - Testet verfügbare API-Versionen direkt via Graph API
  - Parst Meta Changelog für Version-Informationen
  - Erkennt automatisch neue Versionen (v19.0, v20.0, etc.)

- **Webhook Changes**:
  - Überwacht Meta Webhook-Dokumentation
  - Erkennt Signature-Algorithmus-Änderungen
  - Prüft Webhook-Feld-Änderungen

- **Rate Limit Changes**:
  - Überwacht Rate-Limiting-Dokumentation
  - Erkennt Änderungen in Rate-Limits

- **Deprecations**:
  - Überwacht Meta Changelog auf Deprecations
  - Prüft spezifische Endpoints die wir nutzen:
    - `/messages`
    - `/phone_numbers`
    - `/subscribed_apps`
    - `/whatsapp_business_accounts`

### Stripe Monitor ✅

- **API Changelog Check**:
  - Überwacht Stripe's Upgrade-Dokumentation
  - Erkennt recent entries (letzte 30 Tage)
  - Erkennt Breaking Changes Keywords

- **Webhook Changes**:
  - Überwacht Stripe Webhook Signature Dokumentation
  - Erkennt Signature-Algorithmus-Änderungen
  - Prüft Timestamp-Tolerance-Änderungen

### PayPal Monitor ✅

- **API Changelog Check**:
  - Überwacht PayPal Release Notes
  - Erkennt recent entries (letzte 30 Tage)
  - Erkennt Breaking Changes Keywords

### Mollie Monitor ✅

- **API Changelog Check**:
  - Überwacht Mollie Changelog
  - Erkennt recent entries (letzte 30 Tage)
  - Erkennt Breaking Changes Keywords

### Hetzner Monitor ✅

- **API Documentation Check**:
  - Überwacht Hetzner Cloud Dokumentation
  - Erkennt Changelog/Release Notes Updates
  - Erkennt recent entries (letzte 30 Tage)

### n8n Monitor ✅

- **Version Updates**:
  - Nutzt GitHub Releases API
  - Erkennt neue Versionen automatisch
  - Prüft auf Breaking Changes in Release Notes
  - Erkennt Major Version Updates

### Supabase Monitor ✅

- **Changelog Check**:
  - Überwacht Supabase Platform Changelog
  - Erkennt recent entries (letzte 30 Tage)
  - Prüft auf relevante Features:
    - Realtime
    - Database
    - Auth
    - Storage
    - Edge Functions
    - Row Level Security
  - Erkennt Breaking Changes Keywords

## Technische Details

### Fetch-Strategien

Alle Monitore nutzen:
- **User-Agent**: `OWONA-Monitoring/1.0` für Identifikation
- **Error Handling**: Graceful degradation bei Fehlern
- **Rate Limiting**: Respektiert durch Delays zwischen Checks
- **Caching**: Verhindert Duplikate durch `changeExists()` Check

### Pattern Matching

- **Datum-Patterns**: Verschiedene Formate (MM/DD/YYYY, YYYY-MM-DD, etc.)
- **Version-Patterns**: vX.Y, version X.Y, etc.
- **Keyword-Detection**: Breaking, Deprecated, Removed, etc.

### Impact-Bewertung

- **Low**: Dokumentations-Updates, kleine Änderungen
- **Medium**: API Updates, neue Features
- **High**: Deprecations, wichtige Änderungen
- **Critical**: Breaking Changes, entfernte Features

## Zukünftige Verbesserungen

1. **Baseline Storage**: Speichere aktuelle Werte für Vergleich
2. **Diff Detection**: Erkenne spezifische Änderungen (nicht nur "es gibt Änderungen")
3. **RSS/Atom Feeds**: Nutze Feeds falls verfügbar (genauer als HTML-Parsing)
4. **API Endpoints**: Nutze offizielle API-Endpoints falls verfügbar
5. **Machine Learning**: Erkenne Breaking Changes automatisch in Texten

