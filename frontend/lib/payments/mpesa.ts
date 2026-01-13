/**
 * M-Pesa Payment Provider (Ostafrika: Kenia, Tansania, etc.)
 * 
 * TODO: Credentials konfigurieren
 * - MPESA_CONSUMER_KEY: Consumer Key von Safaricom Developer Portal
 * - MPESA_CONSUMER_SECRET: Consumer Secret von Safaricom Developer Portal
 * - MPESA_SHORTCODE: Business Shortcode (z.B. 174379)
 * - MPESA_PASSKEY: Passkey von Safaricom Developer Portal
 * - MPESA_ENVIRONMENT: 'sandbox' (Test) oder 'production' (Production)
 * - Safaricom Developer Portal: https://developer.safaricom.co.ke/
 */

export interface MPesaConfig {
  consumerKey: string;
  consumerSecret: string;
  shortcode: string;
  passkey: string;
  environment: 'sandbox' | 'production';
  baseUrl: string;
}

const getMPesaConfig = (): MPesaConfig => {
  const environment = (process.env.MPESA_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production';
  return {
    consumerKey: process.env.MPESA_CONSUMER_KEY || 'PLACEHOLDER_MPESA_CONSUMER_KEY',
    consumerSecret: process.env.MPESA_CONSUMER_SECRET || 'PLACEHOLDER_MPESA_CONSUMER_SECRET',
    shortcode: process.env.MPESA_SHORTCODE || 'PLACEHOLDER_MPESA_SHORTCODE',
    passkey: process.env.MPESA_PASSKEY || 'PLACEHOLDER_MPESA_PASSKEY',
    environment,
    baseUrl: environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke',
  };
};

export interface MPesaPayment {
  ResponseCode: string;
  ResponseDescription: string;
  MerchantRequestID: string;
  CheckoutRequestID: string;
  CustomerMessage: string;
}

/**
 * Erstellt eine M-Pesa STK Push Payment Request
 */
export async function createMPesaPayment(
  amount: number,
  phoneNumber: string, // Format: 254712345678 (ohne +)
  description?: string
): Promise<MPesaPayment> {
  const config = getMPesaConfig();
  
  if (config.consumerKey.startsWith('PLACEHOLDER')) {
    throw new Error('M-Pesa credentials not configured. Please set MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, and MPESA_PASSKEY in environment variables.');
  }
  
  // TODO: M-Pesa SDK installieren: npm install mpesa-api
  // Oder REST API verwenden
  
  // Platzhalter-Implementation
  // In Production: M-Pesa SDK verwenden
  // 1. Authenticate (OAuth Token)
  // const authResponse = await fetch(`${config.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
  //   method: 'GET',
  //   headers: {
  //     'Authorization': 'Basic ' + Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64'),
  //   },
  // });
  // const { access_token } = await authResponse.json();
  
  // 2. STK Push
  // const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
  // const password = Buffer.from(`${config.shortcode}${config.passkey}${timestamp}`).toString('base64');
  // const stkPushResponse = await fetch(`${config.baseUrl}/mpesa/stkpush/v1/processrequest`, {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${access_token}`,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     BusinessShortCode: config.shortcode,
  //     Password: password,
  //     Timestamp: timestamp,
  //     TransactionType: 'CustomerPayBillOnline',
  //     Amount: Math.round(amount),
  //     PartyA: phoneNumber,
  //     PartyB: config.shortcode,
  //     PhoneNumber: phoneNumber,
  //     CallBackURL: 'https://your-site.com/api/payments/mpesa/callback',
  //     AccountReference: description || 'Payment',
  //     TransactionDesc: description || 'Payment',
  //   }),
  // });
  
  // Platzhalter Response
  return {
    ResponseCode: '0',
    ResponseDescription: 'Success. Request accepted for processing',
    MerchantRequestID: `MPESA_${Date.now()}`,
    CheckoutRequestID: `MPESA_CHECKOUT_${Date.now()}`,
    CustomerMessage: 'Please enter your M-Pesa PIN to complete the payment',
  };
}

/**
 * Prüft M-Pesa Payment Status
 */
export async function checkMPesaPaymentStatus(checkoutRequestID: string): Promise<{
  ResponseCode: string;
  ResponseDescription: string;
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResultCode: string;
  ResultDesc: string;
}> {
  const config = getMPesaConfig();
  
  if (config.consumerKey.startsWith('PLACEHOLDER')) {
    throw new Error('M-Pesa credentials not configured.');
  }
  
  // TODO: Implementierung mit M-Pesa SDK
  // const authResponse = await fetch(`${config.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
  //   method: 'GET',
  //   headers: {
  //     'Authorization': 'Basic ' + Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64'),
  //   },
  // });
  // const { access_token } = await authResponse.json();
  
  // const queryResponse = await fetch(`${config.baseUrl}/mpesa/stkpushquery/v1/query`, {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${access_token}`,
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     BusinessShortCode: config.shortcode,
  //     Password: password,
  //     Timestamp: timestamp,
  //     CheckoutRequestID: checkoutRequestID,
  //   }),
  // });
  
  // Platzhalter Response
  return {
    ResponseCode: '0',
    ResponseDescription: 'The service request is processed successfully',
    MerchantRequestID: `MPESA_${Date.now()}`,
    CheckoutRequestID: checkoutRequestID,
    ResultCode: '0',
    ResultDesc: 'The transaction was successful',
  };
}

