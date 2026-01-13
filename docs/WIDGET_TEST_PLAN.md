# 🧪 Web Chat Widget - Test Plan

## ✅ Vorbereitung

### **1. Bot erstellen & aktivieren**
- [ ] Im Dashboard neuen Bot erstellen
- [ ] Bot Status auf "Aktiv" setzen
- [ ] Bot-ID notieren

### **2. Flow erstellen**
- [ ] Einen einfachen Test-Flow erstellen:
  - Trigger Node
  - Message Node ("Hallo! Wie kann ich dir helfen?")
  - Question Node ("Was möchtest du wissen?")
  - End Node
- [ ] Flow aktivieren

### **3. Widget testen**
- [ ] Test-HTML-Seite öffnen (siehe unten)
- [ ] Widget-Code mit Bot-ID eintragen
- [ ] Seite im Browser öffnen
- [ ] Chat-Widget sollte erscheinen

---

## 📋 Test-Checkliste

### **Basic Functionality:**
- [ ] Widget erscheint auf der Seite (rechts unten)
- [ ] Toggle-Button funktioniert (öffnet/schließt Chat)
- [ ] Chat-Window kann geöffnet/geschlossen werden
- [ ] Welcome-Message erscheint

### **Messaging:**
- [ ] Nachricht eingeben und senden
- [ ] Bot-Antwort wird angezeigt
- [ ] Mehrere Nachrichten funktionieren
- [ ] Enter-Taste sendet Nachricht
- [ ] Loading-Indicator erscheint beim Senden

### **Flow Execution:**
- [ ] Bot antwortet basierend auf Flow
- [ ] Message Nodes werden angezeigt
- [ ] Question Nodes funktionieren (Buttons als Text)
- [ ] Flow wird korrekt ausgeführt

### **Session Management:**
- [ ] Session bleibt nach Page-Reload erhalten
- [ ] Neue Session bei neuem Browser-Tab
- [ ] Session-ID wird korrekt generiert

### **UI/UX:**
- [ ] Design sieht gut aus
- [ ] Responsive auf Mobile
- [ ] Auto-Scroll funktioniert
- [ ] Keine Console-Errors

### **API Integration:**
- [ ] API-Calls funktionieren (Network Tab prüfen)
- [ ] Responses werden korrekt empfangen
- [ ] Error-Handling funktioniert

---

## 🐛 Bekannte Issues & Troubleshooting

### **Widget erscheint nicht:**
- ✅ Prüfe Browser Console
- ✅ Prüfe ob `data-bot-id` korrekt ist
- ✅ Prüfe ob Bot aktiv ist

### **Keine Antworten:**
- ✅ Prüfe Network Tab (API-Calls)
- ✅ Prüfe ob Flow aktiv ist
- ✅ Prüfe Server Logs

### **CORS Errors:**
- ✅ Widget muss von derselben Domain wie API kommen
- ✅ Oder CORS auf API konfigurieren

---

## 📝 Test-HTML

Siehe: `test-widget.html` (wird erstellt)

---

**Status:** Ready for Testing  
**Letzte Aktualisierung:** 2025-01-XX

