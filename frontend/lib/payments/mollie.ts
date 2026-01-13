import createMollieClient, { Payment as MolliePaymentResponse, PaymentStatus as MolliePaymentStatus } from '@mollie/api-client';

/**
 * Mollie Payment Provider (Europa: iDEAL, Bancontact, Giropay, etc.)
 *
 * Environment Variables:
 *  - MOLLIE_API_KEY: test_... (Test) oder live_... (Production)
 *  - Optional: MOLLIE_WEBHOOK_URL falls von Mollie aus aufrufbar
 */

export interface MollieConfig {
  apiKey: string;
  webhookUrl?: string;
}

const getMollieConfig = (): MollieConfig => {
  const apiKey = process.env.MOLLIE_API_KEY || 'PLACEHOLDER_MOLLIE_API_KEY';

  return {
    apiKey,
    webhookUrl: process.env.MOLLIE_WEBHOOK_URL,
  };
};

export type MolliePaymentMethod = 'ideal' | 'bancontact' | 'giropay' | 'sofort' | 'creditcard';

export interface CreateMolliePaymentOptions {
  amount: number;
  currency: string;
  method: MolliePaymentMethod;
  redirectUrl: string;
  description?: string;
  locale?: string;
  metadata?: Record<string, string>;
  webhookUrl?: string;
}

export interface MolliePaymentResult {
  id: string;
  status: MolliePaymentStatus;
  method: MolliePaymentMethod | string | null;
  amount: {
    value: string;
    currency: string;
  };
  checkoutUrl: string | null;
  raw: MolliePaymentResponse;
}

const formatAmount = (amount: number): string => amount.toFixed(2);

const normalizeLocale = (locale?: string): string | undefined => {
  if (!locale) return undefined;

  const map: Record<string, string> = {
    de: 'de_DE',
    en: 'en_US',
    fr: 'fr_FR',
    nl: 'nl_NL',
    be: 'nl_BE',
    es: 'es_ES',
    it: 'it_IT',
  };

  // Bereits vollständiges Locale?
  if (locale.includes('_')) {
    return locale;
  }

  return map[locale] || undefined;
};

let cachedClient: ReturnType<typeof createMollieClient> | null = null;

const getMollieClient = () => {
  const { apiKey } = getMollieConfig();

  if (apiKey.startsWith('PLACEHOLDER')) {
    throw new Error('Mollie credentials not configured. Please set MOLLIE_API_KEY in environment variables.');
  }

  if (!cachedClient) {
    cachedClient = createMollieClient({ apiKey });
  }

  return cachedClient;
};

/**
 * Erstellt eine Mollie Payment und gibt Checkout-URL zurück
 */
export async function createMolliePayment(options: CreateMolliePaymentOptions): Promise<MolliePaymentResult> {
  const client = getMollieClient();
  const config = getMollieConfig();

  const {
    amount,
    currency,
    method,
    redirectUrl,
    description,
    locale,
    metadata,
    webhookUrl,
  } = options;

  const payment = await client.payments.create({
    amount: {
      currency,
      value: formatAmount(amount),
    },
    method: method as any,
    description: description || 'Payment',
    redirectUrl,
    webhookUrl: webhookUrl || config.webhookUrl,
    locale: normalizeLocale(locale) as any,
    metadata,
  });

  return {
    id: payment.id,
    status: payment.status,
    method: payment.method || null,
    amount: payment.amount,
    checkoutUrl: payment._links.checkout?.href ?? null,
    raw: payment,
  };
}

/**
 * Ruft eine Mollie Payment ab
 */
export async function getMolliePayment(paymentId: string): Promise<MolliePaymentResponse> {
  const client = getMollieClient();
  return client.payments.get(paymentId);
}

