/**
 * Klarna Payment Provider (Buy Now, Pay Later)
 *
 * Environment Variables:
 * - KLARNA_USERNAME: Username aus dem Klarna Merchant Portal
 * - KLARNA_PASSWORD: Passwort aus dem Klarna Merchant Portal
 * - KLARNA_REGION: 'EU' oder 'NA'
 */

export interface KlarnaConfig {
  username: string;
  password: string;
  region: 'EU' | 'NA';
  baseUrl: string;
}

const getKlarnaConfig = (): KlarnaConfig => {
  const region = (process.env.KLARNA_REGION || 'EU') as 'EU' | 'NA';
  return {
    username: process.env.KLARNA_USERNAME || 'PLACEHOLDER_KLARNA_USERNAME',
    password: process.env.KLARNA_PASSWORD || 'PLACEHOLDER_KLARNA_PASSWORD',
    region,
    baseUrl: region === 'EU'
      ? 'https://api.klarna.com'
      : 'https://api-na.klarna.com',
  };
};

export interface KlarnaSession {
  session_id: string;
  client_token: string;
  payment_method_categories: Array<{
    identifier: string;
    name: string;
  }>;
}

export interface KlarnaOrderLine {
  name: string;
  quantity: number;
  unitPrice: number; // in Hauptwährung
  taxRate?: number; // Prozent (z.B. 19)
  totalAmount?: number; // Optional, sonst unitPrice * quantity
  totalTaxAmount?: number;
  type?: 'physical' | 'discount' | 'shipping_fee' | 'surcharge' | 'gift_card' | 'store_credit' | 'digital' | 'service';
  reference?: string;
}

export interface KlarnaMerchantUrls {
  success: string;
  cancel: string;
  failure?: string;
  pending?: string;
  terms?: string;
  checkout?: string;
}

export interface CreateKlarnaSessionOptions {
  amount: number;
  currency: string;
  purchaseCountry: string;
  locale: string;
  orderLines?: KlarnaOrderLine[];
  merchantUrls: KlarnaMerchantUrls;
  customer?: {
    email?: string;
    first_name?: string;
    last_name?: string;
  };
}

const toMinorUnits = (value: number): number => Math.round(value * 100);

const normalizeKlarnaLocale = (locale: string): string => {
  if (!locale) return 'en-US';
  if (locale.includes('-')) {
    const [language, country] = locale.split('-');
    if (language && country) {
      return `${language.toLowerCase()}-${country.toUpperCase()}`;
    }
  }

  const map: Record<string, string> = {
    de: 'de-DE',
    en: 'en-US',
    fr: 'fr-FR',
    nl: 'nl-NL',
    sv: 'sv-SE',
  };

  return map[locale] || 'en-US';
};

const buildOrderLines = (lines: KlarnaOrderLine[] | undefined, amount: number, currency: string) => {
  const fallback: KlarnaOrderLine[] = lines && lines.length > 0
    ? lines
    : [{
        name: 'Order',
        quantity: 1,
        unitPrice: amount,
      }];

  return fallback.map((line) => {
    const total = line.totalAmount ?? line.unitPrice * line.quantity;
    const taxRate = line.taxRate ? Math.round(line.taxRate * 100) : 0;
    const totalTax = line.totalTaxAmount ? toMinorUnits(line.totalTaxAmount) : 0;

    return {
      name: line.name,
      quantity: line.quantity,
      unit_price: toMinorUnits(line.unitPrice),
      total_amount: toMinorUnits(total),
      tax_rate: taxRate,
      total_tax_amount: totalTax,
      type: line.type,
      reference: line.reference,
    };
  });
};

const buildPayload = (options: CreateKlarnaSessionOptions) => {
  const orderLines = buildOrderLines(options.orderLines, options.amount, options.currency);
  const orderAmount = orderLines.reduce((sum, line) => sum + line.total_amount, 0);

  return {
    purchase_country: options.purchaseCountry,
    purchase_currency: options.currency,
    locale: normalizeKlarnaLocale(options.locale),
    order_amount: orderAmount,
    order_tax_amount: orderLines.reduce((sum, line) => sum + (line.total_tax_amount || 0), 0),
    order_lines: orderLines,
    merchant_urls: options.merchantUrls,
    customer: options.customer,
  };
};

/**
 * Erstellt eine Klarna Session über die REST API
 */
export async function createKlarnaSession(options: CreateKlarnaSessionOptions): Promise<KlarnaSession> {
  const config = getKlarnaConfig();

  if (config.username.startsWith('PLACEHOLDER') || config.password.startsWith('PLACEHOLDER')) {
    throw new Error('Klarna credentials not configured. Please set KLARNA_USERNAME and KLARNA_PASSWORD in environment variables.');
  }

  const payload = buildPayload(options);

  const response = await fetch(`${config.baseUrl}/payments/v1/sessions`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`${config.username}:${config.password}`).toString('base64'),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`[Klarna] Failed to create session (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as KlarnaSession;
  return data;
}

