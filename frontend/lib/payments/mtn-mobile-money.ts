/**
 * MTN Mobile Money Zahlungsintegration (Collections API)
 *
 * Dokumentation: https://momodeveloper.mtn.com/api-documentation/api-description
 * Schritte: API User -> API Key -> Access Token -> RequestToPay -> Status-Abfrage
 */

import { randomUUID } from 'crypto';

export interface MTNMobileMoneyConfig {
  apiKey: string;
  userId: string;
  primaryKey: string;
  secondaryKey?: string;
  environment: 'sandbox' | 'production';
  baseUrl: string;
  targetEnvironment: string;
  callbackUrl?: string;
}

const getMTNMobileMoneyConfig = (): MTNMobileMoneyConfig => {
  const environment = (process.env.MTN_ENVIRONMENT || 'sandbox') as
    | 'sandbox'
    | 'production';
  const baseUrl =
    environment === 'production'
      ? 'https://api.momodeveloper.mtn.com'
      : 'https://sandbox.momodeveloper.mtn.com';

  return {
    apiKey: process.env.MTN_API_KEY || 'PLACEHOLDER_MTN_API_KEY',
    userId: process.env.MTN_USER_ID || 'PLACEHOLDER_MTN_USER_ID',
    primaryKey: process.env.MTN_PRIMARY_KEY || 'PLACEHOLDER_MTN_PRIMARY_KEY',
    secondaryKey: process.env.MTN_SECONDARY_KEY,
    environment,
    baseUrl,
    targetEnvironment:
      environment === 'sandbox'
        ? 'sandbox'
        : process.env.MTN_TARGET_ENV || 'mtnghana',
    callbackUrl: process.env.MTN_CALLBACK_URL,
  };
};

const assertConfig = (config: MTNMobileMoneyConfig) => {
  if (
    config.apiKey.startsWith('PLACEHOLDER') ||
    config.userId.startsWith('PLACEHOLDER') ||
    config.primaryKey.startsWith('PLACEHOLDER')
  ) {
    throw new Error(
      'MTN Mobile Money credentials not configured. Please set MTN_API_KEY, MTN_USER_ID, and MTN_PRIMARY_KEY in environment variables.',
    );
  }
};

interface AccessTokenCache {
  token: string;
  expiresAt: number;
}

let accessTokenCache: AccessTokenCache | null = null;
const TOKEN_EXPIRY_BUFFER_MS = 60 * 1000;

async function getAccessToken(config: MTNMobileMoneyConfig): Promise<string> {
  if (
    accessTokenCache &&
    accessTokenCache.expiresAt > Date.now() + TOKEN_EXPIRY_BUFFER_MS
  ) {
    return accessTokenCache.token;
  }

  const basicAuth = Buffer.from(`${config.userId}:${config.apiKey}`).toString(
    'base64',
  );

  const response = await fetch(`${config.baseUrl}/collection/token/`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Ocp-Apim-Subscription-Key': config.primaryKey,
      'Content-Length': '0',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `[MTN] Failed to obtain access token (${response.status} ${response.statusText}): ${errorText}`,
    );
  }

  const data = (await response.json()) as {
    access_token: string;
    token_type: string;
    expires_in: number;
  };

  accessTokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return data.access_token;
}

export interface MTNMobileMoneyPayment {
  referenceId: string;
  financialTransactionId?: string;
  externalId: string;
  amount: string;
  currency: string;
  payer: {
    partyIdType: 'MSISDN';
    partyId: string;
  };
  payerMessage: string;
  payeeNote: string;
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
  reason?: string;
  errorCode?: string;
}

const normalizePhoneNumber = (phoneNumber: string): string =>
  phoneNumber.replace(/^\+/, '').replace(/[^\d]/g, '');

/**
 * Erstellt einen RequestToPay bei MTN Mobile Money.
 */
export async function createMTNMobileMoneyPayment(
  amount: number,
  phoneNumber: string,
  currency: string = 'GHS',
  description?: string,
): Promise<MTNMobileMoneyPayment> {
  const config = getMTNMobileMoneyConfig();
  assertConfig(config);

  const accessToken = await getAccessToken(config);
  const referenceId = randomUUID();
  const externalId = `MTN_${Date.now()}`;
  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  const payload = {
    amount: amount.toFixed(2),
    currency: currency.toUpperCase(),
    externalId,
    payer: {
      partyIdType: 'MSISDN' as const,
      partyId: normalizedPhone,
    },
    payerMessage: description || 'Payment',
    payeeNote: description || 'Payment',
  };

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'X-Reference-Id': referenceId,
    'X-Target-Environment': config.targetEnvironment,
    'Ocp-Apim-Subscription-Key': config.primaryKey,
    'Content-Type': 'application/json',
  };

  if (config.callbackUrl) {
    headers['X-Callback-Url'] = config.callbackUrl;
  }

  const response = await fetch(`${config.baseUrl}/collection/v1_0/requesttopay`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  if (response.status !== 202) {
    const errorText = await response.text();
    throw new Error(
      `[MTN] RequestToPay failed (${response.status} ${response.statusText}): ${errorText}`,
    );
  }

  return {
    referenceId,
    externalId,
    amount: payload.amount,
    currency: payload.currency,
    payer: payload.payer,
    payerMessage: payload.payerMessage,
    payeeNote: payload.payeeNote,
    status: 'PENDING',
  };
}

/**
 * Prüft den Status eines RequestToPay Vorgangs.
 */
export async function checkMTNMobileMoneyPaymentStatus(
  referenceId: string,
): Promise<MTNMobileMoneyPayment> {
  const config = getMTNMobileMoneyConfig();
  assertConfig(config);

  const accessToken = await getAccessToken(config);

  const response = await fetch(
    `${config.baseUrl}/collection/v1_0/requesttopay/${referenceId}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-Target-Environment': config.targetEnvironment,
        'Ocp-Apim-Subscription-Key': config.primaryKey,
      },
    },
  );

  if (response.status === 404) {
    throw new Error(`[MTN] RequestToPay reference not found: ${referenceId}`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `[MTN] Failed to retrieve RequestToPay status (${response.status} ${response.statusText}): ${errorText}`,
    );
  }

  const data = (await response.json()) as {
    amount: string;
    currency: string;
    financialTransactionId?: string;
    externalId: string;
    payer: {
      partyIdType: 'MSISDN';
      partyId: string;
    };
    payerMessage: string;
    payeeNote: string;
    status: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
    reason?: string;
    errorCode?: string;
  };

  return {
    referenceId,
    financialTransactionId: data.financialTransactionId,
    externalId: data.externalId,
    amount: data.amount,
    currency: data.currency,
    payer: data.payer,
    payerMessage: data.payerMessage,
    payeeNote: data.payeeNote,
    status: data.status,
    reason: data.reason,
    errorCode: data.errorCode,
  };
}

/**
 * Cache zurücksetzen (z. B. nach Credential-Update).
 */
export function resetMTNAccessTokenCache(): void {
  accessTokenCache = null;
}

