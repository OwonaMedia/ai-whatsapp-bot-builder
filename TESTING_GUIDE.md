# 🧪 Testing Guide - Web Chat Widget

## 🚀 Quick Start

### **1. Development Server starten**
```bash
cd frontend
npm run dev
```

Server läuft auf: `http://localhost:3000`

### **2. Bot vorbereiten**

#### **Im Dashboard:**
1. ✅ Login: `http://localhost:3000/auth/login`
2. ✅ Neuen Bot erstellen
3. ✅ Bot Status: **"Aktiv"**
4. ✅ Bot-ID kopieren (aus URL oder Bot-Details)

#### **Flow erstellen (einfacher Test):**
1. ✅ Bot öffnen → "Bot bearbeiten"
2. ✅ Trigger Node (wird automatisch hinzugefügt)
3. ✅ Message Node hinzufügen:
   - Text: "Hallo! 👋 Willkommen im Chat. Wie kann ich dir helfen?"
4. ✅ Question Node hinzufügen (optional):
   - Frage: "Was möchtest du wissen?"
   - Optionen: 
     - "Info" 
     - "Support"
     - "Sonstiges"
5. ✅ End Node hinzufügen
6. ✅ **Speichern** & **Flow aktivieren**

### **3. Widget testen**

#### **Option A: Test-HTML verwenden**
```bash
# Im Browser öffnen:
open test-widget.html
# Oder:
# http://localhost:3000/test-widget.html (wenn in public/)
```

#### **Option B: Auf eigener Seite**
```html
<!DOCTYPE html>
<html>
<head>
  <title>Widget Test</title>
</head>
<body>
  <h1>Meine Test-Seite</h1>
  
  <!-- Widget Code HIER -->
  <script 
    src="http://localhost:3000/widget.js" 
    data-bot-id="DEINE_BOT_ID"
    data-api-url="http://localhost:3000"
  ></script>
</body>
</html>
```

---

## ✅ Test-Checkliste

### **Basic Tests:**
- [ ] **Widget erscheint:** Grüner Button unten rechts?
- [ ] **Toggle funktioniert:** Button öffnet/schließt Chat?
- [ ] **Welcome Message:** Wird angezeigt?
- [ ] **Nachricht senden:** Funktionieren Enter + Button?
- [ ] **Bot antwortet:** Erscheint Bot-Response?

### **Flow Tests:**
- [ ] **Message Nodes:** Werden angezeigt?
- [ ] **Question Nodes:** Funktionieren (Buttons als Text)?
- [ ] **AI Nodes:** Funktionieren (wenn konfiguriert)?
- [ ] **Condition Nodes:** Funktionieren?

### **Session Tests:**
- [ ] **Page Reload:** Session bleibt erhalten?
- [ ] **Mehrere Messages:** Funktionieren Sequenzen?
- [ ] **Session-ID:** Wird generiert? (Console prüfen)

### **UI/UX Tests:**
- [ ] **Responsive:** Funktioniert auf Mobile?
- [ ] **Auto-Scroll:** Scrollt zu neuen Messages?
- [ ] **Loading:** Zeigt "Tippt..." an?
- [ ] **Design:** Sieht gut aus?

### **Debug Tests:**
- [ ] **Console:** Keine Errors?
- [ ] **Network Tab:** API-Calls erfolgreich?
- [ ] **Response Format:** Korrekt?

---

## 🐛 Troubleshooting

### **Widget erscheint nicht:**
1. ✅ Prüfe Browser Console (F12)
   - Fehler bei Script-Loading?
   - CORS-Errors?
2. ✅ Prüfe Bot-ID
   - Ist Bot-ID korrekt?
   - Bot aktiv?
3. ✅ Prüfe Server
   - Läuft Dev-Server?
   - Ist `/widget.js` erreichbar?

### **Keine Antworten:**
1. ✅ Prüfe Network Tab (F12)
   - POST zu `/api/bots/[id]/webchat`?
   - Response Status?
   - Response Body?
2. ✅ Prüfe Flow
   - Flow aktiv?
   - Nodes konfiguriert?
   - Trigger Node vorhanden?
3. ✅ Prüfe Server Logs
   - Errors im Terminal?
   - API-Calls loggen?

### **API-Fehler:**
1. ✅ Prüfe Response in Network Tab
   - Status 200?
   - `success: true`?
   - `responses` Array vorhanden?
2. ✅ Prüfe Server-Logs
   - Errors im Terminal?
   - Database-Errors?
3. ✅ Prüfe Bot-Status
   - Bot aktiv?
   - Flow aktiv?

### **CORS-Errors:**
- ✅ Widget muss von derselben Domain kommen
- ✅ Oder `data-api-url` auf richtige Domain setzen
- ✅ CORS in Next.js konfigurieren (falls nötig)

---

## 📊 Debug-Informationen

### **Browser Console:**
```javascript
// Session-ID prüfen:
sessionStorage.getItem('bot_YOUR_BOT_ID_session')

// Widget geladen?
document.getElementById('bot-widget-container')
```

### **Network Tab:**
- Request: `POST /api/bots/[id]/webchat`
- Request Body: `{ message: "...", sessionId: "..." }`
- Response: `{ success: true, responses: [...], sessionId: "..." }`

### **Server Logs:**
- Flow Execution Logs
- API-Call Logs
- Error Messages

---

## 🎯 Erwartete Verhalten

### **Erfolgreicher Test:**
1. Widget erscheint unten rechts
2. Klick öffnet Chat-Fenster
3. Welcome-Message erscheint
4. User-Nachricht wird gesendet
5. Loading-Indicator erscheint
6. Bot-Response erscheint
7. Mehrere Nachrichten funktionieren

### **Typische Response:**
```json
{
  "success": true,
  "responses": [
    "Hallo! 👋 Willkommen im Chat. Wie kann ich dir helfen?"
  ],
  "sessionId": "web_1234567890_abc123"
}
```

---

## 📝 Test-Report Template

**Test-Datum:** [Datum]  
**Bot-ID:** [ID]  
**Browser:** [Chrome/Firefox/Safari]  
**Status:** ✅ Erfolgreich / ❌ Fehler

**Getestet:**
- [ ] Widget erscheint
- [ ] Messaging funktioniert
- [ ] Flow Execution funktioniert
- [ ] Session Management funktioniert

**Gefundene Issues:**
- [Issue 1]
- [Issue 2]

**Notizen:**
- [Notizen]

---

**Status:** Ready for Testing  
**Letzte Aktualisierung:** 2025-01-XX

