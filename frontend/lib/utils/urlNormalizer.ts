/**
 * URL-Normalisierungs-Funktion
 * 
 * Akzeptiert verschiedene URL-Formate:
 * - http://example.com
 * - https://example.com
 * - http://www.example.com
 * - https://www.example.com
 * - www.example.com
 * - example.com
 * 
 * Normalisiert alle zu: https://example.com (oder http:// falls nötig)
 */

export function normalizeURL(input: string): string {
  if (!input || typeof input !== 'string') {
    throw new Error('URL ist erforderlich');
  }

  // Trim whitespace
  let url = input.trim();

  // Entferne führende/trailing Slashes (außer nach Protokoll)
  url = url.replace(/^\/+|\/+$/g, '');

  // Wenn leer, Fehler
  if (!url) {
    throw new Error('URL ist leer');
  }

  // Entferne Spaces
  url = url.replace(/\s+/g, '');

  // Prüfe ob bereits vollständige URL mit Protokoll
  const hasProtocol = /^https?:\/\//i.test(url);
  
  // Prüfe ob www vorhanden (auch nach Protokoll)
  const hasWWW = /(^|\/\/)www\./i.test(url);

  // Extrahiere Domain (ohne Protokoll, behalte www)
  let domain = url.replace(/^https?:\/\//i, '');

  // Validiere Domain-Format (grundlegende Validierung)
  // Erlaubt: domain.tld, domain.tld/path, domain.tld:port, www.domain.tld, etc.
  const domainPattern = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(\/.*)?$/i;
  const wwwDomainPattern = /^www\.([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(\/.*)?$/i;
  const ipPattern = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?(\/.*)?$/;
  const localhostPattern = /^localhost(:\d+)?(\/.*)?$/i;

  const isValidDomain = 
    domainPattern.test(domain) || 
    wwwDomainPattern.test(domain) || 
    ipPattern.test(domain) || 
    localhostPattern.test(domain);
  
  if (!isValidDomain && !hasProtocol) {
    // Versuche es trotzdem als Domain zu behandeln
    // (für komplexere URLs mit Query-Params, Pfaden, etc.)
    // Domain bleibt wie ist
  }

  // Erstelle vollständige URL
  // Standard: https://
  // Nur bei localhost oder IP: http://
  let protocol = 'https://';
  if (localhostPattern.test(domain) || ipPattern.test(domain)) {
    protocol = 'http://';
  }

  // Wenn ursprünglich http:// war, beibehalten (für lokale Entwicklung)
  if (url.toLowerCase().startsWith('http://')) {
    protocol = 'http://';
  }

  // Domain bleibt wie eingegeben (mit oder ohne www)
  // www wird nicht automatisch hinzugefügt oder entfernt
  const normalized = protocol + domain;

  // Validiere finale URL mit URL-Konstruktor
  try {
    new URL(normalized);
    return normalized;
  } catch {
    throw new Error(`Ungültige URL: ${input}`);
  }
}

/**
 * Validiert ob eine URL gültig ist (ohne Normalisierung)
 */
export function isValidURL(input: string): boolean {
  try {
    normalizeURL(input);
    return true;
  } catch {
    return false;
  }
}

