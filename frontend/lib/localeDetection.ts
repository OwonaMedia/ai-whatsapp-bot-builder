/**
 * Intelligente Sprach-Erkennung
 * 
 * Kombiniert 3 Faktoren für optimale Sprach-Auswahl:
 * 1. Sprachauswahl auf der Seite (Cookie/URL) - Priorität 1
 * 2. Browser-Sprache (Accept-Language Header) - Priorität 2
 * 3. IP-basierte Geolocation - Priorität 3
 * 
 * Gibt die best-mögliche Sprache zurück, basierend auf allen verfügbaren Faktoren.
 */

import { locales, type Locale, defaultLocale } from '@/i18n';
import { NextRequest } from 'next/server';

// IP zu Sprache Mapping (vereinfacht - für Production sollte ein Geolocation Service verwendet werden)
const IP_COUNTRY_LANGUAGE_MAP: Record<string, Locale> = {
  // Deutschland, Österreich, Schweiz
  'DE': 'de' as Locale, 'AT': 'de' as Locale, 'CH': 'de' as Locale,
  // UK, USA, Kanada, Australien, etc.
  'GB': 'en' as Locale, 'US': 'en' as Locale, 'CA': 'en' as Locale, 'AU': 'en' as Locale, 'NZ': 'en' as Locale, 'IE': 'en' as Locale,
  // Frankreich, Belgien, Schweiz (französisch), etc.
  'FR': 'fr' as Locale, 'BE': 'fr' as Locale, 'LU': 'fr' as Locale,
  // Afrika - Swahili
  'TZ': 'sw' as Locale, 'KE': 'sw' as Locale, 'UG': 'sw' as Locale,
  // Afrika - Hausa (Nigeria und Niger)
  'NG': 'ha' as Locale, // Nigeria: Hausa ist am weitesten verbreitet, Yoruba als Fallback über Browser-Sprache
  'NE': 'ha' as Locale,
  // Afrika - Amharic
  'ET': 'am' as Locale,
  // Afrika - Zulu
  'ZA': 'zu' as Locale,
};

// Browser-Sprache zu Locale Mapping
const BROWSER_LANGUAGE_MAP: Record<string, Locale> = {
  'de': 'de' as Locale, 'de-DE': 'de' as Locale, 'de-AT': 'de' as Locale, 'de-CH': 'de' as Locale,
  'en': 'en' as Locale, 'en-US': 'en' as Locale, 'en-GB': 'en' as Locale, 'en-CA': 'en' as Locale, 'en-AU': 'en' as Locale,
  'fr': 'fr' as Locale, 'fr-FR': 'fr' as Locale, 'fr-BE': 'fr' as Locale, 'fr-CH': 'fr' as Locale, 'fr-CA': 'fr' as Locale,
  'sw': 'sw' as Locale, 'sw-KE': 'sw' as Locale, 'sw-TZ': 'sw' as Locale, 'sw-UG': 'sw' as Locale,
  'ha': 'ha' as Locale, 'ha-NG': 'ha' as Locale, 'ha-NE': 'ha' as Locale,
  'yo': 'yo' as Locale, 'yo-NG': 'yo' as Locale,
  'am': 'am' as Locale, 'am-ET': 'am' as Locale,
  'zu': 'zu' as Locale, 'zu-ZA': 'zu' as Locale,
};

export interface LocaleDetectionResult {
  locale: Locale;
  confidence: 'high' | 'medium' | 'low';
  factors: {
    pageLanguage: Locale | null;
    browserLanguage: Locale | null;
    ipLocation: Locale | null;
  };
}

/**
 * Detektiert die beste Sprache basierend auf allen verfügbaren Faktoren
 */
export async function detectLocale(request: NextRequest): Promise<LocaleDetectionResult> {
  const factors = {
    pageLanguage: detectPageLanguage(request),
    browserLanguage: detectBrowserLanguage(request),
    ipLocation: await detectIPLocation(request),
  };

  // Priorität 1: Sprachauswahl auf der Seite (Cookie/URL)
  if (factors.pageLanguage) {
    return {
      locale: factors.pageLanguage,
      confidence: 'high',
      factors,
    };
  }

  // Priorität 2: Browser-Sprache
  if (factors.browserLanguage) {
    return {
      locale: factors.browserLanguage,
      confidence: 'medium',
      factors,
    };
  }

  // Priorität 3: IP-basierte Geolocation
  if (factors.ipLocation) {
    return {
      locale: factors.ipLocation,
      confidence: 'medium',
      factors,
    };
  }

  // Fallback: Default
  return {
    locale: defaultLocale,
    confidence: 'low',
    factors,
  };
}

/**
 * Detektiert Sprache aus Cookie oder URL-Path
 */
function detectPageLanguage(request: NextRequest): Locale | null {
  // 1. Check Cookie
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (cookieLocale && locales.includes(cookieLocale as Locale)) {
    return cookieLocale as Locale;
  }

  // 2. Check URL Path
  const pathname = request.nextUrl.pathname;
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];
  
  if (firstSegment && locales.includes(firstSegment as Locale)) {
    return firstSegment as Locale;
  }

  return null;
}

/**
 * Detektiert Sprache aus Browser Accept-Language Header
 */
function detectBrowserLanguage(request: NextRequest): Locale | null {
  const acceptLanguage = request.headers.get('accept-language');
  
  if (!acceptLanguage) {
    return null;
  }

  // Parse Accept-Language: en-US,en;q=0.9,de;q=0.8
  const languages = acceptLanguage
    .split(',')
    .map((lang) => {
      const [code, q = '1'] = lang.trim().split(';q=');
      return { code: (code || '').trim(), q: parseFloat(q) };
    })
    .sort((a, b) => b.q - a.q);

  // Suche nach unterstützter Sprache
  for (const lang of languages) {
    if (!lang.code) continue;
    
    // Check exakte Übereinstimmung
    const localeCode = BROWSER_LANGUAGE_MAP[lang.code];
    if (localeCode && locales.includes(localeCode)) {
      return localeCode;
    }

    // Check Basis-Sprache (z.B. "de" aus "de-DE")
    const baseCode = lang.code.split('-')[0]?.toLowerCase();
    if (!baseCode) continue;
    
    const baseLocale = BROWSER_LANGUAGE_MAP[baseCode];
    if (baseLocale && locales.includes(baseLocale)) {
      return baseLocale;
    }

    // Check direkt gegen supported locales
    if (locales.includes(baseCode as Locale)) {
      return baseCode as Locale;
    }
  }

  return null;
}

/**
 * Detektiert Sprache basierend auf IP-Adresse (Geolocation)
 */
async function detectIPLocation(request: NextRequest): Promise<Locale | null> {
  try {
    // IP-Adresse aus Request extrahieren
    const ip = getClientIP(request);
    
    if (!ip || isLocalIP(ip)) {
      return null; // Keine Geolocation für Localhost
    }

    // Option 1: Cloudflare CF-IPCountry Header (wenn hinter Cloudflare)
    const cloudflareCountry = request.headers.get('CF-IPCountry');
    if (cloudflareCountry && IP_COUNTRY_LANGUAGE_MAP[cloudflareCountry]) {
      return IP_COUNTRY_LANGUAGE_MAP[cloudflareCountry];
    }

    // Option 2: X-Forwarded-For Header (wenn hinter Proxy)
    const xForwardedFor = request.headers.get('x-forwarded-for');
    if (xForwardedFor) {
      const realIP = xForwardedFor.split(',')[0]?.trim();
      // Hier könnte ein externer Geolocation Service aufgerufen werden
      // Für jetzt verwenden wir nur Cloudflare Header
    }

    // Option 3: Externer Geolocation Service (optional)
    // Beispiel: ipapi.co, ip-api.com, etc.
    // const country = await fetchIPCountry(ip);
    // if (country && IP_COUNTRY_LANGUAGE_MAP[country]) {
    //   return IP_COUNTRY_LANGUAGE_MAP[country];
    // }

    return null;
  } catch (error) {
    console.error('[LocaleDetection] IP Location detection failed:', error);
    return null;
  }
}

/**
 * Extrahiert Client IP aus Request
 */
function getClientIP(request: NextRequest): string | null {
  // Cloudflare
  const cfConnectingIP = request.headers.get('CF-Connecting-IP');
  if (cfConnectingIP) return cfConnectingIP;

  // X-Forwarded-For (kann mehrere IPs enthalten)
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0]?.trim() || null;
  }

  // X-Real-IP
  const xRealIP = request.headers.get('x-real-ip');
  if (xRealIP) return xRealIP;

  // Fallback: Request IP (kann Proxy-IP sein)
  // NextRequest hat kein .ip Property, daher null zurückgeben
  return null;
}

/**
 * Prüft ob IP eine Localhost/Private IP ist
 */
function isLocalIP(ip: string): boolean {
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === 'localhost' ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip.startsWith('172.16.') ||
    ip.startsWith('172.17.') ||
    ip.startsWith('172.18.') ||
    ip.startsWith('172.19.') ||
    ip.startsWith('172.20.') ||
    ip.startsWith('172.21.') ||
    ip.startsWith('172.22.') ||
    ip.startsWith('172.23.') ||
    ip.startsWith('172.24.') ||
    ip.startsWith('172.25.') ||
    ip.startsWith('172.26.') ||
    ip.startsWith('172.27.') ||
    ip.startsWith('172.28.') ||
    ip.startsWith('172.29.') ||
    ip.startsWith('172.30.') ||
    ip.startsWith('172.31.')
  );
}

/**
 * Client-side Locale Detection (für Browser)
 */
export function detectLocaleClient(): Locale {
  // 1. Check Cookie (setzt LanguageSwitcher)
  if (typeof document !== 'undefined') {
    const cookies = document.cookie.split(';');
    const localeCookie = cookies.find((c) => c.trim().startsWith('NEXT_LOCALE='));
    if (localeCookie) {
      const locale = localeCookie.split('=')[1]?.trim();
      if (locale && locales.includes(locale as Locale)) {
        return locale as Locale;
      }
    }

    // 2. Check URL Path
    const pathname = window.location.pathname;
    const segments = pathname.split('/').filter(Boolean);
    const firstSegment = segments[0];
    if (firstSegment && locales.includes(firstSegment as Locale)) {
      return firstSegment as Locale;
    }

    // 3. Check Browser Language
    const browserLang = navigator.language || (navigator as any).userLanguage;
    if (browserLang) {
      const baseCode = browserLang.split('-')[0]?.toLowerCase();
      if (baseCode && locales.includes(baseCode as Locale)) {
        return baseCode as Locale;
      }
    }
  }

  return defaultLocale;
}

/**
 * Kombiniert alle Faktoren für beste Sprach-Auswahl
 * (Proprietärer Algorithmus: gewichtete Kombination)
 */
export function combineLocaleFactors(result: LocaleDetectionResult): Locale {
  const { factors } = result;

  // Gewichtung:
  // - pageLanguage: 100% (wenn vorhanden)
  // - browserLanguage: 70% (wenn pageLanguage fehlt)
  // - ipLocation: 50% (wenn pageLanguage + browserLanguage fehlen)
  
  if (factors.pageLanguage) {
    return factors.pageLanguage; // Höchste Priorität
  }

  if (factors.browserLanguage && factors.ipLocation) {
    // Wenn beide vorhanden: bevorzuge Browser (User-Einstellung)
    return factors.browserLanguage;
  }

  if (factors.browserLanguage) {
    return factors.browserLanguage;
  }

  if (factors.ipLocation) {
    return factors.ipLocation;
  }

  return defaultLocale;
}

