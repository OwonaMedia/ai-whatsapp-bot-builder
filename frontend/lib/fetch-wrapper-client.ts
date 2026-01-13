'use client';

/**
 * Client-seitiger fetch-Wrapper
 * Wird einmal beim Laden der App initialisiert
 * Verhindert den Fehler: "Request with GET/HEAD method cannot have body"
 * 
 * WICHTIG: Wird nur einmal initialisiert, um Hydration-Probleme zu vermeiden
 */

if (typeof window !== 'undefined' && !(window as any).__fetchWrapperInitialized) {
  (window as any).__fetchWrapperInitialized = true;
  
  const originalFetch = window.fetch;
  
  window.fetch = async function(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    // ✅ Wenn method GET/HEAD ist, entferne Body explizit
    if (init) {
      const method = init.method?.toUpperCase() || 'GET';
      if (method === 'GET' || method === 'HEAD') {
        // Entferne Body und Content-Type Header für GET/HEAD
        if (init.body !== undefined && init.body !== null) {
          console.warn('[Fetch Wrapper] Body removed from GET request:', {
            url: typeof input === 'string' ? input : input.toString(),
            method,
          });
          const { body, ...restInit } = init;
          
          // Entferne Content-Type Header wenn Body entfernt wurde
          const headers = new Headers(restInit.headers);
          if (headers.has('Content-Type')) {
            headers.delete('Content-Type');
          }
          
          return originalFetch(input, {
            ...restInit,
            method,
            headers,
          });
        }
      }
    }
    
    // ✅ Normale fetch für POST/PUT/DELETE/etc. oder wenn kein Body vorhanden
    return originalFetch(input, init);
  };
}

export {};

