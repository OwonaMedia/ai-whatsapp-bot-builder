# E-Mail Rate Limit überschritten - Lösungen

## Problem
```
email rate limit exceeded
```

Supabase hat ein **Rate Limit** für E-Mails. Die Standard-SMTP-Konfiguration hat ein Limit von **ca. 4 E-Mails pro Stunde** (oder ähnlich).

## Lösungen

### Lösung 1: Warten (Kurzfristig) ⏰

**Option A: Rate Limit abwarten**
- Warten Sie **1 Stunde**, dann können Sie erneut E-Mails senden
- Das Rate Limit wird automatisch zurückgesetzt

**Option B: Andere E-Mail-Adresse verwenden**
- Verwenden Sie eine andere E-Mail-Adresse für Test-Registrierungen
- Jede E-Mail-Adresse hat ein eigenes Rate Limit

### Lösung 2: Custom SMTP aktivieren (Empfohlen) ✅

Mit **Custom SMTP** (z.B. Goneo) haben Sie **kein Rate Limit** mehr!

**Schritte:**

1. **Supabase Dashboard öffnen**
   - https://supabase.com/dashboard
   - Projekt: `ugsezgnkyhcmsdpohuwf`
   - Settings → Authentication → SMTP Settings

2. **Custom SMTP aktivieren**
   ```
   Enable Custom SMTP: ✅ AN
   
   SMTP Host: smtp.goneo.de
   SMTP Port: 465 (SSL) oder 587 (STARTTLS)
   SMTP User: info@owona.de
   SMTP Password: [Ihr Passwort]
   Sender Email: info@owona.de
   Sender Name: Owona Support
   ```

3. **Wichtig: Toggle Reset**
   - Nach dem Speichern: Toggle **ausschalten** und **wieder einschalten**
   - Warten Sie **30-60 Sekunden** für Propagierung
   - Test-E-Mail senden

4. **Testen**
   - Neue Registrierung durchführen
   - E-Mail sollte jetzt ohne Rate Limit ankommen

### Lösung 3: Development ohne E-Mail (Temporär)

Für lokales Testen können Sie:
- **Mailpit** verwenden (wird automatisch vom Supabase CLI gestartet)
- E-Mail-Verifizierung vorübergehend **deaktivieren** (nur für Development!)

## Rate Limit Details

**Standard Supabase SMTP:**
- ~4 E-Mails pro Stunde
- Best-Effort Basis
- Für Production nicht empfohlen

**Custom SMTP (z.B. Goneo):**
- Kein Rate Limit (je nach Provider)
- Production-ready
- Eigene Kontrolle

## Supabase MCP Expert verwenden

Sie können den Supabase Expert MCP Server nutzen:
```
# SMTP-Konfiguration analysieren
mcp_supabase-expert_analyze_supabase_smtp

# Troubleshooting
mcp_supabase-expert_troubleshoot_supabase_smtp
```

## Nächste Schritte

1. **Sofort:** Warten Sie 1 Stunde oder verwenden Sie andere E-Mail
2. **Langsam:** Custom SMTP aktivieren (siehe Lösung 2)
3. **Langfristig:** Custom SMTP ist für Production **Pflicht**

---
**Datum:** 2025-11-02  
**Status:** ⚠️ Rate Limit erreicht - Custom SMTP empfohlen

