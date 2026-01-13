# DSGVO-Konformität: BSP WhatsApp Integration

## ✅ Implementierte DSGVO-Maßnahmen

### 1. **Explizite Zustimmung (Consent)**
- ✅ Checkbox für Datenweitergabe an BSP
- ✅ Checkbox für Auftragsverarbeitungsvertrag (AVV)
- ✅ Transparente Information über übertragene Daten
- ✅ Consent-Timestamp wird gespeichert

### 2. **Datenminimierung**
- ✅ **KEINE** personenbezogenen Kundendaten werden an BSP übertragen
- ✅ Nur Bot-Konfiguration (Flow-Daten)
- ✅ OAuth-Zugangsdaten (verschlüsselt)
- ✅ Webhook-Konfiguration

### 3. **Token-Verschlüsselung**
- ✅ Access Tokens werden verschlüsselt gespeichert
- ✅ AES-256-GCM Verschlüsselung
- ⚠️ TODO: Production Key Management (Supabase Vault empfohlen)

### 4. **Transparenz**
- ✅ Klare Information über Datenverarbeitung
- ✅ Links zu Datenschutzerklärung
- ✅ Links zu Auftragsverarbeitungsvertrag (AVV)
- ✅ Hinweis auf EU-Datenhaltung (360dialog)

### 5. **Rechtmäßigkeit (Art. 6 DSGVO)**
- ✅ Vertragserfüllung (Art. 6 Abs. 1 lit. b)
- ✅ Berechtigtes Interesse (Art. 6 Abs. 1 lit. f)
- ✅ Explizite Einwilligung (Art. 6 Abs. 1 lit. a)

## ⚠️ Noch zu implementieren

### 1. **Supabase Vault für Token-Speicherung**
```typescript
// TODO: Use Supabase Vault instead of manual encryption
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
await supabase.vault.storeSecret('whatsapp_token_' + botId, accessToken);
```

### 2. **Auftragsverarbeitungsvertrag (AVV)**
- AVV-Vorlage für jeden BSP bereitstellen
- Automatische AVV-Versendung bei BSP-Auswahl
- AVV-Status-Tracking in Datenbank

### 3. **Löschung auf Anfrage (Art. 17 DSGVO)**
- Endpoint zum Löschen von BSP-Verbindungen
- Automatische Token-Löschung
- Bestätigung der Löschung

### 4. **Datenschutz-Folgenabschätzung (DSFA)**
- Dokumentation der Risiken
- Maßnahmen zur Risikominimierung

### 5. **Technische und organisatorische Maßnahmen (TOM)**
- Zugriffskontrolle
- Verschlüsselung (bereits implementiert)
- Logging und Audit-Trails

## 📋 BSP-spezifische DSGVO-Informationen

### 360dialog (Empfohlen)
- ✅ EU-basiert
- ✅ DSGVO-konform
- ✅ AVV verfügbar
- ✅ Datenhaltung in EU

### Twilio
- ⚠️ EU-Data-Residency optional (muss aktiviert werden)
- ✅ DSGVO-konform mit AVV
- ⚠️ Standard-Data-Residency: USA (Standardvertragsklauseln)

### MessageBird
- ⚠️ AVV erforderlich
- ✅ DSGVO-konform
- ⚠️ Datenhaltung: Global (EU-Data-Residency möglich)

## 🔒 Sicherheitsmaßnahmen

1. **Verschlüsselung**
   - Tokens: AES-256-GCM
   - HTTPS: Erzwungen (TLS 1.3)
   - Datenbank: Supabase Encryption at Rest

2. **Zugriffskontrolle**
   - Row Level Security (RLS) in Supabase
   - User-basierte Zugriffskontrolle
   - API-Keys verschlüsselt

3. **Monitoring**
   - Audit-Logs für Zugriffe
   - Fehler-Tracking
   - Anomalie-Erkennung

## 📝 Rechtliche Dokumente

Folgende Dokumente müssen erstellt/bereitgestellt werden:

1. **Datenschutzerklärung** (`/legal/privacy`)
   - Information über BSP-Integration
   - Datenkategorien
   - Rechtsgrundlage
   - Speicherdauer

2. **Auftragsverarbeitungsvertrag (AVV)** (`/legal/data-processing`)
   - Vorlage für Kunden
   - BSP-spezifische AVVs

3. **Nutzungsbedingungen**
   - BSP-Verbindungen
   - Verantwortlichkeiten

## ✅ Checkliste vor Go-Live

- [ ] Supabase Vault für Token-Speicherung implementiert
- [ ] AVV-Vorlagen für alle BSPs erstellt
- [ ] Datenschutzerklärung aktualisiert
- [ ] Lösch-Endpoint implementiert
- [ ] Audit-Logging aktiviert
- [ ] DSFA durchgeführt
- [ ] Rechtliche Prüfung abgeschlossen

## 🚀 Best Practices

1. **Minimal Data Transfer**: Nur notwendige Daten an BSP
2. **Encryption at Rest**: Alle Tokens verschlüsselt
3. **Encryption in Transit**: HTTPS/TLS für alle Verbindungen
4. **Access Control**: RLS + User-basierte Zugriffe
5. **Audit Trails**: Logging aller Zugriffe
6. **Regular Reviews**: Jährliche DSGVO-Prüfung

## 📞 Support

Bei Fragen zur DSGVO-Konformität:
- Datenschutzbeauftragter kontaktieren
- Rechtliche Beratung einholen
- DSGVO-Dokumentation prüfen

