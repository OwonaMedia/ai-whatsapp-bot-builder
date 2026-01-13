import { NextRequest, NextResponse } from 'next/server';
import { createStripePaymentIntent, createStripeCustomer } from '@/lib/payments/stripe';
import { createPayPalOrder } from '@/lib/payments/paypal';
import { createMolliePayment } from '@/lib/payments/mollie';
import { createKlarnaSession } from '@/lib/payments/klarna';
import { createMTNMobileMoneyPayment } from '@/lib/payments/mtn-mobile-money';
import {
  ensureMtnMobileMoneyConfigured,
  ensurePayPalConfigured,
  ensureStripeConfigured,
  PaymentConfigError,
} from '@/lib/payments/config-resolver';

/**
 * POST /api/payments/create
 * Erstellt eine Zahlung (Stripe oder PayPal)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, amount, currency, userId, subscriptionId, description } = body;
    
    // Validierung
    if (!provider || !amount || !currency) {
      return NextResponse.json(
        { error: 'Missing required fields: provider, amount, currency' },
        { status: 400 }
      );
    }
    
    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }
    
    // Provider-spezifische Payment-Erstellung
    switch (provider.toLowerCase()) {
      case 'stripe':
        return await createStripePayment(body);

      case 'paypal':
        return await createPayPalPayment(body);

      case 'mollie':
        return await createMolliePaymentHandler(body);

      case 'klarna':
        return await createKlarnaPayment(body);

      case 'mtn-mobile-money':
        return await createMTNMobileMoneyPaymentHandler(body);

      default:
        return NextResponse.json(
          { error: `Unsupported payment provider: ${provider}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('[Payment Create] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * Erstellt eine Stripe-Zahlung
 */
async function createStripePayment(body: any) {
  const { amount, currency, userId, subscriptionId, description, customerEmail, customerName, locale, billingCycle } = body;
  
  try {
    await ensureStripeConfigured();

    let customerId: string | undefined;
    
    // Customer erstellen oder abrufen, falls Email vorhanden
    if (customerEmail) {
      const customer = await createStripeCustomer(
        customerEmail,
        customerName,
        {
          userId: userId || '',
          subscriptionId: subscriptionId || '',
        }
      );
      customerId = customer.id;
    }
    
    // Payment Intent erstellen
    // Metadata für Webhook-Handler: userId|tier|billingCycle|customerEmail|customerName|locale
    const metadata: Record<string, string> = {
      userId: userId || '',
      subscriptionId: subscriptionId || '',
      description: description || 'WhatsApp Bot Builder Subscription',
      customerEmail: customerEmail || '',
      customerName: customerName || '',
      locale: locale || 'de',
    };
    
    // Wenn subscriptionId ein Tier ist, füge es hinzu
    if (subscriptionId && ['free', 'starter', 'professional', 'enterprise'].includes(subscriptionId)) {
      metadata.tier = subscriptionId;
      metadata.billingCycle = billingCycle || 'monthly';
    }
    
    const paymentIntent = await createStripePaymentIntent(
      amount,
      currency,
      metadata,
      customerId
    );
    
    console.log('[Stripe Payment Create] Intent created', {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
    });
    
    return NextResponse.json({
      success: true,
      provider: 'stripe',
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
    });
  } catch (error: any) {
    if (error instanceof PaymentConfigError) {
      console.warn('[Stripe Payment Create] Config error:', error.message);
      return NextResponse.json(
        {
          error: error.message,
          provider: error.provider,
          code: error.code,
        },
        { status: 503 },
      );
    }
    console.error('[Stripe Payment Create] Error:', error);
    throw error;
  }
}

async function createMTNMobileMoneyPaymentHandler(body: any) {
  const {
    amount,
    currency,
    phoneNumber,
    description,
  } = body;

  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return NextResponse.json(
      { error: 'MTN Mobile Money requires phoneNumber (MSISDN) in international format without leading +' },
      { status: 400 },
    );
  }

  try {
    await ensureMtnMobileMoneyConfigured();

    const payment = await createMTNMobileMoneyPayment(
      amount,
      phoneNumber,
      currency,
      description,
    );

    return NextResponse.json({
      success: true,
      provider: 'mtn-mobile-money',
      referenceId: payment.referenceId,
      externalId: payment.externalId,
      amount: parseFloat(payment.amount),
      currency: payment.currency,
      status: payment.status,
      payer: payment.payer,
    });
  } catch (error: any) {
    if (error instanceof PaymentConfigError) {
      console.warn('[MTN Mobile Money Create] Config error:', error.message);
      return NextResponse.json(
        {
          error: error.message,
          provider: error.provider,
          code: error.code,
        },
        { status: 503 },
      );
    }
    console.error('[MTN Mobile Money Create] Error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate MTN Mobile Money payment', message: error.message },
      { status: 500 },
    );
  }
}

/**
 * Erstellt eine PayPal-Zahlung
 */
async function createPayPalPayment(body: any) {
  const { 
    amount, 
    currency, 
    userId, 
    subscriptionId, 
    description, 
    returnUrl, 
    cancelUrl,
    customerEmail,
    customerName,
    locale,
    billingCycle 
  } = body;
  
  try {
    await ensurePayPalConfigured();

    // PayPal Order erstellen
    // Custom ID für Webhook-Handler: userId|tier|billingCycle|locale|customerEmail|customerName
    const billingCycleValue = billingCycle || 'monthly';
    const customId = userId && subscriptionId 
      ? `${userId}|${subscriptionId}|${billingCycleValue}|${locale || 'de'}|${customerEmail || ''}|${customerName || ''}`
      : userId || '';
    
    // Return-URL und Cancel-URL mit locale
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://whatsapp.owona.de';
    // PayPal ersetzt {CHECKOUT_SESSION_ID} NICHT automatisch - wir verwenden token stattdessen
    const finalReturnUrl = `${appUrl}/${locale || 'de'}/checkout/paypal/success`;
    const finalCancelUrl = `${appUrl}/${locale || 'de'}/checkout?tier=${subscriptionId || 'starter'}`;
    
    const order = await createPayPalOrder(
      amount,
      currency,
      description || `WhatsApp Bot Builder - ${subscriptionId || 'Subscription'} Plan (${billingCycleValue})`,
      finalReturnUrl,
      finalCancelUrl,
      customId,
      `invoice-${userId}-${Date.now()}` // Invoice ID für bessere Nachverfolgbarkeit
    );
    
    // Approve-URL finden
    const approveUrl = order.links.find(link => link.rel === 'approve')?.href;
    
    if (!approveUrl) {
      throw new Error('PayPal approve URL not found in order response');
    }
    
    return NextResponse.json({
      success: true,
      provider: 'paypal',
      orderId: order.id,
      approveUrl,
      amount,
      currency,
      status: order.status,
    });
  } catch (error: any) {
    if (error instanceof PaymentConfigError) {
      console.warn('[PayPal Payment Create] Config error:', error.message);
      return NextResponse.json(
        {
          error: error.message,
          provider: error.provider,
          code: error.code,
        },
        { status: 503 },
      );
    }
    console.error('[PayPal Payment Create] Error:', error);
    throw error;
  }
}

async function createMolliePaymentHandler(body: any) {
  const {
    amount,
    currency,
    method,
    description,
    locale,
    redirectUrl,
    webhookUrl,
    metadata,
  } = body;

  if (!method) {
    return NextResponse.json(
      { error: 'Mollie payment method is required (e.g. ideal, bancontact, giropay)' },
      { status: 400 }
    );
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://whatsapp.owona.de';
    const finalRedirectUrl = redirectUrl || `${appUrl}/${locale || 'de'}/checkout/success?provider=mollie`;

    const payment = await createMolliePayment({
      amount,
      currency,
      method,
      redirectUrl: finalRedirectUrl,
      description,
      locale,
      metadata,
      webhookUrl,
    });

    return NextResponse.json({
      success: true,
      provider: 'mollie',
      paymentId: payment.id,
      checkoutUrl: payment.checkoutUrl,
      status: payment.status,
      amount: parseFloat(payment.amount.value),
      currency: payment.amount.currency,
    });
  } catch (error: any) {
    console.error('[Mollie Payment Create] Error:', error);
    throw error;
  }
}

async function createKlarnaPayment(body: any) {
  const {
    amount,
    currency,
    purchaseCountry,
    locale,
    orderLines,
    merchantUrls,
    customer,
    description,
    returnUrl,
    cancelUrl,
  } = body;

  if (!purchaseCountry) {
    return NextResponse.json(
      { error: 'Klarna requires purchaseCountry (e.g. DE, SE, US)' },
      { status: 400 }
    );
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://whatsapp.owona.de';
    const normalizedLocale = locale || 'de-DE';

    const session = await createKlarnaSession({
      amount,
      currency,
      purchaseCountry,
      locale: normalizedLocale,
      orderLines: orderLines || [
        {
          name: description || 'Subscription',
          quantity: 1,
          unitPrice: amount,
        },
      ],
      merchantUrls: {
        success: merchantUrls?.success || returnUrl || `${appUrl}/${locale || 'de'}/checkout/success?provider=klarna`,
        cancel: merchantUrls?.cancel || cancelUrl || `${appUrl}/${locale || 'de'}/checkout?provider=klarna&status=cancelled`,
        failure: merchantUrls?.failure || `${appUrl}/${locale || 'de'}/checkout?provider=klarna&status=failure`,
        pending: merchantUrls?.pending,
        terms: merchantUrls?.terms,
        checkout: merchantUrls?.checkout,
      },
      customer,
    });

    return NextResponse.json({
      success: true,
      provider: 'klarna',
      sessionId: session.session_id,
      clientToken: session.client_token,
      paymentMethodCategories: session.payment_method_categories,
      amount,
      currency,
      status: 'session_created',
    });
  } catch (error: any) {
    console.error('[Klarna Payment Create] Error:', error);
    throw error;
  }
}

