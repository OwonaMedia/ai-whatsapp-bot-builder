/**
 * ✅ Sichere fetch-Wrapper-Funktion für direkte Frontend-Calls
 * 
 * Diese Funktion wird für direkte fetch-Aufrufe verwendet (nicht Supabase).
 * Supabase verwendet die custom fetch-Funktion aus lib/supabase-fetch.ts
 * 
 * Entfernt automatisch Body von GET/HEAD Requests
 */

export async function safeFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  // ✅ Request-Objekt behandeln
  if (input instanceof Request) {
    const method = input.method.toUpperCase();
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
        // Body wird absichtlich weggelassen
      }));
    }
    return fetch(input, init);
  }
  
  // ✅ Init-Objekt behandeln
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
        // Body wird absichtlich weggelassen
      });
    }
  }
  
  return fetch(input, init);
}

