# 🚀 Quick Start - Widget Testing

## ⚡ Server starten (3 Schritte)

### **1. Terminal öffnen**

### **2. Ins Frontend-Verzeichnis wechseln:**
```bash
cd /Users/salomon/Documents/products/ai-whatsapp-bot-builder/frontend
```

### **3. Server starten:**
```bash
npm run dev
```

**Du solltest sehen:**
```
▲ Next.js 14.2.33
- Local:        http://localhost:3000
✓ Ready
```

---

## 🔗 Login öffnen

**Nachdem der Server läuft, öffne im Browser:**

### **✅ Die richtige URL:**
```
http://localhost:3000/de/auth/login
```

**Oder:**
```
http://localhost:3000
```
→ Dann auf "Jetzt starten" Button klicken

---

## 🎯 Warum `/de/auth/login`?

Die App nutzt **Multi-Language Support** mit Locale-Routing:
- 🇩🇪 Deutsch: `/de/auth/login`
- 🇬🇧 English: `/en/auth/login`
- 🇫🇷 Français: `/fr/auth/login`

**Default:** Deutsch (`/de`)

---

## ✅ Test-Checkliste

- [ ] Server läuft (`npm run dev`)
- [ ] Browser geöffnet: `http://localhost:3000/de/auth/login`
- [ ] Login-Seite erscheint
- [ ] Bot erstellen & aktivieren
- [ ] Flow erstellen & aktivieren
- [ ] Widget testen

---

## 🐛 Hilfe

**Port belegt?**
```bash
kill -9 $(lsof -ti:3000)
npm run dev
```

**Server startet nicht?**
```bash
npm install
npm run dev
```

---

**Status:** Ready to Test! 🎉

