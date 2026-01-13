markdown# Auth Flow Dokumentation

## Password Reset Flow (Current Implementation)

1. User → /auth/forgot-password
2. Submit email → supabase.auth.resetPasswordForEmail()
3. Supabase sends email with link
4. Link → /auth/reset-password?code=XXX
5. Page calls exchangeCodeForSession(code)
6. User enters new password

## Known Issues

- Link scanners consume PKCE code before user clicks
- No retry mechanism if code expired
- Generic error messages confuse users

## Improvement Plan

- [ ] Add confirmation page before exchangeCodeForSession
- [ ] Better error handling with retry option
- [ ] Consider OTP flow as alternative

