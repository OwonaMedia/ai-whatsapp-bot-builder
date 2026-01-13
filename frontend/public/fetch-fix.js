/**
 * Globaler Fetch-Fix - Wird VOR React geladen
 * Verhindert "Request with GET/HEAD method cannot have body" Fehler
 * 
 * WICHTIG: Dieses Script wird sofort beim Seitenladen ausgeführt,
 * BEVOR React oder andere Libraries initialisiert werden.
 */

(function() {
  'use strict';
  
  // ✅ Ersetze fetch SOFORT wenn verfügbar
  if (typeof window !== 'undefined') {
    // Warte bis fetch verfügbar ist (falls Script zu früh läuft)
    if (!window.fetch) {
      console.warn('[Global Fetch Fix] window.fetch not yet available, waiting...');
      // Versuche später nochmal (wird normalerweise nicht benötigt)
      setTimeout(function() {
        if (window.fetch) {
          setupFetchFix();
        }
      }, 0);
    } else {
      setupFetchFix();
    }
  }
  
  function setupFetchFix() {
    const originalFetch = window.fetch;
    
    window.fetch = function(input, init) {
      // ✅ Parse input zu URL-String
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
          console.warn('[Global Fetch Fix] ⚠️ Body removed from GET request:', {
            url: urlString,
            method: method,
          });
          
          // ✅ Erstelle neuen init ohne Body
          var body = init.body;
          var restInit = {};
          for (var key in init) {
            if (key !== 'body') {
              restInit[key] = init[key];
            }
          }
          
          // ✅ Entferne Content-Type Header wenn Body entfernt wurde
          var headers = new Headers(restInit.headers);
          if (headers.has('Content-Type')) {
            headers.delete('Content-Type');
          }
          restInit.headers = headers;
          restInit.method = method;
          
          // ✅ Erstelle neuen Request ohne Body (falls input ein Request-Objekt ist)
          if (input instanceof Request) {
            var newRequest = new Request(input.url, {
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
            return originalFetch(newRequest);
          }
          
          // ✅ URL-String oder URL-Objekt
          return originalFetch(input, restInit);
        }
      }
      
      // ✅ Zusätzliche Prüfung: Wenn input ein Request-Objekt ist und GET/HEAD hat Body
      if (input instanceof Request) {
        var method = input.method.toUpperCase();
        if ((method === 'GET' || method === 'HEAD') && input.body !== null) {
          console.warn('[Global Fetch Fix] ⚠️ Request object has GET method with body:', {
            url: input.url,
            method: method,
          });
          
          // Erstelle neuen Request ohne Body
          var newRequest = new Request(input.url, {
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
          return originalFetch(newRequest);
        }
      }
      
      // ✅ Normale fetch für POST/PUT/DELETE/etc. oder wenn kein Body vorhanden
      return originalFetch(input, init);
    };
    
    console.log('[Global Fetch Fix] ✅ Window.fetch wurde erfolgreich ersetzt');
  }
})();

// ✅ Zusätzlich: Error-Handler für unerwartete Fälle
if (typeof window !== 'undefined') {
  window.addEventListener('error', function(event) {
    if (event.message && typeof event.message === 'string') {
      if (event.message.includes('GET') && event.message.includes('body')) {
        console.warn('[Global Fetch Fix] Caught GET body error:', event.message);
        event.preventDefault(); // Verhindere dass der Fehler weiter propagiert wird
        return false;
      }
    }
  }, true); // Capture-Phase für frühes Abfangen
}

