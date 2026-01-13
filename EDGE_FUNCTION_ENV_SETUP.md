# Edge Function Environment Variables Setup

## Problem

Die Edge Functions (Sales Chat & Support Chat) geben statische Fallback-Antworten zurück, weil `GROQ_API_KEY` nicht gesetzt ist.

## Lösung

### Schritt 1: GROQ_API_KEY in Supabase setzen

1. Öffne Supabase Dashboard: https://supabase.com/dashboard
2. Wähle dein Projekt aus
3. Gehe zu: **Edge Functions** → **Settings** (oder direkt zu den Function Settings)
4. Für beide Functions (`sales-chat` und `support-chat`):
   - Klicke auf die Function
   - Gehe zu **Settings** oder **Environment Variables**
   - Füge hinzu:
     - **Key**: `GROQ_API_KEY`
     - **Value**: Dein Groq API Key (z.B. `gsk_...`)

### Schritt 2: Verifizierung

Nach dem Setzen des Keys sollten die Edge Functions LLM-Antworten zurückgeben statt Fallback-Antworten.

### Debug-Logs prüfen

Die Edge Functions loggen jetzt:
- Ob `GROQ_API_KEY` gesetzt ist
- Ob die Groq API erfolgreich aufgerufen wurde
- Fehler-Details falls die API fehlschlägt

**Logs ansehen:**
- Supabase Dashboard → Edge Functions → `support-chat` → Logs
- Supabase Dashboard → Edge Functions → `sales-chat` → Logs

### Erwartetes Verhalten

**Vorher (ohne GROQ_API_KEY):**
- Statische Fallback-Antworten
- Keine Kontext-Erkennung
- Keine "ja"-Erkennung

**Nachher (mit GROQ_API_KEY):**
- Intelligente LLM-Antworten
- Kontext-Erkennung aus Historie
- "ja"-Antworten funktionieren

## Hinweis

Der Support MCP Server (der auf Hetzner/Supabase läuft) hat seinen eigenen `GROQ_API_KEY` in seiner `.env` Datei. Die Edge Functions benötigen den Key separat in Supabase Dashboard.

