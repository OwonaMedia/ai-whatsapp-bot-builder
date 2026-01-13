/**
 * Dynamische Zahlungsmethoden-Erkennung
 * 
 * Kombiniert IP-Geolocation, Browser-Sprache und Standort
 * für optimale Zahlungsmethoden-Auswahl pro Region
 * 
 * Priorität:
 * 1. User-Auswahl (Cookie/URL) - Priorität 1
 * 2. IP-basierte Geolocation - Priorität 2
 * 3. Browser-Sprache - Priorität 3
 * 4. Fallback: Globale Standard-Methoden
 */

import { NextRequest } from 'next/server';
import { detectLocale, type LocaleDetectionResult } from './localeDetection';

// Länder-Code zu Zahlungsmethoden Mapping
export interface PaymentMethod {
  id: string;
  name: string;
  provider: string;
  icon: string;
  priority: number; // 1 = höchste Priorität
  fees: {
    percentage: number;
    fixed: number;
    currency: string;
  };
  processingTime: 'instant' | '1-3 days' | '24-48h';
  supportedCountries: string[];
  supportedCurrencies: string[];
}

// Regionale Zahlungsmethoden-Konfiguration
const REGIONAL_PAYMENT_METHODS: Record<string, PaymentMethod[]> = {
  // Europa
  'DE': [
    { id: 'paypal', name: 'PayPal', provider: 'paypal', icon: '💳', priority: 1, fees: { percentage: 3.4, fixed: 0.35, currency: 'EUR' }, processingTime: 'instant', supportedCountries: ['DE', 'AT', 'CH'], supportedCurrencies: ['EUR'] },
    { id: 'stripe', name: 'Kreditkarte', provider: 'stripe', icon: '💳', priority: 2, fees: { percentage: 2.9, fixed: 0.30, currency: 'EUR' }, processingTime: 'instant', supportedCountries: ['DE', 'AT', 'CH'], supportedCurrencies: ['EUR'] },
    { id: 'giropay', name: 'Giropay', provider: 'giropay', icon: '🏦', priority: 3, fees: { percentage: 0.89, fixed: 0.25, currency: 'EUR' }, processingTime: 'instant', supportedCountries: ['DE'], supportedCurrencies: ['EUR'] },
    { id: 'sepa', name: 'SEPA Überweisung', provider: 'sepa', icon: '🏦', priority: 4, fees: { percentage: 0, fixed: 0, currency: 'EUR' }, processingTime: '24-48h', supportedCountries: ['DE', 'AT', 'CH'], supportedCurrencies: ['EUR'] },
    { id: 'klarna', name: 'Klarna', provider: 'klarna', icon: '🛒', priority: 5, fees: { percentage: 2.9, fixed: 0.30, currency: 'EUR' }, processingTime: 'instant', supportedCountries: ['DE', 'AT', 'CH'], supportedCurrencies: ['EUR'] },
  ],
  'NL': [
    { id: 'ideal', name: 'iDEAL', provider: 'mollie', icon: '🏦', priority: 1, fees: { percentage: 0.29, fixed: 0.29, currency: 'EUR' }, processingTime: 'instant', supportedCountries: ['NL'], supportedCurrencies: ['EUR'] },
    { id: 'paypal', name: 'PayPal', provider: 'paypal', icon: '💳', priority: 2, fees: { percentage: 3.4, fixed: 0.35, currency: 'EUR' }, processingTime: 'instant', supportedCountries: ['NL'], supportedCurrencies: ['EUR'] },
    { id: 'stripe', name: 'Kreditkarte', provider: 'stripe', icon: '💳', priority: 3, fees: { percentage: 2.9, fixed: 0.30, currency: 'EUR' }, processingTime: 'instant', supportedCountries: ['NL'], supportedCurrencies: ['EUR'] },
  ],
  'BE': [
    { id: 'bancontact', name: 'Bancontact', provider: 'mollie', icon: '🏦', priority: 1, fees: { percentage: 0.29, fixed: 0.29, currency: 'EUR' }, processingTime: 'instant', supportedCountries: ['BE'], supportedCurrencies: ['EUR'] },
    { id: 'paypal', name: 'PayPal', provider: 'paypal', icon: '💳', priority: 2, fees: { percentage: 3.4, fixed: 0.35, currency: 'EUR' }, processingTime: 'instant', supportedCountries: ['BE'], supportedCurrencies: ['EUR'] },
    { id: 'stripe', name: 'Kreditkarte', provider: 'stripe', icon: '💳', priority: 3, fees: { percentage: 2.9, fixed: 0.30, currency: 'EUR' }, processingTime: 'instant', supportedCountries: ['BE'], supportedCurrencies: ['EUR'] },
  ],
  // Nordamerika
  'US': [
    { id: 'stripe', name: 'Credit Card', provider: 'stripe', icon: '💳', priority: 1, fees: { percentage: 2.9, fixed: 0.30, currency: 'USD' }, processingTime: 'instant', supportedCountries: ['US', 'CA'], supportedCurrencies: ['USD', 'CAD'] },
    { id: 'apple-pay', name: 'Apple Pay', provider: 'stripe', icon: '🍎', priority: 2, fees: { percentage: 2.9, fixed: 0.30, currency: 'USD' }, processingTime: 'instant', supportedCountries: ['US', 'CA'], supportedCurrencies: ['USD', 'CAD'] },
    { id: 'google-pay', name: 'Google Pay', provider: 'stripe', icon: '📱', priority: 3, fees: { percentage: 2.9, fixed: 0.30, currency: 'USD' }, processingTime: 'instant', supportedCountries: ['US', 'CA'], supportedCurrencies: ['USD', 'CAD'] },
    { id: 'paypal', name: 'PayPal', provider: 'paypal', icon: '💳', priority: 4, fees: { percentage: 3.4, fixed: 0.35, currency: 'USD' }, processingTime: 'instant', supportedCountries: ['US', 'CA'], supportedCurrencies: ['USD', 'CAD'] },
    { id: 'venmo', name: 'Venmo', provider: 'paypal', icon: '💳', priority: 5, fees: { percentage: 3.4, fixed: 0.35, currency: 'USD' }, processingTime: 'instant', supportedCountries: ['US'], supportedCurrencies: ['USD'] },
    { id: 'klarna', name: 'Klarna', provider: 'klarna', icon: '🛒', priority: 6, fees: { percentage: 2.9, fixed: 0.30, currency: 'USD' }, processingTime: 'instant', supportedCountries: ['US', 'CA'], supportedCurrencies: ['USD', 'CAD'] },
  ],
  'CA': [
    { id: 'stripe', name: 'Credit Card', provider: 'stripe', icon: '💳', priority: 1, fees: { percentage: 2.9, fixed: 0.30, currency: 'CAD' }, processingTime: 'instant', supportedCountries: ['CA'], supportedCurrencies: ['CAD'] },
    { id: 'apple-pay', name: 'Apple Pay', provider: 'stripe', icon: '🍎', priority: 2, fees: { percentage: 2.9, fixed: 0.30, currency: 'CAD' }, processingTime: 'instant', supportedCountries: ['CA'], supportedCurrencies: ['CAD'] },
    { id: 'google-pay', name: 'Google Pay', provider: 'stripe', icon: '📱', priority: 3, fees: { percentage: 2.9, fixed: 0.30, currency: 'CAD' }, processingTime: 'instant', supportedCountries: ['CA'], supportedCurrencies: ['CAD'] },
    { id: 'paypal', name: 'PayPal', provider: 'paypal', icon: '💳', priority: 4, fees: { percentage: 3.4, fixed: 0.35, currency: 'CAD' }, processingTime: 'instant', supportedCountries: ['CA'], supportedCurrencies: ['CAD'] },
  ],
  // Südamerika
  'BR': [
    { id: 'pix', name: 'Pix', provider: 'pix', icon: '⚡', priority: 1, fees: { percentage: 0.99, fixed: 0.10, currency: 'BRL' }, processingTime: 'instant', supportedCountries: ['BR'], supportedCurrencies: ['BRL'] },
    { id: 'mercado-pago', name: 'Mercado Pago', provider: 'mercado-pago', icon: '💳', priority: 2, fees: { percentage: 3.5, fixed: 0.30, currency: 'BRL' }, processingTime: 'instant', supportedCountries: ['BR', 'AR', 'CL', 'CO', 'MX'], supportedCurrencies: ['BRL', 'ARS', 'CLP', 'COP', 'MXN'] },
    { id: 'boleto', name: 'Boleto Bancário', provider: 'boleto', icon: '🏦', priority: 3, fees: { percentage: 1.5, fixed: 0.25, currency: 'BRL' }, processingTime: '1-3 days', supportedCountries: ['BR'], supportedCurrencies: ['BRL'] },
    { id: 'stripe', name: 'Cartão de Crédito', provider: 'stripe', icon: '💳', priority: 4, fees: { percentage: 3.5, fixed: 0.30, currency: 'BRL' }, processingTime: 'instant', supportedCountries: ['BR'], supportedCurrencies: ['BRL'] },
  ],
  'MX': [
    { id: 'oxxo', name: 'OXXO', provider: 'oxxo', icon: '🏪', priority: 1, fees: { percentage: 2.5, fixed: 0.30, currency: 'MXN' }, processingTime: 'instant', supportedCountries: ['MX'], supportedCurrencies: ['MXN'] },
    { id: 'mercado-pago', name: 'Mercado Pago', provider: 'mercado-pago', icon: '💳', priority: 2, fees: { percentage: 3.5, fixed: 0.30, currency: 'MXN' }, processingTime: 'instant', supportedCountries: ['MX'], supportedCurrencies: ['MXN'] },
    { id: 'stripe', name: 'Tarjeta de Crédito', provider: 'stripe', icon: '💳', priority: 3, fees: { percentage: 3.5, fixed: 0.30, currency: 'MXN' }, processingTime: 'instant', supportedCountries: ['MX'], supportedCurrencies: ['MXN'] },
  ],
  // Afrika
  'ZA': [
    { id: 'stripe', name: 'Credit Card', provider: 'stripe', icon: '💳', priority: 1, fees: { percentage: 3.5, fixed: 0.30, currency: 'ZAR' }, processingTime: 'instant', supportedCountries: ['ZA'], supportedCurrencies: ['ZAR'] },
    { id: 'instant-eft', name: 'Instant EFT', provider: 'payfast', icon: '🏦', priority: 2, fees: { percentage: 1.5, fixed: 0.25, currency: 'ZAR' }, processingTime: 'instant', supportedCountries: ['ZA'], supportedCurrencies: ['ZAR'] },
    { id: 'paypal', name: 'PayPal', provider: 'paypal', icon: '💳', priority: 3, fees: { percentage: 3.4, fixed: 0.35, currency: 'ZAR' }, processingTime: 'instant', supportedCountries: ['ZA'], supportedCurrencies: ['ZAR'] },
  ],
  'KE': [
    { id: 'mpesa', name: 'M-Pesa', provider: 'mpesa', icon: '📱', priority: 1, fees: { percentage: 1.5, fixed: 0.20, currency: 'KES' }, processingTime: 'instant', supportedCountries: ['KE', 'TZ', 'GH'], supportedCurrencies: ['KES', 'TZS', 'GHS'] },
    { id: 'flutterwave', name: 'Flutterwave', provider: 'flutterwave', icon: '💳', priority: 2, fees: { percentage: 2.9, fixed: 0.30, currency: 'KES' }, processingTime: 'instant', supportedCountries: ['KE', 'NG', 'GH'], supportedCurrencies: ['KES', 'NGN', 'GHS'] },
    { id: 'stripe', name: 'Credit Card', provider: 'stripe', icon: '💳', priority: 3, fees: { percentage: 3.5, fixed: 0.30, currency: 'KES' }, processingTime: 'instant', supportedCountries: ['KE'], supportedCurrencies: ['KES'] },
  ],
  'NG': [
    { id: 'paystack', name: 'Paystack', provider: 'paystack', icon: '💳', priority: 1, fees: { percentage: 2.9, fixed: 0.30, currency: 'NGN' }, processingTime: 'instant', supportedCountries: ['NG', 'GH'], supportedCurrencies: ['NGN', 'GHS'] },
    { id: 'flutterwave', name: 'Flutterwave', provider: 'flutterwave', icon: '💳', priority: 2, fees: { percentage: 2.9, fixed: 0.30, currency: 'NGN' }, processingTime: 'instant', supportedCountries: ['NG', 'GH'], supportedCurrencies: ['NGN', 'GHS'] },
    { id: 'stripe', name: 'Credit Card', provider: 'stripe', icon: '💳', priority: 3, fees: { percentage: 3.5, fixed: 0.30, currency: 'NGN' }, processingTime: 'instant', supportedCountries: ['NG'], supportedCurrencies: ['NGN'] },
  ],
  // Asien
  'CN': [
    { id: 'wechat-pay', name: 'WeChat Pay', provider: 'wechat-pay', icon: '💬', priority: 1, fees: { percentage: 0.6, fixed: 0, currency: 'CNY' }, processingTime: 'instant', supportedCountries: ['CN'], supportedCurrencies: ['CNY'] },
    { id: 'alipay', name: 'Alipay', provider: 'alipay', icon: '💳', priority: 2, fees: { percentage: 0.6, fixed: 0, currency: 'CNY' }, processingTime: 'instant', supportedCountries: ['CN'], supportedCurrencies: ['CNY'] },
    { id: 'unionpay', name: 'UnionPay', provider: 'unionpay', icon: '💳', priority: 3, fees: { percentage: 2.5, fixed: 0.30, currency: 'CNY' }, processingTime: 'instant', supportedCountries: ['CN'], supportedCurrencies: ['CNY'] },
  ],
  'IN': [
    { id: 'paytm', name: 'Paytm', provider: 'paytm', icon: '📱', priority: 1, fees: { percentage: 1.5, fixed: 0.25, currency: 'INR' }, processingTime: 'instant', supportedCountries: ['IN'], supportedCurrencies: ['INR'] },
    { id: 'upi', name: 'UPI', provider: 'upi', icon: '⚡', priority: 2, fees: { percentage: 0, fixed: 0, currency: 'INR' }, processingTime: 'instant', supportedCountries: ['IN'], supportedCurrencies: ['INR'] },
    { id: 'stripe', name: 'Credit Card', provider: 'stripe', icon: '💳', priority: 3, fees: { percentage: 3.0, fixed: 0.30, currency: 'INR' }, processingTime: 'instant', supportedCountries: ['IN'], supportedCurrencies: ['INR'] },
  ],
  'SG': [
    { id: 'grabpay', name: 'GrabPay', provider: 'grabpay', icon: '🚗', priority: 1, fees: { percentage: 2.5, fixed: 0.30, currency: 'SGD' }, processingTime: 'instant', supportedCountries: ['SG', 'MY', 'TH', 'ID', 'PH'], supportedCurrencies: ['SGD', 'MYR', 'THB', 'IDR', 'PHP'] },
    { id: 'paynow', name: 'PayNow', provider: 'paynow', icon: '⚡', priority: 2, fees: { percentage: 0, fixed: 0, currency: 'SGD' }, processingTime: 'instant', supportedCountries: ['SG'], supportedCurrencies: ['SGD'] },
    { id: 'stripe', name: 'Credit Card', provider: 'stripe', icon: '💳', priority: 3, fees: { percentage: 3.0, fixed: 0.30, currency: 'SGD' }, processingTime: 'instant', supportedCountries: ['SG'], supportedCurrencies: ['SGD'] },
  ],
};

// Fallback: Globale Standard-Methoden
const GLOBAL_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'stripe',
    name: 'Credit Card',
    provider: 'stripe',
    icon: '💳',
    priority: 1,
    fees: { percentage: 2.9, fixed: 0.3, currency: 'USD' },
    processingTime: 'instant',
    supportedCountries: ['*'],
    supportedCurrencies: ['*'],
  },
  {
    id: 'paypal',
    name: 'PayPal',
    provider: 'paypal',
    icon: '💳',
    priority: 2,
    fees: { percentage: 3.4, fixed: 0.35, currency: 'USD' },
    processingTime: 'instant',
    supportedCountries: ['*'],
    supportedCurrencies: ['*'],
  },
];

const SUPPORTED_METHOD_IDS = new Set(['stripe', 'paypal']);
const stripeKeyCandidate =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  process.env.STRIPE_PUBLISHABLE_KEY ||
  process.env.STRIPE_SECRET_KEY;
const STRIPE_CONFIGURED = typeof stripeKeyCandidate === 'string' && stripeKeyCandidate.trim().length > 0;
const PAYPAL_CONFIGURED =
  typeof process.env.PAYPAL_CLIENT_ID === 'string' &&
  process.env.PAYPAL_CLIENT_ID.trim().length > 0 &&
  typeof process.env.PAYPAL_CLIENT_SECRET === 'string' &&
  process.env.PAYPAL_CLIENT_SECRET.trim().length > 0;

export interface PaymentDetectionResult {
  country: string | null;
  currency: string | null;
  locale: string | null;
  paymentMethods: PaymentMethod[];
  confidence: 'high' | 'medium' | 'low';
  factors: {
    ipLocation: string | null;
    browserLanguage: string | null;
    userSelection: string | null;
  };
}

/**
 * Detektiert die beste Zahlungsmethoden-Auswahl basierend auf IP, Browser-Sprache und User-Auswahl
 */
export async function detectPaymentMethods(
  request: NextRequest,
  userCurrency?: string,
  userCountry?: string
): Promise<PaymentDetectionResult> {
  // 1. User-Auswahl (Cookie/URL) - Priorität 1
  const userSelection = getUserPaymentPreference(request);
  
  // 2. IP-basierte Geolocation - Priorität 2
  const ipLocation = await detectIPLocation(request);
  
  // 3. Browser-Sprache - Priorität 3
  const localeDetection = await detectLocale(request);
  const browserLanguage = localeDetection.locale;
  
  // 4. Bestimme Land und Währung
  const country = userCountry || ipLocation || getCountryFromLocale(browserLanguage);
  const currency = userCurrency || getCurrencyFromCountry(country);
  
  // 5. Hole Zahlungsmethoden für Land
  const paymentMethods = getPaymentMethodsForCountry(country, currency);
  
  // 6. Sortiere nach Priorität
  paymentMethods.sort((a, b) => a.priority - b.priority);
  
  // 7. Bestimme Confidence
  let confidence: 'high' | 'medium' | 'low' = 'low';
  if (userSelection || (ipLocation && browserLanguage)) {
    confidence = 'high';
  } else if (ipLocation || browserLanguage) {
    confidence = 'medium';
  }
  
  return {
    country,
    currency,
    locale: browserLanguage,
    paymentMethods,
    confidence,
    factors: {
      ipLocation,
      browserLanguage,
      userSelection,
    },
  };
}

/**
 * Extrahiert User-Zahlungspräferenz aus Cookie/URL
 */
function getUserPaymentPreference(request: NextRequest): string | null {
  // Check Cookie
  const paymentCountry = request.cookies.get('PAYMENT_COUNTRY')?.value;
  if (paymentCountry) {
    return paymentCountry;
  }
  
  // Check URL Parameter
  const urlParams = request.nextUrl.searchParams;
  const countryParam = urlParams.get('country');
  if (countryParam) {
    return countryParam.toUpperCase();
  }
  
  return null;
}

/**
 * Detektiert Land basierend auf IP-Adresse
 */
async function detectIPLocation(request: NextRequest): Promise<string | null> {
  try {
    // Option 1: Cloudflare CF-IPCountry Header
    const cloudflareCountry = request.headers.get('CF-IPCountry');
    if (cloudflareCountry && cloudflareCountry !== 'XX') {
      return cloudflareCountry;
    }
    
    // Option 2: Externer Geolocation Service (optional)
    // Beispiel: ipapi.co, ip-api.com, etc.
    // const ip = getClientIP(request);
    // if (ip && !isLocalIP(ip)) {
    //   const country = await fetchIPCountry(ip);
    //   if (country) return country;
    // }
    
    return null;
  } catch (error) {
    console.error('[PaymentDetection] IP Location detection failed:', error);
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
  
  // X-Forwarded-For
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }
  
  // X-Real-IP
  const xRealIP = request.headers.get('x-real-ip');
  if (xRealIP) return xRealIP;
  
  return request.ip || null;
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
 * Konvertiert Locale zu Land-Code
 */
function getCountryFromLocale(locale: string | null): string | null {
  if (!locale) return null;
  
  const localeToCountry: Record<string, string> = {
    'de': 'DE',
    'en': 'US',
    'fr': 'FR',
    'sw': 'KE',
    'ha': 'NG',
    'yo': 'NG',
    'am': 'ET',
    'zu': 'ZA',
  };
  
  return localeToCountry[locale] || null;
}

/**
 * Konvertiert Land-Code zu Währung
 */
function getCurrencyFromCountry(country: string | null): string | null {
  if (!country) return 'USD';
  
  const countryToCurrency: Record<string, string> = {
    'DE': 'EUR', 'AT': 'EUR', 'CH': 'EUR', 'FR': 'EUR', 'IT': 'EUR', 'ES': 'EUR', 'NL': 'EUR', 'BE': 'EUR',
    'US': 'USD', 'CA': 'CAD',
    'BR': 'BRL', 'MX': 'MXN', 'AR': 'ARS', 'CL': 'CLP', 'CO': 'COP',
    'ZA': 'ZAR', 'KE': 'KES', 'NG': 'NGN', 'GH': 'GHS',
    'CN': 'CNY', 'IN': 'INR', 'SG': 'SGD', 'MY': 'MYR', 'TH': 'THB', 'ID': 'IDR', 'PH': 'PHP',
  };
  
  return countryToCurrency[country] || 'USD';
}

/**
 * Gibt Zahlungsmethoden für ein Land zurück
 */
function filterSupportedMethods(methods: PaymentMethod[] | undefined, currency: string | null): PaymentMethod[] {
  if (!methods || methods.length === 0) {
    return [];
  }

  const withCurrency = currency
    ? methods.filter(
        (method) =>
          method.supportedCurrencies.includes(currency) ||
          method.supportedCurrencies.includes('*'),
      )
    : methods;

  return withCurrency.filter((method) => SUPPORTED_METHOD_IDS.has(method.id));
}

function getPaymentMethodsForCountry(country: string | null, currency: string | null): PaymentMethod[] {
  const regional = country ? REGIONAL_PAYMENT_METHODS[country] : undefined;
  const usableRegional = filterSupportedMethods(regional, currency);

  if (usableRegional.length > 0) {
    return applyProviderAvailability(usableRegional);
  }

  const fallback = filterSupportedMethods(GLOBAL_PAYMENT_METHODS, currency);
  return fallback.length > 0 ? applyProviderAvailability(fallback) : [];
}

function applyProviderAvailability(methods: PaymentMethod[]): PaymentMethod[] {
  return methods.map((method) => {
    if (method.provider === 'stripe') {
      return {
        ...method,
        enabled: true,
        requiresSetup: method.requiresSetup || !STRIPE_CONFIGURED,
      };
    }
    if (method.provider === 'paypal') {
      return {
        ...method,
        enabled: PAYPAL_CONFIGURED,
        requiresSetup: method.requiresSetup || !PAYPAL_CONFIGURED,
      };
    }
    return {
      ...method,
      enabled: false,
      requiresSetup: true,
    };
  });
}

/**
 * Client-side Payment Detection (für Browser)
 */
export function detectPaymentMethodsClient(): PaymentMethod[] {
  if (typeof window === 'undefined') {
    return GLOBAL_PAYMENT_METHODS;
  }
  
  // 1. Check Cookie
  const cookies = document.cookie.split(';');
  const paymentCountryCookie = cookies.find(c => c.trim().startsWith('PAYMENT_COUNTRY='));
  if (paymentCountryCookie) {
    const country = paymentCountryCookie.split('=')[1].trim().toUpperCase();
    const currency = getCurrencyFromCountry(country);
    return getPaymentMethodsForCountry(country, currency);
  }
  
  // 2. Check URL Parameter
  const urlParams = new URLSearchParams(window.location.search);
  const countryParam = urlParams.get('country');
  if (countryParam) {
    const country = countryParam.toUpperCase();
    const currency = getCurrencyFromCountry(country);
    return getPaymentMethodsForCountry(country, currency);
  }
  
  // 3. Check Browser Language
  const browserLang = navigator.language || (navigator as any).userLanguage;
  if (browserLang) {
    const locale = browserLang.split('-')[0].toLowerCase();
    const country = getCountryFromLocale(locale);
    if (country) {
      const currency = getCurrencyFromCountry(country);
      return getPaymentMethodsForCountry(country, currency);
    }
  }
  
  // Fallback: Globale Methoden
  return GLOBAL_PAYMENT_METHODS;
}

