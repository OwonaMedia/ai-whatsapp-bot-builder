/**
 * Dynamische Zahlungsmethoden-Erkennung
 * 
 * Kombiniert IP-Geolocation, Browser-Sprache und Standort
 * für optimale Zahlungsmethoden-Auswahl pro Region
 */

import { NextRequest } from 'next/server';
import { detectLocale } from './localeDetection';

// Länder-Code zu Zahlungsmethoden Mapping
export interface PaymentMethod {
  id: string;
  name: string;
  provider: string;
  icon: string;
  priority: number; // 1 = höchste Priorität
  brandColor?: string;
  logos?: string[];
  fees: {
    percentage: number;
    fixed: number;
    currency: string;
  };
  processingTime: 'instant' | '1-3 days' | '24-48h';
  supportedCountries: string[];
  supportedCurrencies: string[];
  requiresSetup?: boolean; // Benötigt API Keys
  providerMethod?: string;
  purchaseCountry?: string | null;
  metadata?: Record<string, any>;
  supportsRedirect?: boolean;
  enabled?: boolean;
}

// Regionale Zahlungsmethoden-Konfiguration
const REGIONAL_PAYMENT_METHODS: Record<string, PaymentMethod[]> = {
  // Europa
  'DE': [
    { id: 'paypal', name: 'PayPal', provider: 'paypal', icon: '/payment-logos/paypal.svg', priority: 1, brandColor: '#003087', logos: ['/payment-logos/paypal.svg'], fees: { percentage: 2.49, fixed: 0.35, currency: 'EUR' }, processingTime: 'instant', supportedCountries: ['DE', 'AT', 'CH', 'EU'], supportedCurrencies: ['EUR'], requiresSetup: true },
    { id: 'apple-pay', name: 'Apple Pay', provider: 'stripe', icon: '/payment-logos/apple-pay.svg', priority: 2, brandColor: '#000000', logos: ['/payment-logos/apple-pay.svg'], fees: { percentage: 2.9, fixed: 0.30, currency: 'EUR' }, processingTime: 'instant', supportedCountries: ['DE', 'AT', 'CH'], supportedCurrencies: ['EUR'], requiresSetup: false },
    { id: 'google-pay', name: 'Google Pay', provider: 'stripe', icon: '/payment-logos/google-pay.svg', priority: 3, brandColor: '#5F6368', logos: ['/payment-logos/google-pay.svg'], fees: { percentage: 2.9, fixed: 0.30, currency: 'EUR' }, processingTime: 'instant', supportedCountries: ['DE', 'AT', 'CH'], supportedCurrencies: ['EUR'], requiresSetup: false },
    { id: 'amazon-pay', name: 'Amazon Pay', provider: 'stripe', icon: '/payment-logos/amazon-pay.svg', priority: 4, brandColor: '#FF9900', logos: ['/payment-logos/amazon-pay.svg'], fees: { percentage: 2.9, fixed: 0.30, currency: 'EUR' }, processingTime: 'instant', supportedCountries: ['DE', 'AT', 'CH'], supportedCurrencies: ['EUR'], requiresSetup: true, providerMethod: 'amazon_pay' },
    { id: 'revolut-pay', name: 'Revolut Pay', provider: 'stripe', icon: '/payment-logos/revolut-pay.svg', priority: 5, brandColor: '#0056FF', logos: ['/payment-logos/revolut-pay.svg'], fees: { percentage: 2.9, fixed: 0.30, currency: 'EUR' }, processingTime: 'instant', supportedCountries: ['DE', 'AT', 'CH', 'EU'], supportedCurrencies: ['EUR'], requiresSetup: true, providerMethod: 'revolut_pay' },
    { id: 'samsung-pay', name: 'Samsung Pay', provider: 'stripe', icon: '/payment-logos/samsung-pay.svg', priority: 6, brandColor: '#1428A0', logos: ['/payment-logos/samsung-pay.svg'], fees: { percentage: 2.9, fixed: 0.30, currency: 'EUR' }, processingTime: 'instant', supportedCountries: ['DE', 'AT', 'CH'], supportedCurrencies: ['EUR'], requiresSetup: true, providerMethod: 'samsung_pay' },
    { id: 'stripe', name: 'Kreditkarte', provider: 'stripe', icon: '/payment-logos/visa.svg', priority: 7, brandColor: '#1A1F71', logos: ['/payment-logos/visa.svg', '/payment-logos/mastercard.svg'], fees: { percentage: 2.9, fixed: 0.30, currency: 'EUR' }, processingTime: 'instant', supportedCountries: ['DE', 'AT', 'CH'], supportedCurrencies: ['EUR'], requiresSetup: true },
    { id: 'giropay', name: 'Giropay', provider: 'mollie', icon: '/payment-logos/mollie.svg', priority: 8, brandColor: '#003A70', logos: ['/payment-logos/mollie.svg'], fees: { percentage: 0.89, fixed: 0.25, currency: 'EUR' }, processingTime: 'instant', supportedCountries: ['DE'], supportedCurrencies: ['EUR'], requiresSetup: true, providerMethod: 'giropay', supportsRedirect: true },
    { id: 'ideal', name: 'iDEAL', provider: 'mollie', icon: '/payment-logos/mollie.svg', priority: 9, brandColor: '#CC0066', logos: ['/payment-logos/mollie.svg'], fees: { percentage: 0.29, fixed: 0.29, currency: 'EUR' }, processingTime: 'instant', supportedCountries: ['DE', 'NL'], supportedCurrencies: ['EUR'], requiresSetup: true, providerMethod: 'ideal', supportsRedirect: true },
    { id: 'klarna', name: 'Klarna', provider: 'klarna', icon: '/payment-logos/klarna.svg', priority: 10, brandColor: '#FFB3C7', logos: ['/payment-logos/klarna.svg'], fees: { percentage: 2.9, fixed: 0.30, currency: 'EUR' }, processingTime: 'instant', supportedCountries: ['DE', 'AT', 'CH'], supportedCurrencies: ['EUR'], requiresSetup: true, providerMethod: 'pay_later', enabled: false },
    { id: 'link', name: 'Link (Stripe Wallet)', provider: 'stripe', icon: '/payment-logos/link.svg', priority: 11, brandColor: '#1F2937', logos: ['/payment-logos/link.svg'], fees: { percentage: 2.9, fixed: 0.30, currency: 'EUR' }, processingTime: 'instant', supportedCountries: ['DE', 'EU'], supportedCurrencies: ['EUR'], requiresSetup: true, providerMethod: 'link', enabled: false },
    { id: 'kakao-pay', name: 'Kakao Pay', provider: 'stripe', icon: '/payment-logos/kakao-pay.svg', priority: 12, brandColor: '#FEE500', logos: ['/payment-logos/kakao-pay.svg'], fees: { percentage: 2.9, fixed: 0.30, currency: 'EUR' }, processingTime: 'instant', supportedCountries: ['DE'], supportedCurrencies: ['EUR'], requiresSetup: true, providerMethod: 'kakao_pay', enabled: false },
    { id: 'naver-pay', name: 'Naver Pay', provider: 'stripe', icon: '/payment-logos/naver-pay.svg', priority: 13, brandColor: '#1F2937', logos: ['/payment-logos/naver-pay.svg'], fees: { percentage: 2.9, fixed: 0.30, currency: 'EUR' }, processingTime: 'instant', supportedCountries: ['DE'], supportedCurrencies: ['EUR'], requiresSetup: true, providerMethod: 'naver_pay', enabled: false },
    { id: 'payco', name: 'Payco', provider: 'stripe', icon: '/payment-logos/payco.svg', priority: 14, brandColor: '#1F2937', logos: ['/payment-logos/payco.svg'], fees: { percentage: 2.9, fixed: 0.30, currency: 'EUR' }, processingTime: 'instant', supportedCountries: ['DE'], supportedCurrencies: ['EUR'], requiresSetup: true, providerMethod: 'payco', enabled: false },
  ],
  'NL': [
    { id: 'ideal', name: 'iDEAL', provider: 'mollie', icon: '/payment-logos/ideal.svg', priority: 1, fees: { percentage: 0.29, fixed: 0.29, currency: 'EUR' }, processingTime: 'instant', supportedCountries: ['NL'], supportedCurrencies: ['EUR'], requiresSetup: true, providerMethod: 'ideal', supportsRedirect: true },
    { id: 'stripe', name: 'Kreditkarte', provider: 'stripe', icon: '/payment-logos/stripe.svg', priority: 2, fees: { percentage: 2.9, fixed: 0.30, currency: 'EUR' }, processingTime: 'instant', supportedCountries: ['NL'], supportedCurrencies: ['EUR'], requiresSetup: true },
    { id: 'paypal', name: 'PayPal', provider: 'paypal', icon: '/payment-logos/paypal.svg', priority: 3, fees: { percentage: 2.49, fixed: 0.35, currency: 'EUR' }, processingTime: 'instant', supportedCountries: ['NL', 'EU'], supportedCurrencies: ['EUR'], requiresSetup: true },
  ],
  'BE': [
    { id: 'bancontact', name: 'Bancontact', provider: 'mollie', icon: '/payment-logos/bancontact.svg', priority: 1, fees: { percentage: 0.29, fixed: 0.29, currency: 'EUR' }, processingTime: 'instant', supportedCountries: ['BE'], supportedCurrencies: ['EUR'], requiresSetup: true, providerMethod: 'bancontact', supportsRedirect: true },
    { id: 'stripe', name: 'Kreditkarte', provider: 'stripe', icon: '/payment-logos/stripe.svg', priority: 2, fees: { percentage: 2.9, fixed: 0.30, currency: 'EUR' }, processingTime: 'instant', supportedCountries: ['BE'], supportedCurrencies: ['EUR'], requiresSetup: true },
    { id: 'paypal', name: 'PayPal', provider: 'paypal', icon: '/payment-logos/paypal.svg', priority: 3, fees: { percentage: 2.49, fixed: 0.35, currency: 'EUR' }, processingTime: 'instant', supportedCountries: ['BE', 'EU'], supportedCurrencies: ['EUR'], requiresSetup: true },
  ],
  // Nordamerika
  'US': [
    { id: 'stripe', name: 'Credit Card', provider: 'stripe', icon: '/payment-logos/stripe.svg', priority: 1, fees: { percentage: 2.9, fixed: 0.30, currency: 'USD' }, processingTime: 'instant', supportedCountries: ['US', 'CA'], supportedCurrencies: ['USD', 'CAD'], requiresSetup: true },
    { id: 'apple-pay', name: 'Apple Pay', provider: 'stripe', icon: '/payment-logos/apple-pay.svg', priority: 2, fees: { percentage: 2.9, fixed: 0.30, currency: 'USD' }, processingTime: 'instant', supportedCountries: ['US', 'CA'], supportedCurrencies: ['USD', 'CAD'], requiresSetup: false },
    { id: 'google-pay', name: 'Google Pay', provider: 'stripe', icon: '/payment-logos/google-pay.svg', priority: 3, fees: { percentage: 2.9, fixed: 0.30, currency: 'USD' }, processingTime: 'instant', supportedCountries: ['US', 'CA'], supportedCurrencies: ['USD', 'CAD'], requiresSetup: false },
    { id: 'paypal', name: 'PayPal', provider: 'paypal', icon: '/payment-logos/paypal.svg', priority: 4, fees: { percentage: 3.4, fixed: 0.35, currency: 'USD' }, processingTime: 'instant', supportedCountries: ['US', 'CA'], supportedCurrencies: ['USD', 'CAD'], requiresSetup: true },
    { id: 'klarna', name: 'Klarna', provider: 'klarna', icon: '/payment-logos/klarna.svg', priority: 5, fees: { percentage: 2.9, fixed: 0.30, currency: 'USD' }, processingTime: 'instant', supportedCountries: ['US', 'CA'], supportedCurrencies: ['USD', 'CAD'], requiresSetup: true },
  ],
  'CA': [
    { id: 'stripe', name: 'Credit Card', provider: 'stripe', icon: '/payment-logos/stripe.svg', priority: 1, fees: { percentage: 2.9, fixed: 0.30, currency: 'CAD' }, processingTime: 'instant', supportedCountries: ['CA'], supportedCurrencies: ['CAD'], requiresSetup: true },
    { id: 'apple-pay', name: 'Apple Pay', provider: 'stripe', icon: '/payment-logos/apple-pay.svg', priority: 2, fees: { percentage: 2.9, fixed: 0.30, currency: 'CAD' }, processingTime: 'instant', supportedCountries: ['CA'], supportedCurrencies: ['CAD'], requiresSetup: false },
    { id: 'google-pay', name: 'Google Pay', provider: 'stripe', icon: '/payment-logos/google-pay.svg', priority: 3, fees: { percentage: 2.9, fixed: 0.30, currency: 'CAD' }, processingTime: 'instant', supportedCountries: ['CA'], supportedCurrencies: ['CAD'], requiresSetup: false },
  ],
  // Südamerika
  'BR': [
    { id: 'pix', name: 'Pix', provider: 'pix', icon: '/payment-logos/pix.svg', priority: 1, fees: { percentage: 0.99, fixed: 0.10, currency: 'BRL' }, processingTime: 'instant', supportedCountries: ['BR'], supportedCurrencies: ['BRL'], requiresSetup: true },
    { id: 'mercado-pago', name: 'Mercado Pago', provider: 'mercado-pago', icon: '/payment-logos/mercado-pago.svg', priority: 2, fees: { percentage: 3.5, fixed: 0.30, currency: 'BRL' }, processingTime: 'instant', supportedCountries: ['BR', 'AR', 'CL', 'CO', 'MX'], supportedCurrencies: ['BRL', 'ARS', 'CLP', 'COP', 'MXN'], requiresSetup: true },
    { id: 'boleto', name: 'Boleto Bancário', provider: 'boleto', icon: '/payment-logos/boleto.svg', priority: 3, fees: { percentage: 1.5, fixed: 0.25, currency: 'BRL' }, processingTime: '1-3 days', supportedCountries: ['BR'], supportedCurrencies: ['BRL'], requiresSetup: true },
  ],
  'MX': [
    { id: 'oxxo', name: 'OXXO', provider: 'oxxo', icon: '/payment-logos/oxxo.svg', priority: 1, fees: { percentage: 2.5, fixed: 0.30, currency: 'MXN' }, processingTime: 'instant', supportedCountries: ['MX'], supportedCurrencies: ['MXN'], requiresSetup: true },
    { id: 'mercado-pago', name: 'Mercado Pago', provider: 'mercado-pago', icon: '/payment-logos/mercado-pago.svg', priority: 2, fees: { percentage: 3.5, fixed: 0.30, currency: 'MXN' }, processingTime: 'instant', supportedCountries: ['MX'], supportedCurrencies: ['MXN'], requiresSetup: true },
  ],
  // Afrika
  'ZA': [
    { id: 'instant-eft', name: 'Instant EFT', provider: 'payfast', icon: '/payment-logos/instant-eft.svg', priority: 1, fees: { percentage: 1.5, fixed: 0.25, currency: 'ZAR' }, processingTime: 'instant', supportedCountries: ['ZA'], supportedCurrencies: ['ZAR'], requiresSetup: true },
    { id: 'stripe', name: 'Credit Card', provider: 'stripe', icon: '/payment-logos/stripe.svg', priority: 2, fees: { percentage: 3.5, fixed: 0.30, currency: 'ZAR' }, processingTime: 'instant', supportedCountries: ['ZA'], supportedCurrencies: ['ZAR'], requiresSetup: true },
  ],
  'GH': [
    { id: 'mtn-mobile-money', name: 'MTN Mobile Money', provider: 'mtn-mobile-money', icon: '/payment-logos/mtn-mobile-money.svg', priority: 1, brandColor: '#FFCB05', fees: { percentage: 1.5, fixed: 0.20, currency: 'GHS' }, processingTime: 'instant', supportedCountries: ['GH', 'KE', 'UG', 'RW'], supportedCurrencies: ['GHS', 'KES', 'UGX', 'RWF'], requiresSetup: true },
    { id: 'paystack', name: 'Paystack', provider: 'paystack', icon: '/payment-logos/paystack.svg', priority: 2, fees: { percentage: 2.9, fixed: 0.30, currency: 'GHS' }, processingTime: 'instant', supportedCountries: ['GH', 'NG'], supportedCurrencies: ['GHS', 'NGN'], requiresSetup: true },
    { id: 'stripe', name: 'Credit Card', provider: 'stripe', icon: '/payment-logos/stripe.svg', priority: 3, fees: { percentage: 3.5, fixed: 0.30, currency: 'GHS' }, processingTime: 'instant', supportedCountries: ['GH'], supportedCurrencies: ['GHS'], requiresSetup: true },
  ],
  'KE': [
    { id: 'mpesa', name: 'M-Pesa', provider: 'mpesa', icon: '/payment-logos/mpesa.svg', priority: 1, fees: { percentage: 1.5, fixed: 0.20, currency: 'KES' }, processingTime: 'instant', supportedCountries: ['KE', 'TZ', 'GH'], supportedCurrencies: ['KES', 'TZS', 'GHS'], requiresSetup: true },
    { id: 'airtel-money', name: 'Airtel Money', provider: 'airtel-money', icon: '/payment-logos/airtel-money.svg', priority: 2, fees: { percentage: 1.5, fixed: 0.20, currency: 'KES' }, processingTime: 'instant', supportedCountries: ['KE', 'TZ', 'UG'], supportedCurrencies: ['KES', 'TZS', 'UGX'], requiresSetup: true },
    { id: 'flutterwave', name: 'Flutterwave', provider: 'flutterwave', icon: '/payment-logos/flutterwave.svg', priority: 3, fees: { percentage: 2.9, fixed: 0.30, currency: 'KES' }, processingTime: 'instant', supportedCountries: ['KE', 'NG', 'GH'], supportedCurrencies: ['KES', 'NGN', 'GHS'], requiresSetup: true },
    { id: 'stripe', name: 'Credit Card', provider: 'stripe', icon: '/payment-logos/stripe.svg', priority: 4, fees: { percentage: 3.5, fixed: 0.30, currency: 'KES' }, processingTime: 'instant', supportedCountries: ['KE'], supportedCurrencies: ['KES'], requiresSetup: true },
  ],
  'NG': [
    { id: 'paystack', name: 'Paystack', provider: 'paystack', icon: '/payment-logos/paystack.svg', priority: 1, fees: { percentage: 2.9, fixed: 0.30, currency: 'NGN' }, processingTime: 'instant', supportedCountries: ['NG', 'GH'], supportedCurrencies: ['NGN', 'GHS'], requiresSetup: true },
    { id: 'mtn-mobile-money', name: 'MTN Mobile Money', provider: 'mtn-mobile-money', icon: '/payment-logos/mtn-mobile-money.svg', priority: 2, brandColor: '#FFCB05', fees: { percentage: 1.5, fixed: 0.20, currency: 'NGN' }, processingTime: 'instant', supportedCountries: ['NG', 'GH', 'UG', 'RW'], supportedCurrencies: ['NGN', 'GHS', 'UGX', 'RWF'], requiresSetup: true },
    { id: 'stripe', name: 'Credit Card', provider: 'stripe', icon: '/payment-logos/stripe.svg', priority: 3, fees: { percentage: 3.5, fixed: 0.30, currency: 'NGN' }, processingTime: 'instant', supportedCountries: ['NG'], supportedCurrencies: ['NGN'], requiresSetup: true },
  ],
  'TZ': [
    { id: 'mpesa', name: 'M-Pesa', provider: 'mpesa', icon: '/payment-logos/mpesa.svg', priority: 1, fees: { percentage: 1.5, fixed: 0.20, currency: 'TZS' }, processingTime: 'instant', supportedCountries: ['TZ', 'KE', 'GH'], supportedCurrencies: ['TZS', 'KES', 'GHS'], requiresSetup: true },
    { id: 'airtel-money', name: 'Airtel Money', provider: 'airtel-money', icon: '/payment-logos/airtel-money.svg', priority: 2, fees: { percentage: 1.5, fixed: 0.20, currency: 'TZS' }, processingTime: 'instant', supportedCountries: ['TZ', 'KE', 'UG'], supportedCurrencies: ['TZS', 'KES', 'UGX'], requiresSetup: true },
    { id: 'stripe', name: 'Credit Card', provider: 'stripe', icon: '/payment-logos/stripe.svg', priority: 3, fees: { percentage: 3.5, fixed: 0.30, currency: 'TZS' }, processingTime: 'instant', supportedCountries: ['TZ'], supportedCurrencies: ['TZS'], requiresSetup: true },
  ],
  'UG': [
    { id: 'mtn-mobile-money', name: 'MTN Mobile Money', provider: 'mtn-mobile-money', icon: '/payment-logos/mtn-mobile-money.svg', priority: 1, brandColor: '#FFCB05', fees: { percentage: 1.5, fixed: 0.20, currency: 'UGX' }, processingTime: 'instant', supportedCountries: ['UG', 'GH', 'KE', 'RW'], supportedCurrencies: ['UGX', 'GHS', 'KES', 'RWF'], requiresSetup: true },
    { id: 'stripe', name: 'Credit Card', provider: 'stripe', icon: '/payment-logos/stripe.svg', priority: 2, fees: { percentage: 3.5, fixed: 0.30, currency: 'UGX' }, processingTime: 'instant', supportedCountries: ['UG'], supportedCurrencies: ['UGX'], requiresSetup: true },
  ],
  'RW': [
    { id: 'mtn-mobile-money', name: 'MTN Mobile Money', provider: 'mtn-mobile-money', icon: '/payment-logos/mtn-mobile-money.svg', priority: 1, brandColor: '#FFCB05', fees: { percentage: 1.5, fixed: 0.20, currency: 'RWF' }, processingTime: 'instant', supportedCountries: ['RW', 'GH', 'KE', 'UG'], supportedCurrencies: ['RWF', 'GHS', 'KES', 'UGX'], requiresSetup: true },
    { id: 'stripe', name: 'Credit Card', provider: 'stripe', icon: '/payment-logos/stripe.svg', priority: 2, fees: { percentage: 3.5, fixed: 0.30, currency: 'RWF' }, processingTime: 'instant', supportedCountries: ['RW'], supportedCurrencies: ['RWF'], requiresSetup: true },
  ],
  // Asien
  'CN': [
    { id: 'wechat-pay', name: 'WeChat Pay', provider: 'wechat-pay', icon: '/payment-logos/wechat-pay.svg', priority: 1, fees: { percentage: 0.6, fixed: 0, currency: 'CNY' }, processingTime: 'instant', supportedCountries: ['CN'], supportedCurrencies: ['CNY'], requiresSetup: true },
    { id: 'alipay', name: 'Alipay', provider: 'alipay', icon: '/payment-logos/alipay.svg', priority: 2, fees: { percentage: 0.6, fixed: 0, currency: 'CNY' }, processingTime: 'instant', supportedCountries: ['CN'], supportedCurrencies: ['CNY'], requiresSetup: true },
    { id: 'unionpay', name: 'UnionPay', provider: 'unionpay', icon: '/payment-logos/unionpay.svg', priority: 3, fees: { percentage: 2.5, fixed: 0.30, currency: 'CNY' }, processingTime: 'instant', supportedCountries: ['CN'], supportedCurrencies: ['CNY'], requiresSetup: true },
  ],
  'IN': [
    { id: 'paytm', name: 'Paytm', provider: 'paytm', icon: '/payment-logos/paytm.svg', priority: 1, fees: { percentage: 1.5, fixed: 0.25, currency: 'INR' }, processingTime: 'instant', supportedCountries: ['IN'], supportedCurrencies: ['INR'], requiresSetup: true },
    { id: 'upi', name: 'UPI', provider: 'upi', icon: '/payment-logos/upi.svg', priority: 2, fees: { percentage: 0, fixed: 0, currency: 'INR' }, processingTime: 'instant', supportedCountries: ['IN'], supportedCurrencies: ['INR'], requiresSetup: true },
    { id: 'stripe', name: 'Credit Card', provider: 'stripe', icon: '/payment-logos/stripe.svg', priority: 3, fees: { percentage: 3.0, fixed: 0.30, currency: 'INR' }, processingTime: 'instant', supportedCountries: ['IN'], supportedCurrencies: ['INR'], requiresSetup: true },
  ],
  'SG': [
    { id: 'grabpay', name: 'GrabPay', provider: 'grabpay', icon: '/payment-logos/grabpay.svg', priority: 1, fees: { percentage: 2.5, fixed: 0.30, currency: 'SGD' }, processingTime: 'instant', supportedCountries: ['SG', 'MY', 'TH', 'ID', 'PH'], supportedCurrencies: ['SGD', 'MYR', 'THB', 'IDR', 'PHP'], requiresSetup: true },
    { id: 'paynow', name: 'PayNow', provider: 'paynow', icon: '/payment-logos/paynow.svg', priority: 2, fees: { percentage: 0, fixed: 0, currency: 'SGD' }, processingTime: 'instant', supportedCountries: ['SG'], supportedCurrencies: ['SGD'], requiresSetup: true },
    { id: 'stripe', name: 'Credit Card', provider: 'stripe', icon: '/payment-logos/stripe.svg', priority: 3, fees: { percentage: 3.0, fixed: 0.30, currency: 'SGD' }, processingTime: 'instant', supportedCountries: ['SG'], supportedCurrencies: ['SGD'], requiresSetup: true },
  ],
};

// Fallback: Globale Standard-Methoden
const GLOBAL_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'stripe',
    name: 'Credit Card',
    provider: 'stripe', icon: '/payment-logos/visa.svg', priority: 1,
    brandColor: '#1A1F71',
    logos: ['/payment-logos/visa.svg', '/payment-logos/mastercard.svg'],
    fees: { percentage: 2.9, fixed: 0.3, currency: 'USD' },
    processingTime: 'instant',
    supportedCountries: ['*'],
    supportedCurrencies: ['*'],
    requiresSetup: true,
  },
  {
    id: 'paypal',
    name: 'PayPal',
    provider: 'paypal', icon: '/payment-logos/paypal.svg', priority: 2,
    brandColor: '#003087',
    logos: ['/payment-logos/paypal.svg'],
    fees: { percentage: 3.4, fixed: 0.35, currency: 'USD' },
    processingTime: 'instant',
    supportedCountries: ['*'],
    supportedCurrencies: ['*'],
    requiresSetup: true,
  },
];

const SUPPORTED_METHOD_IDS = new Set([
  'stripe',
  'paypal',
  'apple-pay',
  'google-pay',
  'mtn-mobile-money',
]);

function isStripeConfigured(): boolean {
  const candidate =
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
    process.env.STRIPE_PUBLISHABLE_KEY ||
    process.env.STRIPE_SECRET_KEY;
  return typeof candidate === 'string' && candidate.trim().length > 0 && !candidate.includes('PLACEHOLDER');
}

function isPayPalConfigured(): boolean {
  return (
    typeof process.env.PAYPAL_CLIENT_ID === 'string' &&
    process.env.PAYPAL_CLIENT_ID.trim().length > 0 &&
    !process.env.PAYPAL_CLIENT_ID.includes('PLACEHOLDER') &&
    typeof process.env.PAYPAL_CLIENT_SECRET === 'string' &&
    process.env.PAYPAL_CLIENT_SECRET.trim().length > 0 &&
    !process.env.PAYPAL_CLIENT_SECRET.includes('PLACEHOLDER')
  );
}

function isMtnConfigured(): boolean {
  return (
    typeof process.env.MTN_API_KEY === 'string' &&
    process.env.MTN_API_KEY.trim().length > 0 &&
    !process.env.MTN_API_KEY.includes('PLACEHOLDER') &&
    typeof process.env.MTN_USER_ID === 'string' &&
    process.env.MTN_USER_ID.trim().length > 0 &&
    !process.env.MTN_USER_ID.includes('PLACEHOLDER') &&
    typeof process.env.MTN_PRIMARY_KEY === 'string' &&
    process.env.MTN_PRIMARY_KEY.trim().length > 0 &&
    !process.env.MTN_PRIMARY_KEY.includes('PLACEHOLDER')
  );
}

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
  const paymentMethods = getPaymentMethodsForCountry(country, currency).map((method) => ({
    ...method,
    purchaseCountry: method.supportedCountries.includes(country || '')
      ? country || method.supportedCountries[0] || null
      : method.supportedCountries[0] || null,
  }));
  
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

function getUserPaymentPreference(request: NextRequest): string | null {
  const paymentCountry = request.cookies.get('PAYMENT_COUNTRY')?.value;
  if (paymentCountry) return paymentCountry;
  
  const urlParams = request.nextUrl.searchParams;
  const countryParam = urlParams.get('country');
  if (countryParam) return countryParam.toUpperCase();
  
  return null;
}

async function detectIPLocation(request: NextRequest): Promise<string | null> {
  try {
    const cloudflareCountry = request.headers.get('CF-IPCountry');
    if (cloudflareCountry && cloudflareCountry !== 'XX') {
      return cloudflareCountry;
    }
    return null;
  } catch (error) {
    console.error('[PaymentDetection] IP Location detection failed:', error);
    return null;
  }
}

function getCountryFromLocale(locale: string | null): string | null {
  if (!locale) return null;
  
  const localeToCountry: Record<string, string> = {
    'de': 'DE', 'en': 'US', 'fr': 'FR', 'sw': 'KE', 'ha': 'NG', 'yo': 'NG', 'am': 'ET', 'zu': 'ZA',
  };
  
  return localeToCountry[locale] || null;
}

function getCurrencyFromCountry(country: string | null): string | null {
  if (!country) return 'USD';
  
  const countryToCurrency: Record<string, string> = {
    'DE': 'EUR', 'AT': 'EUR', 'CH': 'EUR', 'FR': 'EUR', 'IT': 'EUR', 'ES': 'EUR', 'NL': 'EUR', 'BE': 'EUR',
    'US': 'USD', 'CA': 'CAD',
    'BR': 'BRL', 'MX': 'MXN', 'AR': 'ARS', 'CL': 'CLP', 'CO': 'COP',
    'ZA': 'ZAR', 'KE': 'KES', 'NG': 'NGN', 'GH': 'GHS', 'TZ': 'TZS', 'UG': 'UGX', 'RW': 'RWF',
    'CN': 'CNY', 'IN': 'INR', 'SG': 'SGD', 'MY': 'MYR', 'TH': 'THB', 'ID': 'IDR', 'PH': 'PHP',
  };
  
  return countryToCurrency[country] || 'USD';
}

function filterSupportedMethods(
  methods: PaymentMethod[] | undefined,
  currency: string | null,
): PaymentMethod[] {
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

  const supported = withCurrency.filter((method) =>
    SUPPORTED_METHOD_IDS.has(method.id),
  );

  return supported;
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
        enabled: isStripeConfigured(),
        requiresSetup: !isStripeConfigured(),
      };
    }
    if (method.provider === 'paypal') {
      return {
        ...method,
        enabled: isPayPalConfigured(),
        requiresSetup: !isPayPalConfigured(),
      };
    }
    if (method.provider === 'mtn-mobile-money') {
      return {
        ...method,
        enabled: isMtnConfigured(),
        requiresSetup: !isMtnConfigured(),
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
  
  const cookies = document.cookie.split(';');
  const paymentCountryCookie = cookies.find(c => c.trim().startsWith('PAYMENT_COUNTRY='));
  if (paymentCountryCookie) {
    const country = paymentCountryCookie.split('=')[1]?.trim().toUpperCase();
    if (country) {
      const currency = getCurrencyFromCountry(country);
      return getPaymentMethodsForCountry(country, currency);
    }
  }
  
  const urlParams = new URLSearchParams(window.location.search);
  const countryParam = urlParams.get('country');
  if (countryParam) {
    const country = countryParam.toUpperCase();
    const currency = getCurrencyFromCountry(country);
    return getPaymentMethodsForCountry(country, currency);
  }
  
  const browserLang = navigator.language || (navigator as any).userLanguage;
  if (browserLang) {
    const locale = browserLang.split('-')[0].toLowerCase();
    const country = getCountryFromLocale(locale);
    if (country) {
      const currency = getCurrencyFromCountry(country);
      return getPaymentMethodsForCountry(country, currency);
    }
  }
  
  return GLOBAL_PAYMENT_METHODS;
}

