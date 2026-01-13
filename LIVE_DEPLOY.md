# 🚀 Live-Bearbeitung auf whatsapp.owona.de

## 📋 Ziel

Login-Page Fix auf dem Live-Server `whatsapp.owona.de` anwenden.

## 🔧 Änderungen die übertragen werden müssen:

### **1. Login-Page Fix**
**Datei:** `app/[locale]/auth/login/page.tsx`

**Änderungen:**
- Server-Side Auth-Check entfernt
- `searchParams` als Promise behandelt
- Vereinfachtes Rendering

### **2. Config-Fix**
**Datei:** `lib/config.ts`

**Änderungen:**
- Validierung nur in Production werfen
- Development-Mode toleriert fehlende ENV-Variablen

### **3. Build-Cache löschen**
- `.next` Verzeichnis auf Server löschen

---

## 🌐 Server-Verbindung

**Server:** `whatsapp.owona.de`  
**SSH:** (Zu konfigurieren)

---

## 📝 Deployment-Schritte

### **Option 1: SSH + Direkte Bearbeitung**

```bash
# 1. SSH-Verbindung herstellen
ssh user@whatsapp.owona.de

# 2. Ins Projekt-Verzeichnis wechseln
cd /path/to/ai-whatsapp-bot-builder/frontend

# 3. Aktuellen Status prüfen
git status
pwd
ls -la

# 4. Dateien bearbeiten (siehe unten)
```

### **Option 2: Git Push + Pull auf Server**

```bash
# 1. Lokal: Änderungen committen
cd /Users/salomon/Documents/products/ai-whatsapp-bot-builder/frontend
git add .
git commit -m "Fix: Login-Page weiße Seite behoben"
git push

# 2. Auf Server: Pull
ssh user@whatsapp.owona.de
cd /path/to/ai-whatsapp-bot-builder/frontend
git pull
npm run build  # oder restart
```

---

## 📄 Dateien die geändert werden müssen

### **1. `app/[locale]/auth/login/page.tsx`**

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

### **2. `lib/config.ts`**

```typescript
// Validation (nur in Production werfen)
if (process.env.NODE_ENV === 'production' && (!config.supabase.url || !config.supabase.anonKey)) {
  throw new Error('Missing Supabase environment variables');
}
```

### **3. Build-Cache löschen**

```bash
rm -rf .next
```

---

## 🔄 Server neu starten

```bash
# PM2 (falls verwendet)
pm2 restart whatsapp-bot-builder

# Oder systemd
sudo systemctl restart whatsapp-bot-builder

# Oder direkt
npm run build
npm start
```

---

## ✅ Test nach Deployment

1. **Login-Page öffnen:**
   - `https://whatsapp.owona.de/de/auth/login`
   - `https://whatsapp.owona.de/auth/login`

2. **Prüfen:**
   - ✅ Seite lädt (keine weiße Seite)
   - ✅ Login-Formular sichtbar
   - ✅ Browser Console: Keine Errors

---

## 🐛 Troubleshooting

### **Fehler: Datei nicht gefunden**
- Prüfe Pfad: `pwd`
- Prüfe Datei: `ls -la app/[locale]/auth/login/`

### **Fehler: Permission denied**
- Prüfe Berechtigungen: `ls -la`
- Falls nötig: `chmod` oder `sudo`

### **Fehler: Build fehlgeschlagen**
- Prüfe Logs: `npm run build`
- Prüfe ENV-Variablen: `.env.local`

---

**Status:** Ready for Deployment  
**Letzte Aktualisierung:** 2025-01-XX

