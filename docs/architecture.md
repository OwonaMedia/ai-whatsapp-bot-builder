# Auth Flow Dokumentation

## Password Reset Flow (Current Implementation)

1. User → `/auth/forgot-password`
2. Submit email → `supabase.auth.signInWithOtp()` (OTP-basiert)
3. Supabase sendet E-Mail mit Token (`token_hash`) + Hinweis auf vollständigen Code
4. Link → `/auth/verify-otp?token=pkce_xxx&email=user@example.com`
5. Seite ruft `supabase.auth.verifyOtp()` (Magiclink für PKCE, `type: "magiclink"`)
6. Erfolgreiche Verifikation führt zu `/auth/reset-password`
7. Nutzer setzt neues Passwort (validiert via `validateStrongPassword`)

## Known Issues

- Link-Scanner können OTPs vorzeitig konsumieren → deshalb Auto-Verify + Resend
- Benutzer brauchen eine Möglichkeit, die E-Mail-Adresse anzupassen
- Fehlende Info-Texte verunsichern Nutzer

## Improvement Plan

- [x] Auto-Verify + Resend-Flow in `verify-otp`
- [x] E-Mail-Feld editierbar, Hinweisbereiche lokalisiert
- [ ] LLM-basierte Auswertung von Fehlversuchen protokollieren
- [ ] Automatisches Supabase-Template-Update per CLI

