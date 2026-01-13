# Cursor Setup & Workflow Guide

## Composer Mode mit Kontext füttern

- `.cursorrules` im Projekt-Root enthält Tech-Stack & Coding-Style.
- Nutze `@Codebase` + strukturierte Prompts mit Symptomen, Logauszügen & Ziel.
- Beispiel:
  ```
  @Codebase

  Kontext: Supabase Auth PKCE-Flow für Password Reset
  Problem: Token wird von Email-Link-Scannern vorab verbraucht
  Symptome:
  - "Token already used" in Supabase logs
  - User sieht "Etwas ist schiefgelaufen"
  - exchangeCodeForSession() fails

  Ziel: Implementiere zweistufigen Reset-Flow …
  Files: …
  ```

## Empfohlene Cursor Features

- **Enable:** Codebase indexing, Docs integration (falls vorhanden).
- **Beta:** Composer (Multi-file), @Web.
- **Model Settings:**  
  - Architektur & Deep Dives → Claude 3.5 Sonnet  
  - Schnelle Edits → GPT-4

## Custom Instructions (Cursor Chat)

```
You are an expert in Next.js 15, Supabase, and TypeScript.

When solving authentication issues:
1. Always consider security implications
2. Think about edge cases (email link scanners, race conditions)
3. Provide complete, production-ready code
4. Include error handling and user feedback
5. Consider UX from user perspective

For this project specifically:
- Use createBrowserClient() for client components
- All auth pages are under app/[locale]/auth/*
- We use Supabase PKCE flow (not magic links)
- RLS is enabled, always consider permissions
```

## Workflow-Empfehlung

1. **Recherche:** `@Web Supabase PKCE code consumed by email scanners`
2. **Composer starten (Cmd/Ctrl + I):**
   ```
   Based on research, implement two-stage password reset:
   @app/[locale]/auth/forgot-password/page.tsx
   @app/[locale]/auth/reset-password/page.tsx

   Create new file: app/[locale]/auth/reset-password-confirm/page.tsx
   ```
3. **Iterative Prompts:** Fokus auf einzelne Teilaufgaben („Add error handling for expired codes“).

## Agent Mode (falls verfügbar)

- Aktivieren unter Settings > Beta > Agent Mode.
- Ermöglicht selbstständiges Lesen/Schreiben/Testen – speziell für große Refactorings nutzen.

## Dokumentation einbinden

- `docs/architecture.md` und Reverse-Engineering-Dokus per `@docs/architecture.md` in Chat referenzieren.
- Für API-Referenzen: `@Web https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail`.

## Warum trotzdem Review?

- LLMs können Kontext verwerfen → manuelles Review der wichtigsten Dateien.
- Sicherstellen, dass PKCE/RLS/Mehrsprachigkeit nicht verletzt werden.

