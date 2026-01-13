/**
 * Custom fetch implementation für Supabase
 * Entfernt automatisch Body von GET/HEAD Requests
 * 
 * Diese Funktion wird dem Supabase Client übergeben,
 * um alle internen fetch-Aufrufe zu intercepten.
 */

export function createSupabaseFetch(): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    // ✅ Prüfe ob es ein Request-Objekt ist
    if (input instanceof Request) {
      const method = input.method.toUpperCase();
      
      // ✅ Wenn GET/HEAD und Body vorhanden, erstelle neuen Request ohne Body
      if ((method === 'GET' || method === 'HEAD') && input.body) {
        const headers = new Headers(input.headers);
        headers.delete('Content-Type');
        headers.delete('Content-Length');
        
        return fetch(new Request(input.url, {
          method: input.method,
          headers: headers,
          mode: input.mode,
          credentials: input.credentials,
          cache: input.cache,
          redirect: input.redirect,
          referrer: input.referrer,
          referrerPolicy: input.referrerPolicy,
          integrity: input.integrity,
          keepalive: input.keepalive,
          signal: input.signal,
          // ✅ Body wird absichtlich weggelassen
        }));
      }
      
      // ✅ Request ohne Body-Problem, normal durchreichen
      return fetch(input, init);
    }
    
    // ✅ Bei Init-Objekt prüfen
    if (init) {
      const method = (init.method || 'GET').toUpperCase();
      if ((method === 'GET' || method === 'HEAD') && init.body) {
        const { body, ...restInit } = init;
        const headers = new Headers(restInit.headers);
        headers.delete('Content-Type');
        headers.delete('Content-Length');
        
        return fetch(input, {
          ...restInit,
          headers: headers,
          // ✅ Body wird absichtlich weggelassen
        });
      }
    }
    
    // ✅ Normaler fetch
    return fetch(input, init);
  };
}











