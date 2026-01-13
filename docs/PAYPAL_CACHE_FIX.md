# PayPal Return-URL Cache-Problem behoben

## Problem

PayPal-Zahlungen schlugen weiterhin fehl mit:
```
"field":"/application_context/return_url",
"value":"https://whatsapp.owona.de/checkout/success?session_id={CHECKOUT_SESSION_ID}",
"issue":"INVALID_PARAMETER_SYNTAX"
```

Obwohl die Dateien aktualisiert wurden, verwendete Next.js die alte gecachte Version.

## Lösung

### 1. Next.js Cache vollständig gelöscht
```bash
rm -rf .next/*
```

### 2. App neu gestartet
```bash
pm2 stop whatsapp-bot-builder
pm2 start npm --name whatsapp-bot-builder -- run dev
```

### 3. Dateien verifiziert

**CheckoutForm.tsx**:
```typescript
returnUrl: selectedMethod.provider === 'paypal' 
  ? `${window.location.origin}/${locale}/checkout/paypal/success`
  : `${window.location.origin}/${locale}/checkout/success`,
```

**API Route (route.ts)**:
```typescript
const finalReturnUrl = returnUrl || `${appUrl}/${locale || 'de'}/checkout/paypal/success`;
```

## Status

- ✅ Next.js Cache gelöscht
- ✅ Return-URLs korrigiert (Frontend + Backend)
- ✅ App neu gestartet mit frischem Build
- ✅ Beide Dateien verifiziert
- ✅ App läuft (ID: 51)

## Jetzt testen

1. **Lade die Checkout-Seite neu**: `https://whatsapp.owona.de/de/checkout?tier=professional`
2. **Wähle PayPal** als Zahlungsmethode
3. **Klicke auf "Weiter"**
4. **Erwartung**: Weiterleitung zu PayPal (kein 500 Error mehr)

## Debugging

Falls es immer noch nicht funktioniert, prüfe:

```bash
# Server-Logs live verfolgen
pm2 logs whatsapp-bot-builder --lines 0

# Dann PayPal-Zahlung durchführen und Logs beobachten
```

Erwartete Logs bei erfolgreicher Order-Erstellung:
```
[PayPal Payment Create] Creating order...
POST /api/payments/create 200 in XXXms
```

Fehler-Logs würden zeigen:
```
[PayPal] Error creating order: ...
POST /api/payments/create 500 in XXXms
```

## Wichtig

- Der Cache-Ordner `.next/` wird bei jedem Build neu erstellt
- Bei Änderungen an API-Routes oder Components immer App neu starten
- Bei hartnäckigen Problemen: Cache löschen mit `rm -rf .next/*`

