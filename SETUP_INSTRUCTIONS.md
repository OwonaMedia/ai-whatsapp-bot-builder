# 🔧 Supabase-Konfiguration erforderlich

## Problem
Die App funktioniert nicht, weil die Supabase-Umgebungsvariablen fehlen.

## Lösung: Supabase-Variablen setzen

### Option 1: Via PM2 (Empfohlen)

```bash
# SSH zum Server
ssh root@91.99.232.126

# Supabase-Variablen setzen (ERsetzen Sie die Werte mit Ihren echten Supabase-Daten!)
pm2 set whatsapp-bot-builder NEXT_PUBLIC_SUPABASE_URL "https://xxxxx.supabase.co"
pm2 set whatsapp-bot-builder NEXT_PUBLIC_SUPABASE_ANON_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# App neu starten
pm2 restart whatsapp-bot-builder
```

### Option 2: Via .env.local Datei

```bash
# SSH zum Server
ssh root@91.99.232.126

# Navigieren Sie zum Frontend-Verzeichnis
cd /var/www/whatsapp-bot-builder/frontend

# Kopieren Sie die Beispiel-Datei
cp .env.local.example .env.local

# Bearbeiten Sie .env.local mit Ihren echten Supabase-Werten
nano .env.local

# App neu starten
pm2 restart whatsapp-bot-builder
```

## Wo finde ich meine Supabase-Werte?

1. Gehen Sie zu: https://supabase.com/dashboard
2. Wählen Sie Ihr Projekt aus
3. Gehen Sie zu: **Settings** → **API**
4. Kopieren Sie:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (⚠️ NICHT der Service Role Key!)

## Nach dem Setzen

Die App sollte jetzt funktionieren:
- ✅ Login/Signup
- ✅ PDF/URL/Text Upload
- ✅ Chat-Funktionalität
- ✅ Alle anderen Features

## Troubleshooting

Falls die App immer noch nicht funktioniert:

```bash
# Prüfen Sie, ob die Variablen gesetzt sind
pm2 env 36 | grep SUPABASE

# Prüfen Sie die Logs
pm2 logs whatsapp-bot-builder --lines 50

# App neu bauen und starten
cd /var/www/whatsapp-bot-builder/frontend
rm -rf .next
npm run build
pm2 restart whatsapp-bot-builder
```









