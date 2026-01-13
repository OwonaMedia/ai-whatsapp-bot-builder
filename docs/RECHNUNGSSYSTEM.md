# Rechnungssystem - Dokumentation

## Übersicht

Das Rechnungssystem erstellt automatisch PDF-Rechnungen nach jeder erfolgreichen Zahlung. Die Rechnungen werden:
- In der Datenbank gespeichert
- Als PDF auf dem Server gespeichert
- Im Kundenkonto angezeigt
- In der Sprache des Kunden erstellt

## Features

### ✅ Implementiert

1. **Datenbank-Schema** (`008_invoices.sql`)
   - `invoices` Tabelle mit allen Rechnungsdaten
   - `invoice_number_sequence` für fortlaufende Rechnungsnummern
   - Funktionen: `generate_invoice_number()`, `create_invoice()`, `get_user_invoices()`
   - RLS (Row Level Security) für Datenschutz

2. **Rechnungsnummern-System**
   - Format: `YYYY-NNNN` (z.B. `2025-0001`)
   - Jahreszahl als Prefix
   - Fortlaufende Nummerierung pro Jahr
   - Automatische Generierung

3. **PDF-Generierung** (`lib/invoices/invoiceGenerator.ts`)
   - PDFKit-basiert
   - Professionelles Layout
   - Firmeninformationen
   - Kundeninformationen
   - Rechnungspositionen
   - Kleinunternehmer-Hinweis

4. **Kleinunternehmer-Regelung**
   - Keine Umsatzsteuer ausgewiesen
   - Hinweis: "Gemäß §19 UStG wird keine Umsatzsteuer ausgewiesen."
   - Konfigurierbar über `COMPANY_DATA.isSmallBusiness`

5. **Mehrsprachigkeit**
   - Unterstützte Sprachen: DE, EN, FR
   - Rechnungstexte in `INVOICE_TEXTS`
   - Automatische Sprachauswahl basierend auf `locale`

6. **Automatische Rechnungserstellung**
   - Nach erfolgreicher Stripe-Zahlung (Webhook)
   - Nach erfolgreicher PayPal-Zahlung (Webhook)
   - Integration in `subscription-activation.ts`

7. **Server-Speicherung**
   - PDFs werden in `/var/www/whatsapp-bot-builder/invoices/` gespeichert
   - Konfigurierbar über `INVOICES_DIR` Environment Variable
   - Dateiname: `invoice_YYYY_NNNN.pdf`

8. **API-Endpoints**
   - `GET /api/invoices` - Liste aller Rechnungen des Users
   - `GET /api/invoices/download/[invoiceNumber]` - PDF-Download

## Konfiguration

### Environment Variables

```bash
# Firmeninformationen
COMPANY_NAME="OWONA Digital Solutions"
COMPANY_STREET="Musterstraße 123"
COMPANY_CITY="Berlin"
COMPANY_ZIP="10115"
COMPANY_COUNTRY="Deutschland"
COMPANY_EMAIL="info@owona.de"
COMPANY_PHONE="+49 30 12345678"
COMPANY_WEBSITE="https://whatsapp.owona.de"
COMPANY_TAX_ID="" # Optional für Kleinunternehmer

# Rechnungsverzeichnis
INVOICES_DIR="/var/www/whatsapp-bot-builder/invoices"
```

### Firmeninformationen anpassen

Bearbeiten Sie `lib/invoices/invoiceGenerator.ts`:

```typescript
const COMPANY_DATA = {
  name: process.env.COMPANY_NAME || 'Ihre Firma',
  // ...
};
```

## Datenbank-Migration

Die Migration `008_invoices.sql` muss in Supabase ausgeführt werden:

```bash
# Via Supabase CLI
supabase migration up

# Oder direkt in Supabase Dashboard
# SQL Editor > New Query > Paste 008_invoices.sql > Run
```

## Ablauf: Rechnungserstellung

1. **Zahlung erfolgreich** (Stripe/PayPal Webhook)
2. **Subscription aktivieren** (`activateSubscription`)
3. **Rechnung erstellen** (`createInvoiceFromPayment`)
   - Rechnungsnummer generieren
   - Rechnung in Datenbank speichern
   - PDF generieren
   - PDF auf Server speichern
   - PDF-URL in Datenbank aktualisieren

## Rechnungsformat

### Rechnungsnummer
- Format: `YYYY-NNNN`
- Beispiel: `2025-0001`, `2025-0002`, etc.
- Automatische Generierung pro Jahr

### Rechnungsinhalt
- Rechnungsnummer
- Rechnungsdatum
- Zahlungsstatus (Bezahlt)
- Zahlungsmethode (Stripe/PayPal)
- Rechnungsempfänger (Kunde)
- Rechnungspositionen
- Gesamtbetrag
- Kleinunternehmer-Hinweis

## API-Verwendung

### Rechnungen abrufen

```typescript
const response = await fetch('/api/invoices');
const { data } = await response.json();
console.log(data.invoices); // Array von Rechnungen
```

### Rechnung herunterladen

```typescript
const invoiceNumber = '2025-0001';
const response = await fetch(`/api/invoices/download/${invoiceNumber}`);
const blob = await response.blob();
// PDF-Datei herunterladen
```

## Frontend-Integration

### Rechnungen im Dashboard anzeigen

TODO: Dashboard-Komponente für Rechnungsliste erstellen

```typescript
// Beispiel-Komponente
import { useEffect, useState } from 'react';

export function InvoiceList() {
  const [invoices, setInvoices] = useState([]);
  
  useEffect(() => {
    fetch('/api/invoices')
      .then(res => res.json())
      .then(data => setInvoices(data.data.invoices));
  }, []);
  
  return (
    <div>
      {invoices.map(invoice => (
        <div key={invoice.id}>
          <p>{invoice.invoice_number}</p>
          <a href={invoice.pdf_url}>Download</a>
        </div>
      ))}
    </div>
  );
}
```

## Wartung

### Rechnungsverzeichnis prüfen

```bash
# Auf dem Server
ls -lh /var/www/whatsapp-bot-builder/invoices/
```

### Rechnungsnummer zurücksetzen

```sql
-- Für neues Jahr: Sequenz zurücksetzen
UPDATE invoice_number_sequence
SET last_number = 0
WHERE year = 2026;
```

## Troubleshooting

### Rechnung wird nicht erstellt

1. **Webhook-Logs prüfen**
   ```bash
   # Server-Logs
   pm2 logs whatsapp-bot-builder | grep "Invoice"
   ```

2. **Datenbank prüfen**
   ```sql
   SELECT * FROM invoices ORDER BY created_at DESC LIMIT 10;
   ```

3. **PDF-Verzeichnis prüfen**
   ```bash
   ls -la /var/www/whatsapp-bot-builder/invoices/
   ```

### PDF kann nicht generiert werden

- Prüfen Sie, ob `pdfkit` installiert ist: `npm list pdfkit`
- Prüfen Sie Server-Logs auf Fehler
- Prüfen Sie Schreibrechte im `INVOICES_DIR`

## Nächste Schritte

- [ ] Dashboard-Komponente für Rechnungsliste
- [ ] Rechnungs-Vorschau im Browser
- [ ] Rechnungs-E-Mail-Versand
- [ ] Rechnungs-Stornierung
- [ ] Rechnungs-Export (CSV/Excel)

