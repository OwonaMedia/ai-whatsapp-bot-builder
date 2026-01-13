# RAG Playground Scroll-Fix (Autopatch)

**Kontext**  
- Seite: Startseite `/{locale}` → Abschnitt „RAG Playground“.  
- Problem: Nach mehreren Prompts lässt sich der Chat nicht mehr scrollen, und die Wissensquellen-Liste verschwindet aus dem sichtbaren Bereich (insbesondere auf kleineren Viewports). Nutzer:innen können dadurch keine Quelle mehr wechseln.  

**Trigger-Wörter**  
`RAG Playground`, `scroll`, `Wissensquelle`, `links sichtbar`, `Prompts`, `Chat`, `nicht scrollen`, `nicht sehen`.

**Ziel**  
1. Wissensquellen links sticky & jederzeit scrollbar.  
2. Chat rechts behält einen eigenen Scroll-Container.  
3. Fix wird automatisch deployed (Build + PM2 Restart).  

**Plan-Vorgabe für den Support-Agenten**  
Wenn das oben genannte Muster erkannt wird, erzeuge im JSON-Plan eine Aktion:

```json
{
  "type": "ux_update",
  "description": "Sticky knowledge column & scrollable chat für RAG Playground aktivieren",
  "payload": {
    "fixId": "rag_playground_scroll"
  }
}
```

**Was die Automation erledigt**  
- Ersetzt `frontend/components/demo/RAGDemo.tsx` durch eine optimierte Variante mit sticky Sidebar und separatem Scroll-Container für den Chat (`/* rag-scroll-layout-fix */`).  
- Führt `npm run build` im Frontend aus und startet `pm2 restart whatsapp-bot-builder --update-env`.  
- Sendet anschließend automatisch eine Support-Antwort: Hinweis auf das Update + Bitte um hartes Reload (Strg/Cmd + Shift + R).

**Validierung**  
- Mehrere Prompts schicken → Chat bleibt scrollbar.  
- Wissensquellen-Liste links bleibt sichtbar und scrollbar.  
- Layout funktioniert responsiv (Desktop & Mobile).  

> Idempotent: Falls der Fix bereits aktiv ist, erkennt das System den Marker `/* rag-scroll-layout-fix */` und überspringt Build/Restart.  

