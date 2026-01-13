'use client';

import { useEffect } from 'react';

/**
 * Client Component, das den fetch-Wrapper initialisiert
 * Verhindert den Fehler: "Request with GET/HEAD method cannot have body"
 * 
 * WICHTIG: Wird nur einmal initialisiert, um Hydration-Probleme zu vermeiden
 * 
 * ✅ ERGÄNZUNG: Das inline Script im layout.tsx sollte bereits funktionieren,
 * aber als zusätzliche Sicherheit initialisieren wir hier nochmal
 */
export function FetchWrapper() {
  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).__fetchWrapperInitialized) {
      (window as any).__fetchWrapperInitialized = true;
      
      // ✅ Prüfe ob fetch bereits ersetzt wurde (durch inline Script)
      const currentFetch = window.fetch;
      const fetchString = currentFetch.toString();
      
      if (!fetchString.includes('Global Fetch Fix')) {
        // ✅ Fetch wurde noch nicht ersetzt - mache es jetzt
        const originalFetch = currentFetch;
        
        window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
          try {
            // ✅ Prüfe init-Parameter
            if (init) {
              const method = (init.method || 'GET').toUpperCase();
              if ((method === 'GET' || method === 'HEAD') && (init.body !== undefined && init.body !== null)) {
                console.warn('[FetchWrapper] ⚠️ Body removed from GET request');
                const { body, ...restInit } = init;
                const headers = new Headers(restInit.headers);
                if (headers.has('Content-Type')) headers.delete('Content-Type');
                
                if (input instanceof Request) {
                  return originalFetch(new Request(input.url, {
                    method: method,
                    headers: headers,
                    mode: input.mode,
                    credentials: input.credentials,
                    cache: input.cache,
                    redirect: input.redirect,
                    referrer: input.referrer,
                    referrerPolicy: input.referrerPolicy,
                    integrity: input.integrity,
                  }));
                }
                return originalFetch(input, { ...restInit, method, headers });
              }
            }
            
            // ✅ Prüfe Request-Objekt
            if (input instanceof Request) {
              const method = (input.method || 'GET').toUpperCase();
              if ((method === 'GET' || method === 'HEAD') && input.body !== null && input.body !== undefined) {
                console.warn('[FetchWrapper] ⚠️ Request object has GET method with body');
                return originalFetch(new Request(input.url, {
                  method: method,
                  headers: input.headers,
                  mode: input.mode,
                  credentials: input.credentials,
                  cache: input.cache,
                  redirect: input.redirect,
                  referrer: input.referrer,
                  referrerPolicy: input.referrerPolicy,
                  integrity: input.integrity,
                }));
              }
            }
            
            return originalFetch(input, init);
          } catch (error) {
            console.error('[FetchWrapper] Error in fetch wrapper:', error);
            return originalFetch(input, init);
          }
        };
        
        console.log('[FetchWrapper] ✅ Window.fetch wurde erfolgreich ersetzt (Fallback)');
      } else {
        console.log('[FetchWrapper] ✅ Fetch wurde bereits durch inline Script ersetzt');
      }
      
      // ✅ Zusätzlich: Error-Handler für unerwartete Fälle
      window.addEventListener('error', function(event) {
        if (event.message && typeof event.message === 'string') {
          if ((event.message.includes('GET') || event.message.includes('HEAD')) && event.message.includes('body')) {
            console.warn('[FetchWrapper] Caught GET/HEAD body error (suppressed):', event.message);
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            return true;
          }
        }
        return undefined; // Explicit return for all code paths
      }, true);
      
      // ✅ Unhandled Promise Rejection Handler
      window.addEventListener('unhandledrejection', function(event) {
        if (event.reason) {
          const msg = event.reason.toString();
          if ((msg.includes('GET') || msg.includes('HEAD')) && msg.includes('body')) {
            console.warn('[FetchWrapper] Caught GET/HEAD body promise rejection (suppressed):', msg);
            event.preventDefault();
            return true;
          }
        }
        return undefined; // Explicit return for all code paths
      });
    }
    return undefined; // Explicit return for all code paths
  }, []);

  return null;
}
