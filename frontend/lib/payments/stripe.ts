/**
 * Stripe Payment Provider
 * 
 * Credentials:
 * - STRIPE_SECRET_KEY: sk_test_... (Test) oder sk_live_... (Production)
 * - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: pk_test_... (Test) oder pk_live_... (Production)
 * - STRIPE_WEBHOOK_SECRET: whsec_... (für Webhook-Validierung)
 */

import Stripe from 'stripe';

export interface StripeConfig {
  secretKey: string;
  publishableKey: string;
  webhookSecret?: string;
}

// Platzhalter für Credentials - wird später konfiguriert
const getStripeConfig = (): StripeConfig => {
  return {
    secretKey: process.env.STRIPE_SECRET_KEY || 'PLACEHOLDER_STRIPE_SECRET_KEY',
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'PLACEHOLDER_STRIPE_PUBLISHABLE_KEY',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'PLACEHOLDER_STRIPE_WEBHOOK_SECRET',
  };
};

// Stripe Client Instance (lazy loaded)
let stripeInstance: Stripe | null = null;

function getStripeClient(): Stripe {
  if (stripeInstance) {
    return stripeInstance;
  }
  
  const config = getStripeConfig();
  
  if (config.secretKey.startsWith('PLACEHOLDER')) {
    throw new Error('Stripe credentials not configured. Please set STRIPE_SECRET_KEY in environment variables.');
  }
  
  stripeInstance = new Stripe(config.secretKey, {
    apiVersion: '2025-10-29.clover' as any,
  });
  
  return stripeInstance;
}

export interface StripePaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'processing' | 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'canceled';
  client_secret: string;
}

/**
 * Erstellt einen Payment Intent für Stripe
 */
export async function createStripePaymentIntent(
  amount: number,
  currency: string,
  metadata?: Record<string, string>,
  customerId?: string
): Promise<StripePaymentIntent> {
  const config = getStripeConfig();
  
  if (config.secretKey.startsWith('PLACEHOLDER')) {
    throw new Error('Stripe credentials not configured. Please set STRIPE_SECRET_KEY in environment variables.');
  }
  
  const stripe = getStripeClient();
  
  try {
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: Math.round(amount * 100), // Stripe verwendet Cents
      currency: currency.toLowerCase(),
      metadata: metadata || {},
      payment_method_types: ['card'],
      // Payment Intent wird nicht automatisch bestätigt (wird durch confirmCardPayment im Frontend bestätigt)
    };
    
    if (customerId) {
      paymentIntentParams.customer = customerId;
    }
    
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);
    
    return {
      id: paymentIntent.id,
      amount: paymentIntent.amount / 100, // Zurück in Hauptwährung
      currency: paymentIntent.currency.toUpperCase(),
      status: paymentIntent.status as StripePaymentIntent['status'],
      client_secret: paymentIntent.client_secret || '',
    };
  } catch (error: any) {
    console.error('[Stripe] Error creating payment intent:', error);
    throw new Error(`Stripe payment intent creation failed: ${error.message}`);
  }
}

/**
 * Ruft einen Payment Intent ab
 */
export async function getStripePaymentIntent(paymentIntentId: string): Promise<StripePaymentIntent | null> {
  const config = getStripeConfig();
  
  if (config.secretKey.startsWith('PLACEHOLDER')) {
    throw new Error('Stripe credentials not configured.');
  }
  
  const stripe = getStripeClient();
  
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    return {
      id: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
      status: paymentIntent.status as StripePaymentIntent['status'],
      client_secret: paymentIntent.client_secret || '',
    };
  } catch (error: any) {
    console.error('[Stripe] Error retrieving payment intent:', error);
    return null;
  }
}

/**
 * Validiert Stripe Webhook Signature
 */
export function verifyStripeWebhook(
  payload: string | Buffer,
  signature: string
): Stripe.Event | null {
  const config = getStripeConfig();
  
  if (!config.webhookSecret || config.webhookSecret.startsWith('PLACEHOLDER')) {
    console.warn('Stripe webhook secret not configured');
    return null;
  }
  
  const stripe = getStripeClient();
  
  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      config.webhookSecret
    );
    return event;
  } catch (error: any) {
    console.error('[Stripe] Webhook signature verification failed:', error.message);
    return null;
  }
}

/**
 * Erstellt einen Stripe Customer
 */
export async function createStripeCustomer(
  email: string,
  name?: string,
  metadata?: Record<string, string>
): Promise<Stripe.Customer> {
  const stripe = getStripeClient();
  
  try {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: metadata || {},
    });
    
    return customer;
  } catch (error: any) {
    console.error('[Stripe] Error creating customer:', error);
    throw new Error(`Stripe customer creation failed: ${error.message}`);
  }
}

