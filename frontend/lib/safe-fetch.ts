/**
 * Globaler Safe-Fetch-Wrapper
 * Verhindert "Request has method 'GET' and cannot have a body" Fehler
 * 
 * WICHTIG: Diese Funktion wird global verwendet und entfernt automatisch
 * Body von GET/HEAD-Requests, bevor sie gesendet werden.
 */

/**
 * Sicherer fetch-Aufruf der automatisch Body von GET-Requests entfernt
 */
export async function safeFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  // ✅ Parse input zu URL-String für besseres Logging
  let urlString = '';
  try {
    if (typeof input === 'string') {
      urlString = input;
    } else if (input instanceof URL) {
      urlString = input.toString();
    } else if (input instanceof Request) {
      urlString = input.url;
    }
  } catch (e) {
    urlString = String(input);
  }

  // ✅ Wenn method GET/HEAD ist, entferne Body explizit
  if (init) {
    const method = (init.method || 'GET').toUpperCase();
    
    if ((method === 'GET' || method === 'HEAD') && (init.body !== undefined && init.body !== null)) {
      console.warn('[Safe Fetch] ⚠️ Body removed from GET request:', {
        url: urlString,
        method,
      });
      
      // ✅ Erstelle neuen init ohne Body
      const { body, ...restInit } = init;
      
      // ✅ Entferne Content-Type Header wenn Body entfernt wurde
      const headers = new Headers(restInit.headers);
      if (headers.has('Content-Type')) {
        headers.delete('Content-Type');
      }
      
      // ✅ Erstelle neuen Request ohne Body (falls input ein Request-Objekt ist)
      if (input instanceof Request) {
        const newRequest = new Request(input.url, {
          method: method,
          headers: headers,
          mode: input.mode,
          credentials: input.credentials,
          cache: input.cache,
          redirect: input.redirect,
          referrer: input.referrer,
          referrerPolicy: input.referrerPolicy,
          integrity: input.integrity,
        });
        return fetch(newRequest);
      }
      
      // ✅ URL-String oder URL-Objekt
      return fetch(input, {
        ...restInit,
        method,
        headers,
      });
    }
  }
  
  // ✅ Zusätzliche Prüfung: Wenn input ein Request-Objekt ist und GET/HEAD hat Body
  if (input instanceof Request) {
    const method = input.method.toUpperCase();
    if ((method === 'GET' || method === 'HEAD') && input.body !== null) {
      console.warn('[Safe Fetch] ⚠️ Request object has GET method with body:', {
        url: input.url,
        method,
      });
      
      // Erstelle neuen Request ohne Body
      const newRequest = new Request(input.url, {
        method: method,
        headers: input.headers,
        mode: input.mode,
        credentials: input.credentials,
        cache: input.cache,
        redirect: input.redirect,
        referrer: input.referrer,
        referrerPolicy: input.referrerPolicy,
        integrity: input.integrity,
      });
      return fetch(newRequest);
    }
  }
  
  // ✅ Normale fetch für POST/PUT/DELETE/etc. oder wenn kein Body vorhanden
  return fetch(input, init);
}











