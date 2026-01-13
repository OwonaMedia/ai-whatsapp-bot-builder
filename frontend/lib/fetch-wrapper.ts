/**
 * Fetch-Wrapper um sicherzustellen, dass GET-Requests keinen Body haben
 * Verhindert den Fehler: "Request with GET/HEAD method cannot have body"
 */

/**
 * Sicherer fetch-Aufruf mit automatischer Body-Entfernung für GET-Requests
 */
export async function safeFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  // ✅ Wenn method GET/HEAD ist, entferne Body explizit
  if (init) {
    const method = init.method?.toUpperCase() || 'GET';
    if (method === 'GET' || method === 'HEAD') {
      // Entferne Body und Content-Type Header für GET/HEAD
      const { body, ...restInit } = init;
      if (body !== undefined && body !== null) {
        console.warn('[safeFetch] Body removed from GET request:', input);
      }
      
      // Entferne Content-Type Header wenn Body entfernt wurde
      const headers = new Headers(restInit.headers);
      if (headers.has('Content-Type')) {
        headers.delete('Content-Type');
      }
      
      return fetch(input, {
        ...restInit,
        method,
        headers,
      });
    }
  }
  
  // ✅ Normale fetch für POST/PUT/DELETE/etc.
  return fetch(input, init);
}

/**
 * Prüft ob ein fetch-Aufruf einen Body mit GET sendet
 */
export function validateFetchConfig(input: RequestInfo | URL, init?: RequestInit): void {
  if (!init) return;
  
  const method = init.method?.toUpperCase() || 'GET';
  if ((method === 'GET' || method === 'HEAD') && init.body !== undefined && init.body !== null) {
    console.error('[Fetch Validation] GET request with body detected:', {
      url: typeof input === 'string' ? input : input.toString(),
      method,
      hasBody: true,
    });
    throw new Error('GET/HEAD requests cannot have a body');
  }
}












