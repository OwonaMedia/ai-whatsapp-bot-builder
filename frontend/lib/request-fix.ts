/**
 * Global Request Fix für Next.js
 * Verhindert "Request has method 'GET' and cannot have a body" Fehler
 * 
 * WICHTIG: Muss in jeder API-Route importiert werden, die GET-Requests verarbeitet
 */

/**
 * Sicherer Request-Handler für GET-Requests
 * Entfernt automatisch den Body, falls vorhanden
 */
export function safeGetRequest(request: Request | any): Request {
  if (request.method?.toUpperCase() === 'GET') {
    // Erstelle neuen Request ohne Body
    const url = request.url || request.nextUrl?.toString() || '';
    const headers = new Headers(request.headers);
    
    // Entferne Content-Type Header wenn vorhanden
    if (headers.has('Content-Type')) {
      headers.delete('Content-Type');
    }
    
    // Erstelle neuen Request ohne Body
    return new Request(url, {
      method: 'GET',
      headers: headers,
      // Kein body-Parameter!
    });
  }
  
  return request;
}











