# 📤 Manueller Upload - Signup-Seite

**Status:** ✅ Dateien lokal erstellt, bereit für Upload

---

## 📁 Hochzuladende Dateien

### 1. Signup-Seite (NEU)
- **Lokal:** `/Users/salomon/Documents/products/ai-whatsapp-bot-builder/frontend/app/[locale]/auth/signup/page.tsx`
- **Server:** `/var/www/whatsapp-bot-builder/frontend/app/[locale]/auth/signup/page.tsx`

### 2. SignupForm (AKTUALISIERT)
- **Lokal:** `/Users/salomon/Documents/products/ai-whatsapp-bot-builder/frontend/components/auth/SignupForm.tsx`
- **Server:** `/var/www/whatsapp-bot-builder/frontend/components/auth/SignupForm.tsx`

---

## 🔧 Manuelle Upload-Anweisungen

### Option 1: Mit SSH + SCP (empfohlen)

```bash
# 1. Verzeichnis auf Server erstellen
ssh root@91.99.232.126 "mkdir -p /var/www/whatsapp-bot-builder/frontend/app/[locale]/auth/signup"

# 2. Signup-Seite hochladen
scp /Users/salomon/Documents/products/ai-whatsapp-bot-builder/frontend/app/\[locale\]/auth/signup/page.tsx \
    root@91.99.232.126:/var/www/whatsapp-bot-builder/frontend/app/\[locale\]/auth/signup/page.tsx

# 3. SignupForm hochladen
scp /Users/salomon/Documents/products/ai-whatsapp-bot-builder/frontend/components/auth/SignupForm.tsx \
    root@91.99.232.126:/var/www/whatsapp-bot-builder/frontend/components/auth/SignupForm.tsx

# 4. Build & Restart
ssh root@91.99.232.126 "cd /var/www/whatsapp-bot-builder/frontend && npm run build && pm2 restart whatsapp-bot-builder"
```

### Option 2: Mit Upload-Skript

```bash
# Skript ausführbar machen (falls noch nicht geschehen)
chmod +x /Users/salomon/Documents/products/ai-whatsapp-bot-builder/UPLOAD_SIGNUP.sh

# Skript ausführen (benötigt sshpass)
# Installieren Sie sshpass falls nötig: brew install hudochenkov/sshpass/sshpass
./UPLOAD_SIGNUP.sh
```

---

## ✅ Nach dem Upload

1. **Signup-Seite testen:**
   - Navigieren Sie zu: `https://whatsapp.owona.de/de/auth/signup`
   - Seite sollte jetzt angezeigt werden (nicht mehr 404)

2. **"Kostenlos starten" Button testen:**
   - Auf Homepage: `https://whatsapp.owona.de/de`
   - Button "Kostenlos starten" klicken
   - Sollte zur Signup-Seite weiterleiten

3. **Signup-Formular testen:**
   - Formular ausfüllen
   - Registrierung durchführen
   - Email-Verifizierung prüfen

---

## 📝 Änderungen

### Signup-Seite (`app/[locale]/auth/signup/page.tsx`)
- ✅ Neue Seite erstellt
- ✅ Verwendet `SignupForm` Component
- ✅ Unterstützt `redirectTo` Query-Parameter

### SignupForm (`components/auth/SignupForm.tsx`)
- ✅ `redirectTo` Prop hinzugefügt
- ✅ `useLocale` Hook hinzugefügt
- ✅ Redirect-URLs verwenden locale-Prefix (`/${locale}/auth/callback`)
- ✅ Legal-Links verwenden locale-Prefix (`/${locale}/legal/...`)
- ✅ Redirect nach Email-Verifizierung verwendet locale-Prefix

---

**Status:** ✅ Lokal bereit, wartet auf Upload









