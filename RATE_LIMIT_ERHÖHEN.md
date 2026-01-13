# Rate Limit mit Custom SMTP erhöhen

## Problem
Auch mit **Custom SMTP aktiviert** gibt Supabase ein **Standard-Rate Limit von 30 E-Mails pro Stunde** vor.

Laut Supabase Dokumentation:
> "To protect the reputation of your newly set up service a low rate-limit of 30 messages per hour is imposed. To adjust this to an acceptable value for your use case head to the **Rate Limits configuration page**."

## Lösung: Rate Limit im Dashboard erhöhen

### Schritt 1: Supabase Dashboard öffnen
1. Gehen Sie zu: https://supabase.com/dashboard
2. Wählen Sie Ihr Projekt: `ugsezgnkyhcmsdpohuwf`

### Schritt 2: Rate Limits Seite öffnen
1. Klicken Sie auf **Authentication** in der linken Sidebar
2. Klicken Sie auf **Rate Limits**

**ODER direkt:**
- https://supabase.com/dashboard/project/ugsezgnkyhcmsdpohuwf/auth/rate-limits

### Schritt 3: E-Mail Rate Limit erhöhen

Suchen Sie nach **"Email sending rate limit"** oder **"All endpoints that send emails"**

**Aktuell:** 30 E-Mails pro Stunde (Standard)

**Empfohlene Werte:**
- **Development/Testing:** 100-200 E-Mails/Stunde
- **Production (klein):** 500 E-Mails/Stunde
- **Production (mittel):** 1000-5000 E-Mails/Stunde
- **Production (groß):** 10000+ E-Mails/Stunde

**Für Tests jetzt:**
- Setzen Sie **200 E-Mails pro Stunde** (ausreichend für Tests)

### Schritt 4: Speichern
1. Klicken Sie auf **Save**
2. Änderungen sind sofort aktiv

## Weitere Rate Limits

Sie können auch andere Rate Limits anpassen:

### OTP Rate Limit
- **Standard:** 360 OTPs pro Stunde
- Kann erhöht werden, falls nötig

### Magic Link / Signup Rate Limit
- **Standard:** 60 Sekunden zwischen Requests
- Kann verringert werden (z.B. 30 Sekunden)

## Wichtig

⚠️ **Vorsicht beim Erhöhen:**
- Zu hohe Limits können zu Spam-Verdacht führen
- Starten Sie mit moderaten Werten
- Erhöhen Sie schrittweise bei Bedarf

✅ **Best Practice:**
- Für Tests: 100-200 E-Mails/Stunde
- Für Production: 500-1000 E-Mails/Stunde (Start)
- Bei Bedarf später erhöhen

## Nach der Änderung

1. ✅ Rate Limit ist sofort aktiv
2. ✅ Keine Wartezeit nötig
3. ✅ Testen Sie mit neuer Registrierung

---
**Datum:** 2025-11-02  
**Status:** ⚠️ Rate Limit muss im Dashboard erhöht werden!

