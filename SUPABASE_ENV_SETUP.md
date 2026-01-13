# 🔧 Supabase Environment-Variablen einrichten

## ✅ Status

**Next.js läuft jetzt!** (Internal Server Error statt 502 = Next.js antwortet)

**Problem:** Fehlende Supabase-Credentials verursachen Fehler

---

## 📋 Supabase-Credentials eintragen

### **Auf Server:**

```bash
ssh root@91.99.232.126
cd /var/www/whatsapp-bot-builder
nano .env.local
```

### **Inhalt:**

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://whatsapp.owona.de
NEXT_PUBLIC_APP_NAME=WhatsApp Bot Builder
NEXT_PUBLIC_APP_DOMAIN=whatsapp.owona.de

# WICHTIG: Deine Supabase-Credentials hier eintragen!
# Du kannst sie aus Cursor-Einstellungen oder anderen Projekten kopieren
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional: GROQ API Key
GROQ_API_KEY=your-groq-key
```

### **Speichern:** `Ctrl+X`, dann `Y`, dann `Enter`

---

## 🔄 Nach ENV-Update: PM2 neu starten

```bash
cd /var/www/whatsapp-bot-builder
pm2 restart whatsapp-bot-builder
pm2 logs whatsapp-bot-builder --lines 20
```

---

## ✅ Testen

```bash
# Lokal auf Server
curl http://localhost:3000

# Von außen
curl https://whatsapp.owona.de
```

---

**Status:** Next.js läuft ✅  
**Nächster Schritt:** Supabase-Credentials eintragen

