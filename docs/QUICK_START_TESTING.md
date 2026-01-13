# 🚀 Quick Start - Widget Testing

## ✅ Schritt 1: Server starten

```bash
cd frontend
npm run dev
```

**Server läuft auf:** `http://localhost:3000`

---

## ✅ Schritt 2: Login-Seite öffnen

Die App nutzt **Locale-Routing** (Multi-Language Support).

### **Richtige URLs:**

#### **Option A: Mit Locale (Empfohlen)**
- 🇩🇪 Deutsch: `http://localhost:3000/de/auth/login`
- 🇬🇧 English: `http://localhost:3000/en/auth/login`
- 🇫🇷 Français: `http://localhost:3000/fr/auth/login`

#### **Option B: Root wird automatisch weitergeleitet**
- `http://localhost:3000` → wird zu `/de` weitergeleitet (Standard-Locale)

#### **Option C: Ohne Locale (Fallback)**
- `http://localhost:3000/auth/login` - **kann funktionieren, wenn Fallback existiert**

---

## ✅ Schritt 3: Bot erstellen

1. **Login:**
   - Öffne: `http://localhost:3000/de/auth/login`
   - Oder: `http://localhost:3000` (wird automatisch zu `/de` weitergeleitet)

2. **Neuen Bot erstellen:**
   - Dashboard öffnen
   - "Neuen Bot erstellen"
   - Bot-Name eingeben
   - Speichern

3. **Bot aktivieren:**
   - Bot öffnen
   - Status: **"Aktiv"**
   - Bot-ID kopieren (aus URL: `/bots/[ID]`)

---

## ✅ Schritt 4: Flow erstellen

1. **Bot öffnen** → "Bot bearbeiten"

2. **Einfacher Test-Flow:**
   - ✅ Trigger Node (automatisch vorhanden)
   - ✅ Message Node hinzufügen:
     - Text: `Hallo! 👋 Wie kann ich dir helfen?`
   - ✅ End Node hinzufügen

3. **Speichern & Aktivieren:**
   - "Speichern" klicken
   - Flow muss aktiv sein (Checkbox "Aktiv")

---

## ✅ Schritt 5: Widget testen

### **Option A: Test-HTML-Seite**
```bash
# Öffne im Browser:
http://localhost:3000/test-widget.html
```

### **Option B: Manuell**
```html
<!DOCTYPE html>
<html>
<head>
  <title>Widget Test</title>
</head>
<body>
  <h1>Test-Seite</h1>
  
  <script 
    src="http://localhost:3000/widget.js" 
    data-bot-id="DEINE_BOT_ID"
    data-api-url="http://localhost:3000"
  ></script>
</body>
</html>
```

---

## 🐛 Troubleshooting

### **Login-Seite nicht erreichbar:**
- ✅ **Verwende Locale in URL:** `/de/auth/login` oder `/en/auth/login`
- ✅ **Oder:** Öffne `http://localhost:3000` (wird automatisch weitergeleitet)
- ✅ Prüfe ob Server läuft: Terminal zeigt "Ready"?
- ✅ Prüfe Port: Läuft auf Port 3000?

### **Server startet nicht:**
```bash
# Prüfe ob Port belegt:
lsof -ti:3000

# Falls belegt, kill process:
kill -9 $(lsof -ti:3000)

# Oder anderen Port verwenden:
npm run dev -- -p 3001
```

### **Widget erscheint nicht:**
- ✅ Bot-ID korrekt?
- ✅ Bot Status = "Aktiv"?
- ✅ Flow aktiv?
- ✅ Browser Console prüfen (F12)

---

## 📋 Test-Checkliste

- [ ] Server läuft (`npm run dev`)
- [ ] Login funktioniert (`/de/auth/login`)
- [ ] Bot erstellt & aktiviert
- [ ] Flow erstellt & aktiviert
- [ ] Widget-Code auf Test-Seite eingebettet
- [ ] Widget erscheint (grüner Button)
- [ ] Chat öffnet sich
- [ ] Nachricht senden funktioniert
- [ ] Bot antwortet

---

**Letzte Aktualisierung:** 2025-01-XX

