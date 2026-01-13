# 🚀 Live-Bearbeitung auf whatsapp.owona.de

## ✅ Vorbereitung abgeschlossen

**Script erstellt:** `deploy-login-fix.sh`

---

## 📋 Deployment-Optionen

### **Option 1: SSH-Verbindung + Manuelle Bearbeitung (Empfohlen)**

#### **Schritt 1: SSH-Verbindung herstellen**
```bash
ssh user@whatsapp.owona.de
```

#### **Schritt 2: Ins Projekt-Verzeichnis wechseln**
```bash
cd /path/to/ai-whatsapp-bot-builder/frontend
# Oder finde das Verzeichnis:
find / -name "ai-whatsapp-bot-builder" -type d 2>/dev/null | head -5
```

#### **Schritt 3: Aktuellen Status prüfen**
```bash
pwd
ls -la app/[locale]/auth/login/
git status  # Falls Git verwendet wird
```

#### **Schritt 4: Dateien bearbeiten**

**A) Login-Page (`app/[locale]/auth/login/page.tsx`):**
```bash
nano app/[locale]/auth/login/page.tsx
# Oder: vi app/[locale]/auth/login/page.tsx
```

**Inhalt:**
```typescript
import LoginForm from '@/components/auth/LoginForm';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-green/10 via-white to-brand-light/20 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <LoginForm redirectTo={params.redirect || '/dashboard'} />
      </div>
    </div>
  );
}
```

**B) Config (`lib/config.ts`):**
```bash
nano lib/config.ts
```

**Ändere diese Zeile:**
```typescript
// ALT:
if (!config.supabase.url || !config.supabase.anonKey) {
  throw new Error('Missing Supabase environment variables');
}

// NEU:
if (process.env.NODE_ENV === 'production' && (!config.supabase.url || !config.supabase.anonKey)) {
  throw new Error('Missing Supabase environment variables');
}
```

#### **Schritt 5: Build-Cache löschen**
```bash
rm -rf .next
```

#### **Schritt 6: Server neu starten**

**PM2 (falls verwendet):**
```bash
pm2 restart whatsapp-bot-builder
pm2 logs whatsapp-bot-builder --lines 50
```

**Oder systemd:**
```bash
sudo systemctl restart whatsapp-bot-builder
sudo systemctl status whatsapp-bot-builder
```

**Oder direkt:**
```bash
npm run build
npm start
```

---

### **Option 2: Script per SSH ausführen**

#### **Schritt 1: Script auf Server kopieren**
```bash
# Lokal (auf deinem Mac):
scp deploy-login-fix.sh user@whatsapp.owona.de:/tmp/

# Oder direkt per SSH ausführen:
cat deploy-login-fix.sh | ssh user@whatsapp.owona.de 'cd /path/to/frontend && bash -s'
```

#### **Schritt 2: Auf Server Script ausführen**
```bash
ssh user@whatsapp.owona.de
cd /path/to/frontend
bash /tmp/deploy-login-fix.sh
```

---

### **Option 3: Git Push + Pull**

#### **Schritt 1: Lokal committen & pushen**
```bash
cd /Users/salomon/Documents/products/ai-whatsapp-bot-builder/frontend
git add app/[locale]/auth/login/page.tsx lib/config.ts
git commit -m "Fix: Login-Page weiße Seite behoben"
git push
```

#### **Schritt 2: Auf Server pullen**
```bash
ssh user@whatsapp.owona.de
cd /path/to/frontend
git pull
rm -rf .next
npm run build  # Oder Server restart
```

---

## 🧪 Test nach Deployment

### **1. Login-Page öffnen:**
```
https://whatsapp.owona.de/de/auth/login
https://whatsapp.owona.de/auth/login
```

### **2. Prüfen:**
- ✅ Seite lädt (keine weiße Seite)
- ✅ Login-Formular sichtbar
- ✅ Browser Console (F12): Keine Errors

### **3. Server-Logs prüfen:**
```bash
# PM2
pm2 logs whatsapp-bot-builder --lines 100

# systemd
journalctl -u whatsapp-bot-builder -n 100 -f

# Oder direkt
tail -f /path/to/logs/error.log
```

---

## 🐛 Troubleshooting

### **Fehler: Datei nicht gefunden**
```bash
# Finde Projekt-Verzeichnis:
find /var/www -name "ai-whatsapp-bot-builder" -type d 2>/dev/null
find /home -name "ai-whatsapp-bot-builder" -type d 2>/dev/null
find /opt -name "ai-whatsapp-bot-builder" -type d 2>/dev/null
```

### **Fehler: Permission denied**
```bash
# Prüfe Berechtigungen:
ls -la app/[locale]/auth/login/

# Falls nötig:
sudo chown -R user:user /path/to/frontend
```

### **Fehler: Build fehlgeschlagen**
```bash
# Prüfe ENV-Variablen:
cat .env.local | grep SUPABASE

# Prüfe Node-Version:
node --version  # Sollte 18+ sein

# Prüfe Dependencies:
npm install
```

---

## 📝 Dateien die geändert werden

1. ✅ `app/[locale]/auth/login/page.tsx` - Vereinfacht, kein Server-Side Check
2. ✅ `lib/config.ts` - Validierung nur in Production
3. ✅ `.next/` - Build-Cache gelöscht

---

**Status:** Ready for Live Deployment  
**Nächster Schritt:** SSH-Verbindung herstellen

