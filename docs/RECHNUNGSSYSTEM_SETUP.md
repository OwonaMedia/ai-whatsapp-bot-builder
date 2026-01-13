# Rechnungssystem - Setup-Anleitung

## ✅ Was wurde implementiert

### 1. Datenbank-Schema
- ✅ `008_invoices.sql` Migration erstellt
- ✅ `invoices` Tabelle mit allen Feldern
- ✅ `invoice_number_sequence` für fortlaufende Nummern
- ✅ Funktionen: `generate_invoice_number()`, `create_invoice()`, `get_user_invoices()`
- ✅ RLS (Row Level Security) aktiviert

### 2. PDF-Generierung
- ✅ `lib/invoices/invoiceGenerator.ts` - PDF-Generierung mit PDFKit
- ✅ `lib/invoices/invoiceHelper.ts` - Helper-Funktionen
- ✅ Mehrsprachige Rechnungstexte (DE, EN, FR)
- ✅ Kleinunternehmer-Regelung implementiert

### 3. Automatische Rechnungserstellung
- ✅ Stripe Webhook erweitert (`app/api/payments/stripe/webhook/route.ts`)
- ✅ PayPal Webhook erweitert (`app/api/payments/paypal/webhook/route.ts`)
- ✅ Metadata in Payment Intent hinzugefügt (customerEmail, customerName, locale)

### 4. API-Endpoints
- ✅ `GET /api/invoices` - Liste aller Rechnungen
- ✅ `GET /api/invoices/download/[invoiceNumber]` - PDF-Download

### 5. Frontend-Integration
- ✅ `CheckoutForm` erweitert (locale wird übergeben)
- ✅ `usePayment` Hook erweitert (locale Parameter)

## 📋 Setup-Schritte

### Schritt 1: Datenbank-Migration ausführen

```bash
# Auf dem Server oder lokal via Supabase CLI
supabase migration up

# Oder direkt in Supabase Dashboard:
# SQL Editor > New Query > Paste 008_invoices.sql > Run
```

### Schritt 2: Environment Variables setzen

```bash
# Auf dem Server
cd /var/www/whatsapp-bot-builder/frontend

# Firmeninformationen (optional, Standardwerte in Code)
export COMPANY_NAME="OWONA Digital Solutions"
export COMPANY_STREET="Musterstraße 123"
export COMPANY_CITY="Berlin"
export COMPANY_ZIP="10115"
export COMPANY_COUNTRY="Deutschland"
export COMPANY_EMAIL="info@owona.de"
export COMPANY_PHONE="+49 30 12345678"
export COMPANY_WEBSITE="https://whatsapp.owona.de"

# Rechnungsverzeichnis
export INVOICES_DIR="/var/www/whatsapp-bot-builder/invoices"

# In .env.local oder .env.production speichern
```

### Schritt 3: Rechnungsverzeichnis erstellen

```bash
# Auf dem Server
mkdir -p /var/www/whatsapp-bot-builder/invoices
chmod 755 /var/www/whatsapp-bot-builder/invoices
```

### Schritt 4: PDFKit installieren

```bash
# Auf dem Server
cd /var/www/whatsapp-bot-builder/frontend
npm install pdfkit @types/pdfkit --legacy-peer-deps
```

### Schritt 5: App neu starten

```bash
# Auf dem Server
cd /var/www/whatsapp-bot-builder/frontend
pm2 restart whatsapp-bot-builder
```

## 🧪 Testen

### 1. Test-Zahlung durchführen
- Gehen Sie zu `/checkout?tier=starter`
- Führen Sie eine Test-Zahlung durch
- Prüfen Sie Server-Logs: `pm2 logs whatsapp-bot-builder | grep "Invoice"`

### 2. Rechnung in Datenbank prüfen

```sql
-- In Supabase SQL Editor
SELECT 
  invoice_number,
  invoice_date,
  amount_gross,
  currency,
  status,
  pdf_path,
  pdf_url
FROM invoices
ORDER BY created_at DESC
LIMIT 5;
```

### 3. PDF-Datei prüfen

```bash
# Auf dem Server
ls -lh /var/www/whatsapp-bot-builder/invoices/
```

### 4. API-Endpoint testen

```bash
# Rechnungen abrufen (mit Auth-Token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://whatsapp.owona.de/api/invoices
```

## 📝 Nächste Schritte

1. **Dashboard-Komponente** für Rechnungsliste erstellen
2. **Rechnungs-E-Mail-Versand** implementieren
3. **Rechnungs-Vorschau** im Browser
4. **Rechnungs-Stornierung** für Refunds

## 🔍 Troubleshooting

### Rechnung wird nicht erstellt

1. **Webhook-Logs prüfen**
   ```bash
   pm2 logs whatsapp-bot-builder | grep -i "invoice\|rechnung"
   ```

2. **Datenbank prüfen**
   ```sql
   SELECT * FROM invoices ORDER BY created_at DESC LIMIT 1;
   ```

3. **PDF-Verzeichnis prüfen**
   ```bash
   ls -la /var/www/whatsapp-bot-builder/invoices/
   ```

### PDF kann nicht generiert werden

- Prüfen Sie, ob `pdfkit` installiert ist: `npm list pdfkit`
- Prüfen Sie Server-Logs auf Fehler
- Prüfen Sie Schreibrechte: `chmod 755 /var/www/whatsapp-bot-builder/invoices`

### Rechnungsnummer wird nicht generiert

- Prüfen Sie `invoice_number_sequence` Tabelle:
  ```sql
  SELECT * FROM invoice_number_sequence;
  ```
- Prüfen Sie, ob Migration ausgeführt wurde

## 📚 Weitere Dokumentation

- Siehe `RECHNUNGSSYSTEM.md` für detaillierte Dokumentation
- Siehe `008_invoices.sql` für Datenbank-Schema
- Siehe `lib/invoices/invoiceGenerator.ts` für PDF-Generierung

