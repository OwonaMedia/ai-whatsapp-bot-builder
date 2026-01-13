import { getLogger } from '@/lib/logging/logger';

import {
  loadPaymentProviderConfig,
  patchProcessEnv,
} from './provider-config';

const logger = getLogger();

const REQUIRED_FIELDS: Record<string, string[]> = {
  stripe: ['secret_key', 'publishable_key'],
  paypal: ['client_id', 'client_secret'],
  'mtn-mobile-money': ['api_key', 'user_id', 'primary_key'],
};

type ResolveOptions = {
  allowInactive?: boolean;
};

export class PaymentConfigError extends Error {
  code: 'missing' | 'inactive' | 'invalid';
  provider: string;

  constructor(
    provider: string,
    code: 'missing' | 'inactive' | 'invalid',
    message: string,
  ) {
    super(message);
    this.name = 'PaymentConfigError';
    this.code = code;
    this.provider = provider;
  }
}

function normalizeConfigShape(
  provider: string,
  config: Record<string, any>,
): Record<string, string> {
  switch (provider) {
    case 'stripe':
      return {
        STRIPE_SECRET_KEY: config.secret_key ?? config.secretKey,
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
          config.publishable_key ?? config.publishableKey,
        STRIPE_WEBHOOK_SECRET: config.webhook_secret ?? config.webhookSecret,
      };
    case 'paypal':
      return {
        PAYPAL_CLIENT_ID: config.client_id ?? config.clientId,
        PAYPAL_CLIENT_SECRET: config.client_secret ?? config.clientSecret,
        PAYPAL_MODE: config.mode ?? config.environment ?? 'sandbox',
      };
    case 'mtn-mobile-money':
      return {
        MTN_API_KEY: config.api_key ?? config.apiKey,
        MTN_USER_ID: config.user_id ?? config.userId,
        MTN_PRIMARY_KEY: config.primary_key ?? config.primaryKey,
        MTN_SECONDARY_KEY: config.secondary_key ?? config.secondaryKey,
        MTN_ENVIRONMENT: config.environment ?? config.mtn_environment,
        MTN_TARGET_ENV: config.target_environment ?? config.targetEnvironment,
        MTN_CALLBACK_URL: config.callback_url ?? config.callbackUrl,
      };
    default:
      return {};
  }
}

function ensureRequired(
  provider: string,
  envMap: Record<string, string | undefined>,
): asserts envMap is Record<string, string> {
  const required = REQUIRED_FIELDS[provider];
  if (!required || required.length === 0) {
    return;
  }

  const missing = required.filter((field) => {
    const normalizedField = field.toLowerCase().replace(/_/g, '');
    const envKey = Object.entries(envMap).find(([key]) => {
      const normalizedKey = key.toLowerCase().replace(/_/g, '');
      return normalizedKey.includes(normalizedField);
    });
    if (!envKey) {
      return true;
    }
    const [, value] = envKey;
    return typeof value !== 'string' || value.trim().length === 0;
  });

  if (missing.length > 0) {
    throw new Error(
      `Zahlungsanbieter "${provider}": Fehlende Pflichtfelder in der Konfiguration (${missing.join(
        ', ',
      )}).`,
    );
  }
}

async function resolveProviderEnv(
  provider: 'stripe' | 'paypal' | 'mtn-mobile-money',
  { allowInactive = false }: ResolveOptions = {},
): Promise<void> {
  const alreadyConfigured = (() => {
    switch (provider) {
      case 'stripe':
        return (
          typeof process.env.STRIPE_SECRET_KEY === 'string' &&
          process.env.STRIPE_SECRET_KEY.trim().length > 0 &&
          !process.env.STRIPE_SECRET_KEY.includes('PLACEHOLDER') &&
          typeof process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY === 'string' &&
          process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.trim().length > 0 &&
          !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.includes('PLACEHOLDER')
        );
      case 'paypal':
        return (
          typeof process.env.PAYPAL_CLIENT_ID === 'string' &&
          process.env.PAYPAL_CLIENT_ID.trim().length > 0 &&
          !process.env.PAYPAL_CLIENT_ID.includes('PLACEHOLDER') &&
          typeof process.env.PAYPAL_CLIENT_SECRET === 'string' &&
          process.env.PAYPAL_CLIENT_SECRET.trim().length > 0 &&
          !process.env.PAYPAL_CLIENT_SECRET.includes('PLACEHOLDER')
        );
      case 'mtn-mobile-money':
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
      default:
        return false;
    }
  })();

  if (alreadyConfigured) {
    return;
  }

  const record = await loadPaymentProviderConfig(provider, {
    requireActive: !allowInactive,
  });

  if (!record || !record.config) {
    throw new PaymentConfigError(
      provider,
      'missing',
      `Zahlungsanbieter "${provider}" ist nicht konfiguriert. Bitte Credentials im Admin-Bereich oder der Datenbank hinterlegen.`,
    );
  }

  if (!allowInactive && record.status !== 'active') {
    throw new PaymentConfigError(
      provider,
      'inactive',
      `Zahlungsanbieter "${provider}" ist aktuell deaktiviert (Status: ${record.status}).`,
    );
  }

  const envMap = normalizeConfigShape(provider, record.config);
  try {
    ensureRequired(provider, envMap);
  } catch (error: any) {
    throw new PaymentConfigError(
      provider,
      'invalid',
      error?.message || `Zahlungsanbieter "${provider}": Ungültige Konfiguration.`,
    );
  }
  patchProcessEnv(envMap);

  logger.info(
    { provider, environment: record.environment, status: record.status },
    '[Payment Config Resolver] Provider-Umgebungsvariablen gesetzt.',
  );
}

export async function ensureStripeConfigured(options?: ResolveOptions) {
  await resolveProviderEnv('stripe', options);
}

export async function ensurePayPalConfigured(options?: ResolveOptions) {
  await resolveProviderEnv('paypal', options);
}

export async function ensureMtnMobileMoneyConfigured(options?: ResolveOptions) {
  await resolveProviderEnv('mtn-mobile-money', options);
}

