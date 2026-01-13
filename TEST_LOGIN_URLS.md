# 🔗 Login URLs - Richtig verwenden

## ✅ Die richtigen URLs

Die App nutzt **Multi-Language Support** mit Locale-Routing.

### **Option 1: Mit Locale (Empfohlen)**
```
http://localhost:3000/de/auth/login    (Deutsch)
http://localhost:3000/en/auth/login    (English)
http://localhost:3000/fr/auth/login    (Français)
```

### **Option 2: Root (wird automatisch weitergeleitet)**
```
http://localhost:3000                  → /de (Default)
http://localhost:3000/auth/login       → /de/auth/login (wenn Middleware es zulässt)
```

### **Option 3: Direkt über Homepage**
```
http://localhost:3000                  → Homepage mit "Jetzt starten" Button
                                       → Klick führt zu /auth/login
```

---

## 🚀 Quick Start

### **Schritt 1: Server starten**
```bash
cd frontend
npm run dev
```

### **Schritt 2: Login öffnen**

**Option A: Direkt-Link**
```
http://localhost:3000/de/auth/login
```

**Option B: Über Homepage**
```
http://localhost:3000
→ Klick auf "Jetzt starten" Button
```

**Option C: Automatisch**
```
http://localhost:3000/auth/login
→ Middleware leitet zu /de/auth/login weiter (falls konfiguriert)
```

---

## 🐛 Falls Login-Seite nicht funktioniert

### **Prüfe:**
1. ✅ **Server läuft?** → Terminal zeigt "Ready"?
2. ✅ **Port korrekt?** → Läuft auf Port 3000?
3. ✅ **Locale in URL?** → Versuche `/de/auth/login`
4. ✅ **Browser Console?** → F12 für Errors

### **Fallback:**
Wenn `/auth/login` nicht funktioniert, verwende immer:
```
http://localhost:3000/de/auth/login
```

---

## 📋 Alle wichtigen URLs

| Seite | URL |
|-------|-----|
| Homepage | `http://localhost:3000` |
| Login (DE) | `http://localhost:3000/de/auth/login` |
| Login (EN) | `http://localhost:3000/en/auth/login` |
| Dashboard | `http://localhost:3000/de/dashboard` |
| Widget Test | `http://localhost:3000/test-widget.html` |

---

**Hinweis:** Das Middleware nutzt `localePrefix: 'as-needed'`, aber für maximale Kompatibilität sollte immer die Locale in der URL angegeben werden.

