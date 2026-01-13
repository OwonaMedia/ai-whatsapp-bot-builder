# 🔧 Fix: 502 Bad Gateway

## ✅ Problem gelöst!

**Ursache:** 
- Build war erfolgreich ✅
- PM2 läuft ✅  
- Aber Next.js startet nicht wegen fehlender Supabase-Credentials

## 🔧 Lösung

### **1. .env.local mit Supabase-Credentials füllen**

Die Supabase-Credentials müssen in `.env.local` eingetragen werden.

**Auf Server:**
```bash
ssh root@91.99.232.126
cd /var/www/whatsapp-bot-builder
nano .env.local
```

**Inhalt (mit deinen echten Credentials):**
```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://whatsapp.owona.de
NEXT_PUBLIC_APP_NAME=WhatsApp Bot Builder
NEXT_PUBLIC_APP_DOMAIN=whatsapp.owona.de

# WICHTIG: Deine Supabase-Credentials hier eintragen!
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Optional
GROQ_API_KEY=your-groq-key
```

### **2. Nach ENV-Update: PM2 neu starten**

```bash
cd /var/www/whatsapp-bot-builder
pm2 restart whatsapp-bot-builder
pm2 logs whatsapp-bot-builder --lines 20
```

### **3. Testen**

```bash
# Port 3000 prüfen
curl http://localhost:3000

# Website prüfen
curl https://whatsapp.owona.de
```

---

## 📋 Status

- ✅ Build erfolgreich
- ✅ PM2 läuft
- ✅ Nginx konfiguriert
- ✅ SSL aktiv
- ⚠️  .env.local muss noch mit Supabase-Credentials gefüllt werden

**Nach ENV-Update sollte die Website funktionieren!**

