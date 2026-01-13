# Fehlerbeschreibung: "Request has method 'GET' and cannot have a body"

## Problem-Übersicht

**Fehlermeldung:**
```
Failed to execute 'fetch' on 'Window': Request with GET/HEAD method cannot have body.
```

**Status:** ❌ **PERSISTENT** - Alle bisherigen Lösungsversuche haben nicht funktioniert

**Kritikalität:** Hoch - Fehler erscheint in der Browser-Konsole und stört die User Experience

---

## Technischer Kontext

### Tech-Stack
- **Frontend:** Next.js 14+ (App Router)
- **Backend:** Next.js API Routes
- **Database:** Supabase (PostgreSQL)
- **State Management:** React Hooks
- **HTTP Client:** Native `fetch` API, Supabase Client

### Umgebung
- **Browser:** Chrome, Safari, Firefox (alle betroffen)
- **Server:** Node.js mit PM2
- **Deployment:** VPS (91.99.232.126)

---

## Reproduktion

### Schritte zur Reproduktion
1. Öffne die Anwendung: `https://whatsapp.owona.de`
2. Navigiere zum Bot Builder
3. Erstelle oder bearbeite einen Bot
4. Füge eine Knowledge Node hinzu
5. Versuche, eine Wissensquelle hinzuzufügen (URL, PDF oder Text)
6. **Fehler erscheint in der Browser-Konsole**

### Häufigkeit
- **100% reproduzierbar** beim Hinzufügen von Wissensquellen
- Tritt auch bei Status-Checks (Polling) auf
- Fehler erscheint sowohl in der Konsole als auch als UI-Fehlermeldung

---

## Fehleranalyse

### Vermutete Ursache
Der Fehler wird wahrscheinlich von **Supabase Client** verursacht, der intern `fetch` verwendet und möglicherweise GET-Requests mit Body-Parametern sendet.

### Problem-Stellen im Code

#### 1. Knowledge Node Upload (`KnowledgeNodeUpload.tsx`)
```typescript
// Zeile 66-68: GET-Request für Status-Check
const response = await safeFetch(`/api/knowledge/sources/${currentSourceId}`, {
  method: 'GET',
});

// Zeile 99-101: GET-Request beim Polling
const response = await safeFetch(`/api/knowledge/sources/${sourceId}`, {
  method: 'GET',
});
```

#### 2. API Route (`app/api/knowledge/sources/[id]/route.ts`)
```typescript
// Zeile 42: Supabase Client verwendet intern fetch
const supabase = await createRouteHandlerClient();

// Zeile 51-55: Supabase Query könnte GET mit Body senden
const { data: source, error } = await supabase
  .from('knowledge_sources')
  .select('*')
  .eq('id', id)
  .single();
```

#### 3. Supabase Client (`lib/supabase.ts`)
```typescript
// Zeile 36: Browser Client verwendet window.fetch
return createBrowserClient(supabaseUrl, supabaseAnonKey);

// Zeile 60: Server Client verwendet fetch
return createServerClient(supabaseUrl, supabaseAnonKey, {
  cookies: { /* ... */ }
});
```

---

## Versuchte Lösungen (Alle fehlgeschlagen)

### 1. ✅ Globaler Fetch-Patch (Inline Script)
**Ansatz:** `window.fetch` global ersetzen, um Body von GET-Requests zu entfernen
**Status:** ❌ Fehlgeschlagen - Fehler tritt weiterhin auf
**Datei:** `app/[locale]/layout.tsx` (Zeile 73-108)

### 2. ✅ FetchWrapper Komponente
**Ansatz:** React-Komponente, die `window.fetch` nach Mount ersetzt
**Status:** ❌ Fehlgeschlagen - Fehler tritt weiterhin auf
**Datei:** `components/providers/FetchWrapper.tsx` (gelöscht)

### 3. ✅ safeFetch Wrapper-Funktion
**Ansatz:** Wrapper-Funktion, die alle fetch-Aufrufe sicher macht
**Status:** ❌ Fehlgeschlagen - Fehler tritt weiterhin auf
**Datei:** `lib/safe-fetch-wrapper.ts`

### 4. ✅ Middleware-Fix
**Ansatz:** Next.js Middleware, die Body von GET-Requests entfernt
**Status:** ❌ Fehlgeschlagen - Fehler tritt weiterhin auf
**Datei:** `middleware.ts` (Änderungen zurückgenommen)

### 5. ✅ API Route Fix
**Ansatz:** Explizite Checks in API Routes, um Body nicht zu lesen
**Status:** ❌ Fehlgeschlagen - Fehler tritt weiterhin auf
**Datei:** `app/api/knowledge/sources/[id]/route.ts`

### 6. ✅ Error-Handler (Unterdrückung)
**Ansatz:** Globale Error-Handler, die Fehler unterdrücken
**Status:** ⚠️ **Teilweise erfolgreich** - Fehler wird unterdrückt, aber nicht behoben
**Datei:** `app/[locale]/layout.tsx` (Zeile 72-108)

---

## Aktuelle Implementierung

### Error-Handler (Unterdrückung)
```javascript
// app/[locale]/layout.tsx
<script
  dangerouslySetInnerHTML={{
    __html: `
(function(){
  if(typeof window==='undefined')return;
  var o=window.onerror;
  window.onerror=function(m,s,l,c,e){
    if(typeof m==='string'&&m.toLowerCase().includes('get')&&m.toLowerCase().includes('body')&&(m.toLowerCase().includes('cannot have')||m.toLowerCase().includes('request has method'))){
      return true; // Unterdrücke Fehler
    }
    return o?o(m,s,l,c,e):false;
  };
  window.addEventListener('error',function(e){
    if(e.message&&typeof e.message==='string'){
      var msg=e.message.toLowerCase();
      if((msg.includes('get')||msg.includes('head'))&&msg.includes('body')&&(msg.includes('cannot have')||msg.includes('request has method'))){
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return true;
      }
    }
  },true);
  window.addEventListener('unhandledrejection',function(e){
    if(e.reason){
      var msg=(e.reason.toString?e.reason.toString():String(e.reason)).toLowerCase();
      if((msg.includes('get')||msg.includes('head'))&&msg.includes('body')&&(msg.includes('cannot have')||msg.includes('request has method'))){
        e.preventDefault();
        return true;
      }
    }
  },true);
})();
    `,
  }}
/>
```

### safeFetch Wrapper
```typescript
// lib/safe-fetch-wrapper.ts
export async function safeFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  if (init) {
    const method = (init.method || 'GET').toUpperCase();
    if ((method === 'GET' || method === 'HEAD') && init.body !== undefined && init.body !== null) {
      const { body, ...restInit } = init;
      const headers = new Headers(restInit.headers);
      if (headers.has('Content-Type')) headers.delete('Content-Type');
      
      if (input instanceof Request) {
        return fetch(new Request(input.url, {
          method: method,
          headers: headers,
          // ... andere Request-Properties
        }));
      }
      
      return fetch(input, { ...restInit, method, headers });
    }
  }
  
  if (input instanceof Request) {
    const method = (input.method || 'GET').toUpperCase();
    if ((method === 'GET' || method === 'HEAD') && input.body !== null && input.body !== undefined) {
      return fetch(new Request(input.url, {
        method: method,
        headers: input.headers,
        // ... andere Request-Properties
      }));
    }
  }
  
  return fetch(input, init);
}
```

### Knowledge Node Upload Komponente
```typescript
// components/bot-builder/KnowledgeNodeUpload.tsx
// Verwendet safeFetch für alle Requests
const response = await safeFetch(`/api/knowledge/sources/${currentSourceId}`, {
  method: 'GET',
});
```

---

## Code-Stellen, die GET-Requests verwenden

### Frontend-Komponenten
1. **`components/bot-builder/KnowledgeNodeUpload.tsx`**
   - Zeile 66: Status-Check (GET)
   - Zeile 99: Polling (GET)

2. **`components/demo/RAGDemo.tsx`**
   - Zeile 96: Load Sources (GET)
   - Zeile 130: Polling (GET)

3. **`components/bots/BotDetail.tsx`**
   - Zeile 52: Compliance Check (GET)

4. **`components/compliance/CompliancePanel.tsx`**
   - Zeile 49: Compliance Check (GET)

### API Routes
1. **`app/api/knowledge/sources/[id]/route.ts`**
   - Zeile 25-94: GET Handler

2. **`app/api/knowledge/sources/route.ts`**
   - Zeile 25-67: GET Handler

---

## Supabase-Integration

### Browser Client
```typescript
// lib/supabase.ts
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // ✅ Verwendet window.fetch direkt (kann nicht patched werden)
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
```

### Server Client
```typescript
// lib/supabase.ts
export async function createRouteHandlerClient() {
  const { createServerClient } = await import('@supabase/ssr');
  const { cookies } = await import('next/headers');
  
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) { /* ... */ },
    },
  });
}
```

**Problem:** Supabase verwendet intern `fetch` und kann nicht mit unserem Wrapper patched werden.

---

## Mögliche Ursachen

### 1. Supabase Client sendet GET mit Body
- Supabase könnte intern GET-Requests mit Body senden (z.B. für komplexe Queries)
- Unser `safeFetch` Wrapper wird nicht verwendet, da Supabase `fetch` direkt aufruft

### 2. Next.js Request-Handling
- Next.js könnte Request-Body automatisch lesen, auch bei GET-Requests
- Middleware könnte Body hinzufügen

### 3. Browser-Interne Mechanik
- Browser könnte Body automatisch an GET-Requests anhängen
- Request-Objekt könnte bereits Body enthalten, bevor fetch aufgerufen wird

---

## Debugging-Informationen

### Browser-Console Output
```
[Error] Failed to execute 'fetch' on 'Window': Request with GET/HEAD method cannot have body.
```

### Network-Tab
- Request-Methode: GET
- Request-Header: Content-Type könnte vorhanden sein
- Request-Body: Nicht sichtbar (wird vom Browser abgelehnt)

### Stack Trace
```
at fetch (native)
at safeFetch (safe-fetch-wrapper.ts:XX)
at KnowledgeNodeUpload.tsx:XX
```

---

## Anforderungen an die Lösung

1. **Keine Fehler in der Konsole** - Fehler sollte nicht mehr erscheinen
2. **Funktionalität erhalten** - Alle Features müssen weiterhin funktionieren
3. **Keine Performance-Einbußen** - Lösung sollte nicht langsamer sein
4. **Wartbar** - Code sollte sauber und verständlich sein
5. **Zukunftssicher** - Lösung sollte auch mit zukünftigen Updates funktionieren

---

## Vorschläge für weitere Untersuchungen

### 1. Supabase-Client konfigurieren
- Prüfen, ob Supabase eine Option bietet, um fetch zu konfigurieren
- Dokumentation: https://supabase.com/docs/reference/javascript/creating-a-client

### 2. Request-Interception
- Service Worker verwenden, um Requests zu intercepten
- Fetch-API auf niedrigerer Ebene patchen

### 3. Alternative HTTP-Client
- Axios oder andere Library verwenden statt fetch
- Supabase mit custom fetch konfigurieren

### 4. Server-Side Rendering
- Alle Knowledge-Source-Abfragen serverseitig machen
- Client-seitig nur UI-Updates

### 5. API-Route-Refactoring
- Alle Datenbank-Queries über API Routes machen
- Client-seitig keine Supabase-Queries mehr

---

## Zusätzliche Informationen

### Package.json Dependencies
```json
{
  "@supabase/ssr": "^0.x.x",
  "@supabase/supabase-js": "^2.x.x",
  "next": "^14.x.x",
  "react": "^18.x.x"
}
```

### Environment-Variablen
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Browser-Kompatibilität
- Chrome: ✅ Betroffen
- Safari: ✅ Betroffen
- Firefox: ✅ Betroffen
- Edge: ✅ Betroffen (vermutlich)

---

## Zusammenfassung

**Problem:** GET-Requests werden mit Body gesendet, was vom Browser abgelehnt wird.

**Ursache:** Vermutlich Supabase Client, der intern fetch verwendet und nicht mit unserem Wrapper patched werden kann.

**Aktuelle Lösung:** Error-Handler unterdrückt Fehler, behebt aber nicht die Ursache.

**Benötigt:** Eine Lösung, die die Ursache behebt, nicht nur die Symptome unterdrückt.

---

## Kontakt

Bei Fragen oder weiteren Informationen bitte melden.

**Datum:** 2025-01-27
**Version:** 1.0
**Status:** ❌ Offen











