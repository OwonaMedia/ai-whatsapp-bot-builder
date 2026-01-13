# Facebook Integration Setup - Embedded Signup

## 📋 Vorbereitung

### 1. Facebook Developer Account
1. Gehe zu: https://developers.facebook.com/
2. Erstelle eine neue App: "Business" → "Consumer" oder "Business"
3. App Name: "WhatsApp Bot Builder"

### 2. WhatsApp Produkt hinzufügen
1. In deiner App Dashboard: "Add Product" → "WhatsApp"
2. Erstelle einen Test-Account (für Entwicklung)
3. Phone Number ID und Access Token werden automatisch generiert

### 3. Embedded Signup aktivieren
1. In WhatsApp Settings: "Embedded Signup" aktivieren
2. Erstelle eine Embedded Signup Configuration:
   - Name: "WhatsApp Bot Builder Signup"
   - Allowed Domains: `whatsapp.owona.de`
   - Business Account Selection: Aktiviert
   - Phone Number Selection: Aktiviert

### 4. Environment Variables setzen

Füge zur `.env.local` hinzu:
```bash
# Facebook App
NEXT_PUBLIC_FACEBOOK_APP_ID=1234567890123456
NEXT_PUBLIC_FACEBOOK_EMBEDDED_CONFIG_ID=config_id_from_facebook

# Supabase (bereits vorhanden)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxxxx
```

## 🔧 Meta App Dashboard Setup

### Schritt 1: App erstellen
```
Facebook Developers → My Apps → Create App
- Business Account: "Owona"
- App Type: Business
- App Name: "WhatsApp Bot Builder"
```

### Schritt 2: WhatsApp Produkt hinzufügen
```
App Dashboard → Add Product → WhatsApp
- Test Number anfordern
- Webhook URL: https://whatsapp.owona.de/api/whatsapp/webhook
- Verify Token: whatsapp_verify_token_2025
```

### Schritt 3: Embedded Signup konfigurieren
```
WhatsApp → Settings → Embedded Signup → Create Configuration
- Configuration Name: "Bot Builder Signup"
- Business Account Selection: Enabled
- Phone Number Selection: Enabled
- Allowed Domains: whatsapp.owona.de
```

### Schritt 4: App Review (für Production)
```
App Review → Permissions → whatsapp_business_management
- Use Case: "Customer Communication"
- Details: "No-code WhatsApp Bot Builder SaaS"
```

## 🎯 Embedded Signup Flow

### Für Kunden (ideal):
```
1. Klick auf "WhatsApp verbinden"
2. Facebook Login Pop-up öffnet
3. Business Account auswählen
4. Phone Number auswählen
5. "Zulassen" klicken
6. Fertig! Token werden automatisch gespeichert
```

### Technische Implementierung:

```typescript
// Frontend: Facebook SDK Call
const result = await window.FB.login({
  scope: 'whatsapp_business_management',
  config_id: process.env.NEXT_PUBLIC_FACEBOOK_EMBEDDED_CONFIG_ID
});

// Result enthält automatisch:
// - accessToken
// - phoneNumberId
// - businessAccountId
```

## 🛠️ Troubleshooting

### Problem: "Invalid App ID"
**Lösung:** Überprüfe `NEXT_PUBLIC_FACEBOOK_APP_ID` in `.env.local`

### Problem: "Embedded Signup not configured"
**Lösung:** Erstelle Embedded Signup Configuration im Meta Dashboard

### Problem: "Domain not allowed"
**Lösung:** Füge `whatsapp.owona.de` zu Allowed Domains hinzu

### Problem: Webhook verification failed
**Lösung:** Implementiere GET `/api/whatsapp/webhook` mit Verify Token

## 🚀 Production Setup

### 1. Business Verification
Meta verlangt Business Verification für Live-Apps:
- Business Website: https://owona.de
- Business Email: bestätigte Domain
- Business Dokumente: Handelsregister etc.

### 2. App Review Process
- 5-10 Business Tage Review-Zeit
- Erfolgsrate: ~80% bei korrekter Dokumentation
- Kosten: Kostenlos

### 3. Rate Limits
- 1000 Messages/24h pro Phone Number (kostenlos)
- Upgrade auf höhere Limits möglich

## 🔒 Sicherheit

### Token Storage
- Access Token: Encrypted in Datenbank
- Phone Number ID: Klartext (Meta ID)
- Business Account ID: Klartext

### Webhook Security
- Verify Token für Webhook-Verifizierung
- HMAC-SHA256 Signatur Validierung
- Request Source IP Whitelisting

## 📊 Analytics & Monitoring

### Meta Insights
- Message Delivery Rates
- User Response Rates
- Conversation Analytics

### Custom Analytics
- Bot Performance Metriken
- User Engagement Stats
- Error Rate Monitoring

---

## 🎯 Nächste Schritte

1. ✅ Facebook Developer App erstellen
2. ✅ WhatsApp Produkt hinzufügen
3. ✅ Embedded Signup konfigurieren
4. ⏳ Environment Variables setzen
5. ⏳ Frontend Testing
6. ⏳ Webhook Handler implementieren
7. ⏳ Production App Review

**Status:** Facebook SDK Integration ✅ | Embedded Signup bereit für Testing
