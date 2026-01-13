# 🔍 Diagnose: Seite offline

## Identifizierte Probleme

### 1. ❌ Client Components in Server Component
**Problem**: `RAGDemo` und `ScreenshotCard` sind Client Components (`'use client'`), werden aber direkt in einer Server Component importiert.

**Dateien**:
- `components/demo/RAGDemo.tsx` - Client Component
- `components/screenshots/ScreenshotCard.tsx` - Client Component
- `app/[locale]/page.tsx` - Server Component (importiert beide direkt)

**Lösung**: Dynamische Imports mit `dynamic()` verwenden (wie bei StructuredData).

### 2. ⚠️ Einrückungsproblem
**Problem**: Zeile 39 - `if` Statement ist nicht korrekt eingerückt nach `try` Block.

### 3. ⚠️ Mögliche Build-Fehler
**Problem**: Build könnte fehlschlagen wegen Client/Server Component Mismatch.

## Wiederherstellungsplan

### Schritt 1: Client Components dynamisch importieren
- `RAGDemo` → `dynamic()` Import
- `ScreenshotCard` → `dynamic()` Import

### Schritt 2: Einrückung korrigieren
- `if` Statement korrekt einrücken

### Schritt 3: Build-Test
- `npm run build` ausführen
- Fehler beheben

### Schritt 4: Minimale Fallback-Version
- Falls weiterhin Probleme: Minimale Version ohne komplexe Komponenten




