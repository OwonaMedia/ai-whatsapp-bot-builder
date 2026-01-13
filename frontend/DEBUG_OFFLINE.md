# 🐛 Debug: Seite offline

## Absolute Minimal-Version aktiviert

Die Seite wurde auf eine absolute Minimal-Version reduziert:
- Keine Imports
- Keine async Funktionen
- Keine params
- Nur reines HTML/JSX

## Prüfschritte

### 1. Server läuft?
```bash
# Terminal prüfen
ps aux | grep "next dev"
# Oder manuell starten:
cd frontend && npm run dev
```

### 2. Port korrekt?
- Standard: Port 3999 (laut Memory)
- Prüfe: `http://localhost:3999/de`

### 3. Browser-Konsole?
- F12 → Console
- Gibt es Fehler?

### 4. Network-Tab?
- F12 → Network
- Wird HTML zurückgegeben?
- Status Code? (200, 404, 500?)

### 5. Middleware blockiert?
- Prüfe `middleware.ts`
- Wird `/de` durchgelassen?

## Mögliche Ursachen

1. **Server läuft nicht**: `npm run dev` nicht gestartet
2. **Port-Konflikt**: Port 3999 belegt
3. **Middleware blockiert**: Route wird umgeleitet
4. **Build-Fehler**: TypeScript-Kompilierung fehlgeschlagen
5. **Routing-Problem**: Route `/de` existiert nicht

## Nächste Schritte

Falls auch die Minimal-Version nicht funktioniert:

1. **Server-Logs prüfen**: Gibt es Fehler im Terminal?
2. **Build-Test**: `npm run build` ausführen
3. **Middleware deaktivieren**: Temporär auskommentieren
4. **Root-Route testen**: `/` statt `/de`




