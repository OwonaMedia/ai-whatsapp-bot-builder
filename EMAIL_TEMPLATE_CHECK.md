# E-Mail-Template Prüfung

## Problem
Redirect URLs sind korrekt, aber Link könnte falsches Format haben.

## E-Mail-Template in Supabase prüfen

Im **Supabase Dashboard**:
1. **Settings > Authentication > Email Templates**
2. **Confirm signup** Template prüfen

### Korrektes Template-Format:

**Für PKCE Flow (Next.js SSR):**
```html
<h2>Bestätigen Sie Ihre Anmeldung</h2>

<p>Folgen Sie diesem Link, um Ihren Account zu bestätigen:</p>
<p>
  <a href="{{ .SiteURL }}/de/auth/callback?token_hash={{ .TokenHash }}&type=email&next=/dashboard">
    E-Mail bestätigen
  </a>
</p>
```

**Oder für einfachen Code-Flow:**
```html
<h2>Bestätigen Sie Ihre Anmeldung</h2>

<p>Folgen Sie diesem Link, um Ihren Account zu bestätigen:</p>
<p>
  <a href="{{ .ConfirmationURL }}">
    E-Mail bestätigen
  </a>
</p>
```

### WICHTIG:

**Variablen:**
- `{{ .SiteURL }}` = https://whatsapp.owona.de
- `{{ .TokenHash }}` = Token für PKCE Flow
- `{{ .ConfirmationURL }}` = Vollständiger Link (für Code-Flow)

**Für Next.js mit SSR (empfohlen):**
- Verwende `token_hash` Parameter
- Route muss `verifyOtp` mit `token_hash` aufrufen

**Für Client-Only Apps:**
- Verwende `{{ .ConfirmationURL }}`
- Route muss `exchangeCodeForSession` aufrufen

## Aktuelle Implementierung

Unsere Callback-Route verwendet **Code-Flow** (`exchangeCodeForSession`).

### Template sollte sein:

```html
<h2>Willkommen bei WhatsApp Bot Builder!</h2>

<p>Vielen Dank für Ihre Registrierung.</p>

<p>Bitte bestätigen Sie Ihre E-Mail-Adresse, indem Sie auf den folgenden Link klicken:</p>

<p>
  <a href="{{ .ConfirmationURL }}" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">
    E-Mail-Adresse bestätigen
  </a>
</p>

<p>Oder kopieren Sie diesen Link in Ihren Browser:</p>
<p style="word-break: break-all; color: #666;">
  {{ .ConfirmationURL }}
</p>

<p>Falls Sie sich nicht registriert haben, ignorieren Sie diese E-Mail bitte.</p>

<p>Mit freundlichen Grüßen,<br>
Ihr WhatsApp Bot Builder Team</p>
```

## Alternative: PKCE Flow verwenden

Falls Code-Flow nicht funktioniert, können wir auf PKCE Flow umstellen:

### 1. Template ändern:
```html
<a href="{{ .SiteURL }}/de/auth/callback?token_hash={{ .TokenHash }}&type=email&next=/dashboard">
```

### 2. Callback-Route anpassen:
```typescript
// Statt exchangeCodeForSession:
await supabase.auth.verifyOtp({
  type: 'email',
  token_hash: tokenHash,
});
```

## Nächste Schritte

1. ✅ Redirect URLs sind korrekt
2. ⚠️ **E-Mail-Template prüfen** (siehe oben)
3. ⚠️ **Template-Format anpassen** falls nötig
4. ✅ Test: Neuen Account registrieren

---

**Wichtig:** 
- `{{ .ConfirmationURL }}` = Funktioniert mit aktueller Callback-Route (Code-Flow)
- `{{ .TokenHash }}` = Benötigt PKCE Flow und `verifyOtp` statt `exchangeCodeForSession`

