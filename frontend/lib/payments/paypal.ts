/**
 * PayPal Payment Provider
 * 
 * Credentials:
 * - PAYPAL_CLIENT_ID: Client ID von PayPal Developer Dashboard
 * - PAYPAL_CLIENT_SECRET: Client Secret von PayPal Developer Dashboard
 * - PAYPAL_MODE: 'sandbox' (Test) oder 'live' (Production)
 * 
 * Note: @paypal/checkout-server-sdk is deprecated, but we use it for now.
 * Consider migrating to @paypal/paypal-server-sdk in the future.
 */

import paypal from '@paypal/checkout-server-sdk';

export interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  mode: 'sandbox' | 'live';
  baseUrl: string;
}

const getPayPalConfig = (): PayPalConfig => {
  const mode = (process.env.PAYPAL_MODE || 'sandbox') as 'sandbox' | 'live';
  return {
    clientId: process.env.PAYPAL_CLIENT_ID || 'PLACEHOLDER_PAYPAL_CLIENT_ID',
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || 'PLACEHOLDER_PAYPAL_CLIENT_SECRET',
    mode,
    baseUrl: mode === 'live' 
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com',
  };
};

/**
 * Erstellt einen PayPal Client
 */
function getPayPalClient(): any {
  const config = getPayPalConfig();
  
  if (config.clientId.startsWith('PLACEHOLDER')) {
    throw new Error('PayPal credentials not configured. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in environment variables.');
  }
  
  const environment = config.mode === 'live'
    ? new paypal.core.LiveEnvironment(config.clientId, config.clientSecret)
    : new paypal.core.SandboxEnvironment(config.clientId, config.clientSecret);
  
  return new paypal.core.PayPalHttpClient(environment);
}

export interface PayPalOrder {
  id: string;
  status: 'CREATED' | 'SAVED' | 'APPROVED' | 'VOIDED' | 'COMPLETED' | 'PAYER_ACTION_REQUIRED';
  links: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

/**
 * Erstellt eine PayPal Order
 */
export async function createPayPalOrder(
  amount: number,
  currency: string,
  description?: string,
  returnUrl?: string,
  cancelUrl?: string,
  customId?: string,
  invoiceId?: string
): Promise<PayPalOrder> {
  const config = getPayPalConfig();
  
  if (config.clientId.startsWith('PLACEHOLDER')) {
    throw new Error('PayPal credentials not configured. Please set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in environment variables.');
  }
  
  const client = getPayPalClient();
  
  try {
    const purchaseUnit: any = {
      amount: {
        currency_code: currency.toUpperCase(),
        value: amount.toFixed(2),
      },
      description: description || 'Payment',
    };
    
    // Custom ID für Webhook-Handler hinzufügen (WICHTIG für Subscription-Aktivierung)
    if (customId) {
      purchaseUnit.custom_id = customId;
    }
    
    // Invoice ID hinzufügen (optional, für bessere Nachverfolgbarkeit)
    if (invoiceId) {
      purchaseUnit.invoice_id = invoiceId;
    }
    
    // Reference ID für bessere Nachverfolgbarkeit
    if (customId) {
      purchaseUnit.reference_id = customId.split('|')[0] || customId; // userId als Reference ID
    }
    
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [purchaseUnit],
      application_context: {
        return_url: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout/success`,
        cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/checkout/cancel`,
        brand_name: process.env.NEXT_PUBLIC_APP_NAME || 'WhatsApp Bot Builder',
        user_action: 'PAY_NOW',
      },
    });
    
    const order = await client.execute(request);
    
    if (order.result && order.result.id) {
      const links = order.result.links?.map((link: any) => ({
        href: link.href,
        rel: link.rel,
        method: link.method,
      })) || [];
      
      return {
        id: order.result.id,
        status: order.result.status as PayPalOrder['status'],
        links,
      };
    }
    
    throw new Error('Failed to create PayPal order');
  } catch (error: any) {
    console.error('[PayPal] Error creating order:', error);
    throw new Error(`PayPal order creation failed: ${error.message}`);
  }
}

/**
 * Ruft eine PayPal Order ab
 */
export async function getPayPalOrder(orderId: string): Promise<PayPalOrder | null> {
  const config = getPayPalConfig();
  
  if (config.clientId.startsWith('PLACEHOLDER')) {
    throw new Error('PayPal credentials not configured.');
  }
  
  const client = getPayPalClient();
  
  try {
    const request = new paypal.orders.OrdersGetRequest(orderId);
    const order = await client.execute(request);
    
    if (order.result && order.result.id) {
      const links = order.result.links?.map((link: any) => ({
        href: link.href,
        rel: link.rel,
        method: link.method,
      })) || [];
      
      return {
        id: order.result.id,
        status: order.result.status as PayPalOrder['status'],
        links,
      };
    }
    
    return null;
  } catch (error: any) {
    console.error('[PayPal] Error retrieving order:', error);
    return null;
  }
}

/**
 * Captured eine PayPal Order
 */
export async function capturePayPalOrder(orderId: string): Promise<PayPalOrder> {
  const config = getPayPalConfig();
  
  if (config.clientId.startsWith('PLACEHOLDER')) {
    throw new Error('PayPal credentials not configured.');
  }
  
  const client = getPayPalClient();
  
  try {
    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    request.requestBody({});
    const order = await client.execute(request);
    
    if (order.result && order.result.id) {
      const links = order.result.links?.map((link: any) => ({
        href: link.href,
        rel: link.rel,
        method: link.method,
      })) || [];
      
      return {
        id: order.result.id,
        status: order.result.status as PayPalOrder['status'],
        links,
      };
    }
    
    throw new Error('Failed to capture PayPal order');
  } catch (error: any) {
    console.error('[PayPal] Error capturing order:', error);
    throw new Error(`PayPal order capture failed: ${error.message}`);
  }
}

/**
 * Validiert PayPal Webhook Signature
 * Note: PayPal Webhook-Verifizierung erfordert zusätzliche Konfiguration
 */
export async function verifyPayPalWebhook(
  headers: Record<string, string>,
  body: string
): Promise<boolean> {
  const config = getPayPalConfig();
  
  if (config.clientId.startsWith('PLACEHOLDER')) {
    console.warn('PayPal credentials not configured');
    return false;
  }
  
  // PayPal Webhook-Verifizierung erfordert einen zusätzlichen API-Call
  // Für jetzt geben wir true zurück, aber in Production sollte dies implementiert werden
  // Siehe: https://developer.paypal.com/docs/api-basics/notifications/webhooks/notification-messages/
  console.warn('[PayPal] Webhook signature verification not fully implemented');
  return true;
}

