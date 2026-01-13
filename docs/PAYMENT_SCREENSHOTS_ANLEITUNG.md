# Payment Screenshots - Anleitung zur Erstellung

## Automatische Screenshot-Generierung

### Voraussetzungen

1. **Development Server läuft** auf Port 3999:
   ```bash
   cd frontend
   npm run dev
   ```

2. **In einem neuen Terminal** Screenshots generieren:
   ```bash
   cd frontend
   npm run screenshots:payment
   ```

Das Script erstellt automatisch alle Payment-Screenshots und speichert sie in:
`frontend/public/docs/screenshots/`

### Zu erstellende Screenshots

Das Script erstellt folgende Screenshots automatisch:

- ✅ `checkout-page.png` - Haupt-Checkout-Seite
- ✅ `payment-method-selector.png` - Payment Method Selector
- ✅ `payment-method-card.png` - Payment Method Card
- ✅ `checkout-form.png` - Checkout Form
- ✅ `payment-status-success.png` - Payment Status Success
- ✅ `payment-status-failed.png` - Payment Status Failed
- ✅ `checkout-success.png` - Checkout Success Seite
- ✅ `checkout-cancel.png` - Checkout Cancel Seite

## Manuelle Screenshot-Erstellung

Falls der automatische Weg nicht funktioniert:

### 1. Server starten

```bash
cd frontend
npm run dev
```

### 2. Screenshots erstellen

Öffnen Sie im Browser die folgenden URLs und machen Sie Screenshots:

1. **Checkout-Seite:**
   - URL: `http://localhost:3999/de/screenshots?section=checkout-page`
   - Screenshot: `frontend/public/docs/screenshots/checkout-page.png`

2. **Payment Method Selector:**
   - URL: `http://localhost:3999/de/screenshots?section=payment-method-selector`
   - Screenshot: `frontend/public/docs/screenshots/payment-method-selector.png`

3. **Payment Method Card:**
   - URL: `http://localhost:3999/de/screenshots?section=payment-method-card`
   - Screenshot: `frontend/public/docs/screenshots/payment-method-card.png`

4. **Checkout Form:**
   - URL: `http://localhost:3999/de/screenshots?section=checkout-form`
   - Screenshot: `frontend/public/docs/screenshots/checkout-form.png`

5. **Payment Status Success:**
   - URL: `http://localhost:3999/de/screenshots?section=payment-status-success`
   - Screenshot: `frontend/public/docs/screenshots/payment-status-success.png`

6. **Payment Status Failed:**
   - URL: `http://localhost:3999/de/screenshots?section=payment-status-failed`
   - Screenshot: `frontend/public/docs/screenshots/payment-status-failed.png`

7. **Checkout Success:**
   - URL: `http://localhost:3999/de/screenshots?section=checkout-success`
   - Screenshot: `frontend/public/docs/screenshots/checkout-success.png`

8. **Checkout Cancel:**
   - URL: `http://localhost:3999/de/screenshots?section=checkout-cancel`
   - Screenshot: `frontend/public/docs/screenshots/checkout-cancel.png`

### 3. Screenshot-Tool verwenden

**Browser DevTools:**
1. Öffnen Sie DevTools (F12)
2. Wählen Sie den Bereich `#screenshot-content` aus
3. Rechtsklick → "Capture node screenshot"

**Browser Extension:**
- Awesome Screenshot
- Full Page Screen Capture
- GoFullPage

**macOS:**
- `Cmd + Shift + 4` → Bereich auswählen
- `Cmd + Shift + 3` → Vollbild

**Windows:**
- Snipping Tool
- Windows + Shift + S

## Backend/Dashboard Screenshots (Manuell)

Diese Screenshots müssen manuell erstellt werden, da sie externe Dashboards zeigen:

### Stripe Dashboard

1. Öffnen Sie https://dashboard.stripe.com/
2. Loggen Sie sich ein
3. Gehen Sie zu **Developers → API keys**
4. Machen Sie einen Screenshot
5. Speichern Sie als: `frontend/public/docs/screenshots/stripe-dashboard.png`

### PayPal Dashboard

1. Öffnen Sie https://developer.paypal.com/
2. Loggen Sie sich ein
3. Gehen Sie zu **Dashboard → My Apps & Credentials**
4. Machen Sie einen Screenshot
5. Speichern Sie als: `frontend/public/docs/screenshots/paypal-dashboard.png`

### Stripe Webhook Config

1. Öffnen Sie Stripe Dashboard → **Developers → Webhooks**
2. Klicken Sie auf einen Webhook oder erstellen Sie einen neuen
3. Machen Sie einen Screenshot der Konfiguration (mit Endpoint URL und Events)
4. Speichern Sie als: `frontend/public/docs/screenshots/stripe-webhook-config.png`

### PayPal Webhook Config

1. Öffnen Sie PayPal Developer Dashboard → **Webhooks**
2. Klicken Sie auf einen Webhook oder erstellen Sie einen neuen
3. Machen Sie einen Screenshot der Konfiguration
4. Speichern Sie als: `frontend/public/docs/screenshots/paypal-webhook-config.png`

### Supabase Subscriptions Table

1. Öffnen Sie Supabase Dashboard → **Table Editor**
2. Wählen Sie die `subscriptions` Tabelle
3. Machen Sie einen Screenshot (mit Daten wenn möglich)
4. Speichern Sie als: `frontend/public/docs/screenshots/supabase-subscriptions.png`

## Screenshot-Anforderungen

- **Format:** PNG
- **Mindestbreite:** 1200px (für Frontend-Screenshots)
- **Qualität:** Hochauflösend (2x für Retina-Displays empfohlen)
- **Optimierung:** Optional mit Tools wie TinyPNG komprimieren

## Verzeichnisstruktur

Alle Screenshots werden gespeichert in:

```
frontend/
└── public/
    └── docs/
        └── screenshots/
            ├── checkout-page.png
            ├── payment-method-selector.png
            ├── payment-method-card.png
            ├── checkout-form.png
            ├── payment-status-success.png
            ├── payment-status-failed.png
            ├── checkout-success.png
            ├── checkout-cancel.png
            ├── stripe-dashboard.png (manuell)
            ├── paypal-dashboard.png (manuell)
            ├── stripe-webhook-config.png (manuell)
            ├── paypal-webhook-config.png (manuell)
            └── supabase-subscriptions.png (manuell)
```

## Troubleshooting

### Server läuft nicht

```bash
# Starte Server
cd frontend
npm run dev
```

### Screenshots sind leer/weiß

- Warten Sie, bis die Seite vollständig geladen ist
- Prüfen Sie, ob JavaScript-Fehler in der Konsole erscheinen
- Erhöhen Sie die Wartezeit im Script (aktuell 2 Sekunden)

### Screenshots fehlen Elemente

- Vergrößern Sie den Browser-Fenster
- Scrollen Sie zum richtigen Bereich
- Verwenden Sie Full-Page-Screenshots wenn nötig

---

**Letzte Aktualisierung:** November 2025








