/**
 * Airtel Money Payment Provider (Ostafrika, Westafrika)
 * 
 * TODO: Credentials konfigurieren
 * - AIRTEL_MONEY_CLIENT_ID: Client ID von Airtel Money
 * - AIRTEL_MONEY_CLIENT_SECRET: Client Secret von Airtel Money
 * - AIRTEL_MONEY_MERCHANT_ID: Merchant ID von Airtel Money
 * - AIRTEL_MONEY_ENVIRONMENT: 'sandbox' (Test) oder 'production' (Production)
 * - Airtel Money Developer Portal: https://developer.airtel.com/
 */

export interface AirtelMoneyConfig {
  clientId: string;
  clientSecret: string;
  merchantId: string;
  environment: 'sandbox' | 'production';
  baseUrl: string;
}

const getAirtelMoneyConfig = (): AirtelMoneyConfig => {
  const environment = (process.env.AIRTEL_MONEY_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production';
  return {
    clientId: process.env.AIRTEL_MONEY_CLIENT_ID || 'PLACEHOLDER_AIRTEL_MONEY_CLIENT_ID',
    clientSecret: process.env.AIRTEL_MONEY_CLIENT_SECRET || 'PLACEHOLDER_AIRTEL_MONEY_CLIENT_SECRET',
    merchantId: process.env.AIRTEL_MONEY_MERCHANT_ID || 'PLACEHOLDER_AIRTEL_MONEY_MERCHANT_ID',
    environment,
    baseUrl: environment === 'production'
      ? 'https://openapiuat.airtel.africa'
      : 'https://openapiuat.airtel.africa',
  };
};

export interface AirtelMoneyPayment {
  transactionId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  amount: number;
  currency: string;
  phoneNumber: string;
  message: string;
}

/**
 * Erstellt eine Airtel Money Payment Request
 */
export async function createAirtelMoneyPayment(
  amount: number,
  phoneNumber: string, // Format: 256712345678 (ohne +)
  currency: string = 'UGX', // UGX, TZS, etc.
  description?: string
): Promise<AirtelMoneyPayment> {
  const config = getAirtelMoneyConfig();
  
  if (config.clientId.startsWith('PLACEHOLDER')) {
    throw new Error('Airtel Money credentials not configured. Please set AIRTEL_MONEY_CLIENT_ID, AIRTEL_MONEY_CLIENT_SECRET, and AIRTEL_MONEY_MERCHANT_ID in environment variables.');
  }
  
  // TODO: Airtel Money SDK installieren
  // Oder REST API verwenden
  
  // Platzhalter-Implementation
  // In Production: Airtel Money SDK verwenden
  // Airtel Money verwendet meist Partner-Integrationen
  // Die genaue API-Struktur variiert je nach Land
  
  // Platzhalter Response
  return {
    transactionId: `AIRTEL_${Date.now()}`,
    status: 'PENDING',
    amount: amount,
    currency: currency,
    phoneNumber: phoneNumber,
    message: description || 'Payment request sent. Please confirm on your phone.',
  };
}

