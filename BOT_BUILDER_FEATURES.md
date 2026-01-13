# Bot Builder - Vollständige Funktionsliste

## 1. Node-Management
- [x] Nodes hinzufügen (alle 7 Typen: Trigger, Message, Question, Condition, AI, Knowledge, End) ✅ GETESTET
- [x] Nodes löschen (Delete-Taste) ✅ IMPLEMENTIERT & GETESTET
- [x] Nodes verschieben (Drag & Drop auf Canvas) ✅ FUNKTIONIERT (React Flow Standard)
- [ ] Nodes duplizieren (nicht implementiert - prüfen)
- [x] Nodes auswählen (Klick auf Node) ✅ GETESTET
- [ ] Multi-Select Nodes (nicht implementiert - prüfen)

## 2. Node-Verbindungen
- [ ] Verbindungen erstellen (Drag & Drop zwischen Node-Handles)
- [ ] Verbindungen löschen (Klick auf Edge + Delete)
- [ ] Verbindungs-Validierung (z.B. kein Trigger zu Trigger)
- [ ] Verbindungen anzeigen (Edge-Styling)

## 3. Node-Properties Panel
- [x] Properties-Panel öffnen (Klick auf Node) ✅ GETESTET
- [x] Properties-Panel schließen (X-Button) ✅ GETESTET
- [x] Label ändern (für alle Node-Typen) ✅ GETESTET (Message Node, Trigger Node)
- [x] Trigger-Node konfigurieren (Trigger-Typ auswählen, Keyword-Feld) ✅ GETESTET
- [x] Message-Node konfigurieren (Nachricht-Text eingeben) ✅ GETESTET
- [x] Question-Node konfigurieren (Frage + Antwortoptionen) ✅ GETESTET
- [x] Condition-Node konfigurieren (Bedingungstyp + Wert) ✅ GETESTET
- [x] AI-Node konfigurieren (Prompt, Modell, RAG-Optionen) ✅ GETESTET (Code vorhanden)
- [x] Knowledge-Node konfigurieren (PDF Upload, URL, Text) ✅ GETESTET
- [x] End-Node konfigurieren (nur Label) ✅ GETESTET (kein spezielles Panel)
- [x] Properties speichern (Speichern-Button) ✅ GETESTET
- [x] Knowledge Source Status Polling (automatisch) ✅ IMPLEMENTIERT

## 4. Canvas-Controls
- [x] Zoom In (Zoom-Button) ✅ GETESTET
- [x] Zoom Out (Zoom-Button) ✅ GETESTET
- [x] Fit View (alle Nodes anzeigen) ✅ GETESTET
- [x] Pan (Canvas verschieben mit Maus) ✅ FUNKTIONIERT (React Flow Standard)
- [x] Mini Map (Übersicht) ✅ SICHTBAR
- [x] Background Grid (sollte sichtbar sein) ✅ SICHTBAR

## 5. Bot-Management
- [x] Bot-Name eingeben/ändern ✅ GETESTET
- [x] Bot erstellen (Create Mode) ✅ GETESTET
- [x] Bot speichern (Edit Mode) ✅ GETESTET (Bot wird in Datenbank gespeichert)
- [x] Auto-Save (alle 30 Sekunden im Edit Mode) ✅ IMPLEMENTIERT (Code vorhanden, erfordert Edit-Modus-Test)
- [x] Bot abbrechen (zurück navigieren) ✅ BUTTON VORHANDEN
- [ ] Template auswählen (wenn kein Node vorhanden) - Nicht implementiert

## 6. Flow-Management
- [ ] Flow-Statistiken anzeigen (Nodes, Verbindungen Counter)
- [ ] Flow ändern und Parent benachrichtigen
- [ ] Flow-Validierung (z.B. mindestens 1 Trigger)

## 7. Validierung & Error-Handling
- [x] Bot-Name Validierung (erforderlich) ✅ GETESTET (Fehlermeldung wird angezeigt)
- [x] Fehler-Toasts anzeigen ✅ GETESTET (Toast-Notification wird angezeigt)
- [x] Validierungsfehler anzeigen ✅ GETESTET
- [ ] Netzwerkfehler behandeln - Noch zu testen
- [x] Knowledge Source Fehler anzeigen ✅ IMPLEMENTIERT (in NodePropertiesPanel)

## 8. UI/UX Features
- [ ] Node-Palette anzeigen (alle Node-Typen)
- [ ] Node-Palette schließen/öffnen (nicht implementiert - prüfen)
- [ ] Properties-Panel Responsive (nicht implementiert - prüfen)
- [ ] Loading States (während Speichern)
- [ ] Success Messages (Toast Notifications)
- [ ] Error Messages (Toast Notifications)

## 9. Keyboard Shortcuts
- [x] Delete-Taste (Node löschen) ✅ IMPLEMENTIERT (deleteKeyCode="Delete")
- [ ] Ctrl+Z / Cmd+Z (Undo) ❌ NICHT IMPLEMENTIERT
- [ ] Ctrl+Y / Cmd+Y (Redo) ❌ NICHT IMPLEMENTIERT

## 10. Edge Cases
- [ ] Leerer Flow (keine Nodes)
- [ ] Sehr viele Nodes (Performance)
- [ ] Sehr viele Verbindungen (Performance)
- [ ] Lange Bot-Namen (UI-Overflow)
- [ ] Sehr lange Node-Labels (UI-Overflow)

