/**
 * Orange Money Payment Provider (Westafrika, Zentralafrika)
 * 
 * TODO: Credentials konfigurieren
 * - ORANGE_MONEY_MERCHANT_ID: Merchant ID von Orange Money
 * - ORANGE_MONEY_API_KEY: API Key von Orange Money
 * - ORANGE_MONEY_API_SECRET: API Secret von Orange Money
 * - ORANGE_MONEY_ENVIRONMENT: 'sandbox' (Test) oder 'production' (Production)
 * - Orange Money Developer Portal: https://developer.orange.com/
 */

export interface OrangeMoneyConfig {
  merchantId: string;
  apiKey: string;
  apiSecret: string;
  environment: 'sandbox' | 'production';
  baseUrl: string;
}

const getOrangeMoneyConfig = (): OrangeMoneyConfig => {
  const environment = (process.env.ORANGE_MONEY_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production';
  return {
    merchantId: process.env.ORANGE_MONEY_MERCHANT_ID || 'PLACEHOLDER_ORANGE_MONEY_MERCHANT_ID',
    apiKey: process.env.ORANGE_MONEY_API_KEY || 'PLACEHOLDER_ORANGE_MONEY_API_KEY',
    apiSecret: process.env.ORANGE_MONEY_API_SECRET || 'PLACEHOLDER_ORANGE_MONEY_API_SECRET',
    environment,
    baseUrl: environment === 'production'
      ? 'https://api.orange.com'
      : 'https://api.orange.com',
  };
};

export interface OrangeMoneyPayment {
  transactionId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  amount: number;
  currency: string;
  phoneNumber: string;
  message: string;
}

/**
 * Erstellt eine Orange Money Payment Request
 */
export async function createOrangeMoneyPayment(
  amount: number,
  phoneNumber: string, // Format: 221771234567 (ohne +)
  currency: string = 'XOF', // XOF, XAF, etc.
  description?: string
): Promise<OrangeMoneyPayment> {
  const config = getOrangeMoneyConfig();
  
  if (config.apiKey.startsWith('PLACEHOLDER')) {
    throw new Error('Orange Money credentials not configured. Please set ORANGE_MONEY_MERCHANT_ID, ORANGE_MONEY_API_KEY, and ORANGE_MONEY_API_SECRET in environment variables.');
  }
  
  // TODO: Orange Money SDK installieren
  // Oder REST API verwenden
  
  // Platzhalter-Implementation
  // In Production: Orange Money SDK verwenden
  // Orange Money verwendet meist Partner-Integrationen
  // Die genaue API-Struktur variiert je nach Land
  
  // Platzhalter Response
  return {
    transactionId: `ORANGE_${Date.now()}`,
    status: 'PENDING',
    amount: amount,
    currency: currency,
    phoneNumber: phoneNumber,
    message: description || 'Payment request sent. Please confirm on your phone.',
  };
}

