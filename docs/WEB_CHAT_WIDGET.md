# 💬 Web Chat Widget Documentation

## Übersicht

Das Web Chat Widget ermöglicht es, Bots auf jeder Website einzubetten. Die Bots nutzen die gleiche Flow-Execution-Engine wie WhatsApp-Bots.

---

## 🚀 Installation

### **1. Embed-Code generieren**

Im Dashboard:
1. Bot öffnen
2. Zu "Wissensquellen" → Tab "Integrationen"
3. Widget-Code kopieren

### **2. Auf Website einbetten**

```html
<!DOCTYPE html>
<html>
<head>
  <title>Meine Website</title>
</head>
<body>
  <!-- Deine Website Inhalte -->
  
  <!-- Widget Code vor </body> -->
  <script src="https://whatsapp.owona.de/widget.js" data-bot-id="YOUR_BOT_ID"></script>
</body>
</html>
```

---

## ⚙️ Konfiguration

### **Optionale Attribute:**

```html
<script 
  src="https://whatsapp.owona.de/widget.js" 
  data-bot-id="YOUR_BOT_ID"
  data-api-url="https://whatsapp.owona.de"
></script>
```

**Parameter:**
- `data-bot-id` (erforderlich) - ID deines Bots
- `data-api-url` (optional) - API URL (Default: whatsapp.owona.de)

---

## 🎨 Widget-Features

### **Design:**
- ✅ WhatsApp-ähnliches Design
- ✅ Responsive (Mobile & Desktop)
- ✅ Minimierbar
- ✅ Smooth Animations

### **Funktionen:**
- ✅ Real-time Messaging
- ✅ Bot Flow Execution
- ✅ Session Management
- ✅ Auto-Scroll
- ✅ Loading Indicators

---

## 🔧 Technische Details

### **Architektur:**

```
Website (Widget) 
  → POST /api/bots/[id]/webchat
    → Flow Executor
      → Bot Flow Execution
        → WebChatClient (collects messages)
          → Return responses
```

### **Session Management:**
- Sessions werden in `sessionStorage` gespeichert
- Session-ID: `web_{timestamp}_{random}`
- Anonymous (keine User-Authentifizierung nötig)

### **Message Flow:**
1. User sendet Nachricht im Widget
2. Widget sendet POST an `/api/bots/[id]/webchat`
3. Flow Executor führt Bot-Flow aus
4. WebChatClient sammelt Bot-Responses
5. Responses werden an Widget zurückgegeben
6. Widget zeigt Messages an

---

## 📊 API Endpoint

### **POST /api/bots/[id]/webchat**

**Request:**
```json
{
  "message": "Hallo!",
  "sessionId": "web_1234567890_abc123"
}
```

**Response:**
```json
{
  "success": true,
  "responses": [
    "Hallo! Wie kann ich dir helfen?",
    "Wobei kann ich dir behilflich sein?"
  ],
  "sessionId": "web_1234567890_abc123"
}
```

---

## 🎯 Verwendung

### **1. Bot muss aktiv sein**
- Bot Status: "Aktiv"
- Aktiver Flow vorhanden

### **2. Flow Execution**
- Verwendet die gleiche Flow-Execution-Engine
- Alle Node-Typen werden unterstützt
- AI Nodes mit Knowledge Sources funktionieren
- Question Nodes mit Buttons werden als Text angezeigt

### **3. Session Persistence**
- Session bleibt während Browser-Session aktiv
- Bei Page-Reload: Neue Session
- Conversations werden in Database gespeichert

---

## 🐛 Troubleshooting

### **Widget erscheint nicht:**
- ✅ Prüfe ob `data-bot-id` korrekt ist
- ✅ Prüfe Browser Console für Fehler
- ✅ Stelle sicher, dass Bot aktiv ist

### **Keine Antworten:**
- ✅ Prüfe ob Flow aktiv ist
- ✅ Prüfe Browser Network Tab
- ✅ Prüfe Server Logs

### **Styling-Probleme:**
- ✅ Widget hat eigene z-index (9999)
- ✅ Kann mit CSS überschrieben werden (falls nötig)

---

## 🎨 Customization (Zukünftig)

Geplante Features:
- Custom Colors
- Custom Position
- Custom Size
- Hide/Show Toggle

---

**Letzte Aktualisierung:** 2025-01-XX  
**Status:** ✅ Implementiert

