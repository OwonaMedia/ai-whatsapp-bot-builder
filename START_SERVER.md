# 🚀 Server starten - Schritt für Schritt

## ✅ Schritt 1: Terminal öffnen

Öffne ein Terminal-Fenster.

---

## ✅ Schritt 2: Ins Frontend-Verzeichnis wechseln

```bash
cd /Users/salomon/Documents/products/ai-whatsapp-bot-builder/frontend
```

---

## ✅ Schritt 3: Server starten

```bash
npm run dev
```

**Du solltest sehen:**
```
▲ Next.js 14.2.33
- Local:        http://localhost:3000
- ready started server on 0.0.0.0:3000
```

---

## ✅ Schritt 4: Login öffnen

**Nachdem der Server läuft, öffne im Browser:**

### **Option A: Mit Locale (Empfohlen)**
```
http://localhost:3000/de/auth/login
```

### **Option B: Root (wird automatisch weitergeleitet)**
```
http://localhost:3000
```
→ Dann klick auf "Jetzt starten" Button

### **Option C: Automatischer Redirect**
```
http://localhost:3000/auth/login
```
→ Wird jetzt automatisch zu `/de/auth/login` weitergeleitet

---

## 🐛 Troubleshooting

### **Port 3000 ist belegt:**
```bash
# Prozess finden:
lsof -ti:3000

# Prozess beenden:
kill -9 $(lsof -ti:3000)

# Oder anderen Port verwenden:
npm run dev -- -p 3001
```
Dann: `http://localhost:3001/de/auth/login`

### **Server startet nicht:**
```bash
# Dependencies installieren:
npm install

# Dann erneut:
npm run dev
```

### **Fehler beim Start:**
- Prüfe ob alle Dependencies installiert sind
- Prüfe ob `.env` Datei vorhanden ist (mit Supabase Credentials)

---

## ✅ Checkliste

- [ ] Terminal geöffnet
- [ ] In `/frontend` Verzeichnis
- [ ] `npm run dev` ausgeführt
- [ ] Server läuft (sieht "Ready")
- [ ] Browser geöffnet: `http://localhost:3000/de/auth/login`

---

**Status:** Ready to Start  
**Letzte Aktualisierung:** 2025-01-XX

