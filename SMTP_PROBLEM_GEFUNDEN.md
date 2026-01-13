# SMTP-Problem identifiziert über Supabase MCP

## 🔍 Analyse-Ergebnis

**Datum:** 2025-11-02  
**Analyse:** Supabase Auth Logs über MCP

## ✅ Befund

Die E-Mail wurde **erfolgreich versendet**, aber:

- **Absender:** `noreply@mail.app.supabase.io` (Standard Supabase)
- **Sollte sein:** `info@owona.de` (Custom SMTP)
- **Status:** Custom SMTP wird **NICHT verwendet**

### Log-Eintrag:

```json
{
  "event": "mail.send",
  "mail_from": "noreply@mail.app.supabase.io",
  "mail_to": "salomon.owona@icloud.com",
  "mail_type": "confirmation"
}
```

## 🔧 Problem

Die Custom SMTP-Konfiguration in Supabase Dashboard ist zwar vorhanden, wird aber nicht aktiv verwendet. Supabase fällt auf den Standard-SMTP zurück.

## ✅ Lösung

### Schritt 1: Supabase Dashboard öffnen

1. https://supabase.com/dashboard
2. Projekt: `ugsezgnkyhcmsdpohuwf`
3. **Settings** > **Authentication**

### Schritt 2: SMTP Settings überprüfen

1. Scrollen Sie zu **SMTP Settings**
2. Prüfen Sie den Toggle **"Enable Custom SMTP"**:
   - Muss **exakt** auf **ON** stehen
   - Manchmal wird der Toggle angezeigt, ist aber nicht wirklich aktiviert
3. Deaktivieren Sie ihn kurz
4. Aktivieren Sie ihn erneut
5. Warten Sie 5 Sekunden

### Schritt 3: Alle Felder nochmal prüfen

Stellen Sie sicher, dass alle Felder **exakt** so ausgefüllt sind:

```
☐ Enable Custom SMTP:        ON (aktiviert!)

☐ SMTP Host:                 smtp.goneo.de
                              (NICHT mail.goneo.de!)

☐ SMTP Port:                 465
                              (oder 587 testen)

☐ SMTP User:                 info@owona.de
                              (vollständig, keine Leerzeichen!)

☐ SMTP Password:             Afidi2008!
                              (genau so, keine Leerzeichen!)

☐ Sender Name:               WhatsApp Bot Builder

☐ Sender Email:              info@owona.de
```

### Schritt 4: Speichern

1. Scrollen Sie nach unten
2. Klicken Sie auf **"Save"** (oder **"Save Changes"**)
3. Warten Sie auf Bestätigung
4. Warten Sie **10-15 Sekunden** (Propagierung)

### Schritt 5: Testen

1. Erstellen Sie einen **neuen Test-Account**
2. Prüfen Sie die E-Mail
3. Die E-Mail sollte jetzt von `info@owona.de` kommen

## 🔍 Alternative: Port 587 testen

Falls Port 465 weiterhin nicht funktioniert:

1. Ändern Sie Port zu `587`
2. Speichern Sie
3. Erneut testen

## 📋 Wichtige Hinweise

- Custom SMTP muss **explizit aktiviert** sein
- Nach dem Aktivieren **warten Sie 10-15 Sekunden**
- Testen Sie mit einem **neuen Account** (alte Accounts nutzen möglicherweise noch den alten Flow)
- Prüfen Sie auch **Spam-Ordner**

## ✅ Verifizierung

Nach erfolgreicher Konfiguration sollten die Logs zeigen:

```json
{
  "event": "mail.send",
  "mail_from": "info@owona.de",  // ← Sollte jetzt info@owona.de sein!
  "mail_to": "...",
  "mail_type": "confirmation"
}
```

## 🆘 Falls immer noch nicht funktioniert

1. **Goneo-Konto prüfen:**
   - Loggen Sie sich ins Goneo-Webmail ein
   - Testen Sie, ob `info@owona.de` funktioniert
   - Prüfen Sie, ob SMTP-Zugriff erlaubt ist

2. **Supabase Support kontaktieren:**
   - Falls Custom SMTP immer noch nicht funktioniert
   - Geben Sie Projekt-ID an: `ugsezgnkyhcmsdpohuwf`

3. **Alternative: Resend nutzen:**
   - Temporär Resend verwenden (siehe vorherige Anleitung)
   - Einfacher zu konfigurieren
   - Bessere Deliverability

---

**Nächste Aktion:** Custom SMTP Toggle nochmal aktivieren/deaktivieren/aktivieren in Supabase Dashboard

