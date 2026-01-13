# RAG Playground Scroll-Fix (Autopatch)

**Kontext**  
- Betroffene Seite: Hauptseite `/{locale}` – Abschnitt „RAG Playground“  
- Symptom: Nach mehreren Prompts lässt sich der Chatbereich nicht mehr scrollen und die Wissensquellen-Liste verschwindet aus dem sichtbaren Bereich. Nutzer:innen können dadurch keine Quelle mehr auswählen.
- Kategorie: `ux`
- Schlüsselbegriffe (triggers): `RAG Playground`, `scroll`, `Wissensquelle`, `links immer sichtbar`, `Prompts`, `Chat`, `nicht scrollen`, `nicht sehen`

**Ziel**  
1. Links muss die Wissensquellen-Spalte sticky bleiben und unabhängig vom Chat scrollbar sein.  
2. Rechts muss der Chat-Inhalt jederzeit scrollbar sein, auch nach vielen Prompts.  
3. Die Anpassung soll automatisch ausgeliefert werden (Build + PM2 Restart).  

**Vorgehen für den Support-Agenten (LLM-Plan)**  
1. Erkenne das Muster (UX-Problem im RAG Playground).  
2. Erzeuge in deinem JSON-Plan eine `ux_update`-Aktion mit folgendem Payload:
   ```json
   {
     "type": "ux_update",
     "description": "Sticky knowledge column & scrollable chat für RAG Playground aktivieren",
     "payload": {
       "fixId": "rag_playground_scroll"
     }
   }
   ```
3. Nach erfolgreicher Ausführung bestätigt die Automation dem Kunden automatisch die Änderung. Kein weiteres manuelles Follow-up nötig.

**Was die Automation macht**  
- Ersetzt `frontend/components/demo/RAGDemo.tsx` durch eine optimierte Variante mit sticky Sidebar und separatem Scroll-Container für den Chat.  
- Führt `npm run build` im Frontend aus und startet `pm2 restart whatsapp-bot-builder --update-env`.  
- Schreibt eine Support-Nachricht “Frontend Automation” mit Hinweis auf den Fix und empfiehlt hartes Reloading.

**Validierung**  
- RAG Playground öffnen, mehrere Prompts senden: Chat bleibt scrollbar (Vertikal-Scroll im rechten Bereich).  
- Wissensquellen-Panel bleibt links sichtbar und scrollbar.  
- Responsivität (Mobile/Desktop) bleibt erhalten.

> **Hinweis:** Diese Automatisierung ist idempotent. Falls der Fix bereits eingespielt wurde, erkennt das System das Marker-Kommentar `/* rag-scroll-layout-fix */` und überspringt Build/Restart.  

