# Supabase Custom SMTP Konfiguration für info@owona.de

## Ziel

E-Mails von Supabase Auth sollen von `info@owona.de` statt von der Standard-Supabase-E-Mail-Adresse kommen.

## Lösung: SMTP-Konfiguration in Supabase

### Schritt 1: SMTP-Zugangsdaten sammeln

Sie benötigen:
- **SMTP Hostname**: z.B. `mail.owona.de`, `smtp.owona.de`, oder SMTP-Provider Hostname
- **SMTP Port**: Meist `587` (TLS) oder `465` (SSL)
- **SMTP Benutzername**: Meist `info@owona.de`
- **SMTP Passwort**: Passwort für diese E-Mail-Adresse
- **Sender Name**: z.B. `WhatsApp Bot Builder` oder `Owona`

### Schritt 2: Supabase Dashboard öffnen

1. Gehen Sie zu: https://supabase.com/dashboard
2. Wählen Sie Ihr Projekt: `ugsezgnkyhcmsdpohuwf`
3. Klicken Sie auf **Settings** (⚙️) in der linken Sidebar
4. Klicken Sie auf **Authentication**

### Schritt 3: SMTP Settings finden

1. Scrollen Sie nach unten zu **SMTP Settings**
2. Klicken Sie auf **Enable Custom SMTP** (oder ähnlich)
3. Aktivieren Sie die Option **Enable Custom SMTP**

### Schritt 4: SMTP-Zugangsdaten eingeben

Füllen Sie folgende Felder aus:

```
Enable Custom SMTP: ✓ (aktivieren)

SMTP Host: [Ihr SMTP Hostname]
           Beispiele:
           - mail.owona.de
           - smtp.strato.de (falls Strato)
           - smtp.1und1.de (falls 1&1)
           - smtp.resend.com (falls Resend)

SMTP Port: 587 (TLS) oder 465 (SSL)
          Meist 587 für TLS/STARTTLS

SMTP User: info@owona.de
           (oder der SMTP-Benutzername)

SMTP Password: [Ihr SMTP-Passwort]
               (Passwort für info@owona.de)

Sender Name: WhatsApp Bot Builder
             (wird als Absender-Name angezeigt)

Sender Email: info@owona.de
              (E-Mail-Adresse als Absender)
```

### Schritt 5: E-Mail-Templates anpassen (optional)

1. Bleiben Sie in **Settings > Authentication**
2. Scrollen Sie zu **Email Templates**
3. Wählen Sie das Template **Confirm signup** aus
4. Prüfen Sie, ob `{{ .ConfirmationURL }}` korrekt verwendet wird
5. Sie können den Text anpassen, z.B.:

```html
Hallo!

Vielen Dank für Ihre Registrierung bei WhatsApp Bot Builder.

Bitte bestätigen Sie Ihre E-Mail-Adresse, indem Sie auf den folgenden Link klicken:
{{ .ConfirmationURL }}

Mit freundlichen Grüßen,
Ihr WhatsApp Bot Builder Team
```

6. Wiederholen Sie dies für andere Templates (z.B. "Reset Password", etc.)

### Schritt 6: Testen

1. Klicken Sie auf **Save** unten auf der Seite
2. Erstellen Sie einen Test-Account
3. Prüfen Sie die E-Mail:
   - **Von**: `info@owona.de`
   - **Absender-Name**: `WhatsApp Bot Builder` (oder wie konfiguriert)
   - Link funktioniert korrekt

## SMTP-Provider Empfehlungen

### Option 1: Eigener Mail-Server (falls vorhanden)

Wenn Sie bereits einen Mail-Server für `owona.de` haben:
- Verwenden Sie die SMTP-Zugangsdaten Ihres Mail-Providers
- Meist bei Ihrem Hosting-Provider (z.B. Hetzner, Strato, 1&1, etc.)

### Option 2: Resend (Empfohlen - Einfach & Zuverlässig)

**Vorteile:**
- ✅ 3000 E-Mails/Monat gratis
- ✅ Einfache Konfiguration
- ✅ Gute Deliverability
- ✅ Moderne API

**Setup:**
1. Registrieren: https://resend.com
2. Domain verifizieren: `owona.de`
3. DNS-Einträge hinzufügen (DKIM, SPF, DMARC)
4. API Key erstellen
5. In Supabase verwenden:
   - Host: `smtp.resend.com`
   - Port: `465` oder `587`
   - User: `resend`
   - Password: [Ihr Resend API Key]
   - From: `info@owona.de`

### Option 3: SendGrid

**Vorteile:**
- ✅ 100 E-Mails/Tag gratis
- ✅ Bewährt & zuverlässig

### Option 4: Mailgun

**Vorteile:**
- ✅ 5000 E-Mails/Monat gratis (für 3 Monate, dann kostenpflichtig)
- ✅ Sehr gut für Transaktions-E-Mails

## Wichtige Hinweise

### DNS-Einträge prüfen

Damit E-Mails von `info@owona.de` nicht als Spam markiert werden, sollten folgende DNS-Einträge korrekt sein:

**SPF Record:**
```
TXT @ "v=spf1 include:_spf.google.com ~all"
```
(Oder entsprechend Ihrem SMTP-Provider)

**DKIM Record:**
```
TXT default._domainkey "v=DKIM1; k=rsa; p=..."
```
(Wird von Ihrem SMTP-Provider bereitgestellt)

**DMARC Record:**
```
TXT _dmarc "v=DMARC1; p=quarantine; rua=mailto:info@owona.de"
```

### E-Mail-Adresse verifizieren

Stellen Sie sicher, dass `info@owona.de`:
- ✅ Existiert (Mailbox eingerichtet)
- ✅ Eingehende E-Mails empfangen kann
- ✅ SMTP-Relay konfiguriert ist

### Fallback zu Supabase Default

Falls Custom SMTP Probleme macht:
- Supabase fällt automatisch auf den Standard-SMTP zurück
- Prüfen Sie die Logs in Supabase Dashboard > Logs > Auth

## Troubleshooting

### E-Mails kommen nicht an

1. **SPF/DKIM prüfen**: Verwenden Sie Tools wie https://mxtoolbox.com
2. **SMTP-Logs prüfen**: Supabase Dashboard > Logs
3. **Spam-Ordner prüfen**: E-Mails könnten im Spam landen
4. **SMTP-Zugangsdaten prüfen**: Passwort und Benutzername korrekt?

### E-Mails kommen als Spam an

1. **DNS-Einträge prüfen**: SPF, DKIM, DMARC müssen korrekt sein
2. **Sender-Reputation**: Neue Domains haben oft schlechte Reputation
3. **E-Mail-Inhalt**: Vermeiden Sie Spam-Trigger-Wörter

## Nächste Schritte

Nach der SMTP-Konfiguration:
1. ✅ Testen Sie die Registrierung
2. ✅ Prüfen Sie, ob E-Mails von `info@owona.de` kommen
3. ✅ Überprüfen Sie Spam-Ordner
4. ✅ Testen Sie alle E-Mail-Templates (Signup, Password Reset, etc.)

