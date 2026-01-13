import { context, trace as otTrace } from '@opentelemetry/api';
import type { Logger } from 'pino';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

import { createRequestLogger } from '@/lib/logging/logger';
import { logAuditEvent, logWebhookEvent, logWorkflowEvent } from '@/lib/monitoring/events';
import {
  activateSubscription,
  deactivateSubscription,
  logPayment,
} from '@/lib/payments/subscription-activation';
import { verifyStripeWebhook } from '@/lib/payments/stripe';
import {
  ensureStripeConfigured,
  PaymentConfigError,
} from '@/lib/payments/config-resolver';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

interface ProcessingContext {
  requestId: string;
  traceId?: string;
  logger: Logger;
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const { logger, requestId } = createRequestLogger({
    component: 'api:payments.stripe.webhook',
    metadata: {
      method: request.method,
      forwardedFor: request.headers.get('x-forwarded-for') ?? undefined,
    },
  });
  const span = otTrace.getSpan(context.active());
  const traceId = span?.spanContext().traceId;

  let rawBody = '';
  try {
    await ensureStripeConfigured();
    rawBody = await request.text();
  } catch (error) {
    if (error instanceof PaymentConfigError) {
      logger.error({ err: error }, 'Stripe webhook aborted due to missing configuration');
      return NextResponse.json(
        { error: error.message, provider: error.provider, code: error.code },
        { status: 503 },
      );
    }
    logger.error({ err: error }, 'Failed to read Stripe webhook body');
    await logWebhookEvent({
      provider: 'stripe',
      status: 'failed',
      errorMessage: 'body_read_failed',
      metadata: { stage: 'read_body' },
    });
    await logAuditEvent({
      eventType: 'stripe.webhook.body_read_failed',
      severity: 'error',
      requestId,
      traceId,
    });
    await logWorkflowEvent({
      workflowName: 'stripe_webhook',
      spanName: 'STRIPE_WEBHOOK',
      status: 'error',
      durationMs: Date.now() - startedAt,
      requestId,
      traceId,
      metadata: { stage: 'read_body' },
    });
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    logger.warn('Missing stripe-signature header');
    await logAuditEvent({
      eventType: 'stripe.webhook.missing_signature',
      severity: 'warning',
      requestId,
      traceId,
    });
    await logWorkflowEvent({
      workflowName: 'stripe_webhook',
      spanName: 'STRIPE_WEBHOOK',
      status: 'error',
      durationMs: Date.now() - startedAt,
      requestId,
      traceId,
      metadata: { stage: 'header_check' },
    });
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event | null = null;
  try {
    event = verifyStripeWebhook(rawBody, signature);
  } catch (error) {
    logger.error({ err: error }, 'Stripe webhook signature verification failed');
  }

  if (!event) {
    await logWebhookEvent({
      provider: 'stripe',
      eventId: requestId,
      status: 'failed',
      errorMessage: 'invalid_signature',
      metadata: { stage: 'verify_signature' },
    });
    await logAuditEvent({
      eventType: 'stripe.webhook.invalid_signature',
      severity: 'warning',
      requestId,
      traceId,
    });
    await logWorkflowEvent({
      workflowName: 'stripe_webhook',
      spanName: 'STRIPE_WEBHOOK',
      status: 'error',
      durationMs: Date.now() - startedAt,
      requestId,
      traceId,
      metadata: { stage: 'verify_signature' },
    });
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  const eventId = event.id ?? requestId;
  const eventType = event.type ?? 'unknown';

  await logWebhookEvent({
    provider: 'stripe',
    eventId,
    eventType,
    status: 'received',
    payload: event as unknown as Record<string, any>,
  });

  await logAuditEvent({
    eventType: 'stripe.webhook.received',
    requestId,
    traceId,
    metadata: { eventId, eventType },
  });

  try {
    await processStripeEvent(event, {
      requestId,
      traceId,
      logger,
    });

    await logWebhookEvent({
      provider: 'stripe',
      eventId,
      eventType,
      status: 'processed',
    });

    await logAuditEvent({
      eventType: 'stripe.webhook.processed',
      requestId,
      traceId,
      metadata: { eventId, eventType },
    });

    await logWorkflowEvent({
      workflowName: 'stripe_webhook',
      spanName: eventType,
      status: 'ok',
      durationMs: Date.now() - startedAt,
      requestId,
      traceId,
      metadata: { eventId },
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error({ err: error, eventType, eventId }, 'Stripe webhook processing failed');
    await logWebhookEvent({
      provider: 'stripe',
      eventId,
      eventType,
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
    });

    await logAuditEvent({
      eventType: 'stripe.webhook.failed',
      severity: 'error',
      requestId,
      traceId,
      metadata: { eventId, eventType },
    });

    await logWorkflowEvent({
      workflowName: 'stripe_webhook',
      spanName: eventType,
      status: 'error',
      durationMs: Date.now() - startedAt,
      requestId,
      traceId,
      metadata: { eventId },
    });

    return NextResponse.json(
      { error: 'Webhook handler failed', message: error instanceof Error ? error.message : 'unknown_error' },
      { status: 500 }
    );
  }
}

async function processStripeEvent(event: Stripe.Event, context: ProcessingContext): Promise<void> {
  const eventType = event.type;
  switch (eventType) {
    case 'payment_intent.succeeded':
      await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent, eventType, context);
      break;
    case 'payment_intent.payment_failed':
      await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent, eventType, context);
      break;
    case 'payment_intent.canceled':
      await handlePaymentIntentCanceled(event.data.object as Stripe.PaymentIntent, eventType, context);
      break;
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionCreatedOrUpdated(event.data.object as Stripe.Subscription, eventType, context);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, eventType, context);
      break;
    default:
      context.logger.info({ eventType }, 'Unhandled Stripe event type');
      await logAuditEvent({
        eventType: 'stripe.webhook.unhandled_event',
        severity: 'warning',
        requestId: context.requestId,
        traceId: context.traceId,
        metadata: { eventType },
      });
  }
}

async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
  eventType: string,
  context: ProcessingContext
): Promise<void> {
  const { logger, requestId, traceId } = context;
  const userId = paymentIntent.metadata.userId;
  const tier = paymentIntent.metadata.tier as 'free' | 'starter' | 'professional' | 'enterprise';
  const billingCycle = (paymentIntent.metadata.billingCycle as 'monthly' | 'yearly') || 'monthly';
  const subscriptionId = paymentIntent.metadata.subscriptionId;

  if (!userId || !tier) {
    logger.warn({ paymentIntentId: paymentIntent.id }, 'Stripe payment succeeded without user metadata');
    await logAuditEvent({
      eventType: 'stripe.payment.missing_metadata',
      severity: 'warning',
      requestId,
      traceId,
      metadata: { paymentIntentId: paymentIntent.id },
    });
    return;
  }

  const tenantIdResolved = await resolveTenantIdForUser(userId);

  const tenantId = await activateSubscription({
    userId,
    tier,
    billingCycle,
    paymentProvider: 'stripe',
    paymentProviderSubscriptionId: paymentIntent.customer?.toString(),
    paymentIntentId: paymentIntent.id,
    metadata: {
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
      customer_id: paymentIntent.customer,
      event_type: eventType,
    },
    requestId,
    traceId,
    tenantId: tenantIdResolved ?? undefined,
  });

  await logPayment(
    userId,
    subscriptionId || tier,
    paymentIntent.amount / 100,
    paymentIntent.currency.toUpperCase(),
    'stripe',
    paymentIntent.id,
    'succeeded',
    {
      customer_id: paymentIntent.customer,
      payment_method: paymentIntent.payment_method,
      eventType,
    },
    tenantId ?? undefined
  );

  try {
    const { createInvoiceFromPayment } = await import('@/lib/invoices/invoiceHelper');
    await createInvoiceFromPayment({
      userId,
      subscriptionId: subscriptionId || tier,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency.toUpperCase(),
      description: `WhatsApp Bot Builder - ${tier} Plan (${billingCycle})`,
      paymentProvider: 'stripe',
      paymentProviderId: paymentIntent.id,
      customerEmail: paymentIntent.metadata.customerEmail,
      customerName: paymentIntent.metadata.customerName,
      locale: paymentIntent.metadata.locale || 'de',
    });
  } catch (invoiceError) {
    logger.error({ err: invoiceError, paymentIntentId: paymentIntent.id }, 'Failed to create Stripe invoice');
    await logAuditEvent({
      eventType: 'stripe.invoice.creation_failed',
      severity: 'warning',
      requestId,
      traceId,
      metadata: { paymentIntentId: paymentIntent.id, userId, tier },
    });
  }

  await logAuditEvent({
    eventType: 'stripe.payment.succeeded',
    requestId,
    traceId,
    userId,
    tenantId: tenantId ?? undefined,
    metadata: {
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount / 100,
      currency: paymentIntent.currency,
    },
  });
  logger.info({ paymentIntentId: paymentIntent.id, userId, tier }, 'Stripe payment processed successfully');
}

async function handlePaymentIntentFailed(
  paymentIntent: Stripe.PaymentIntent,
  eventType: string,
  context: ProcessingContext
): Promise<void> {
  const { logger, requestId, traceId } = context;
  const userId = paymentIntent.metadata.userId;

  if (!userId) {
    logger.warn({ paymentIntentId: paymentIntent.id }, 'Stripe failed payment without user metadata');
    return;
  }

  const tenantId = await resolveTenantIdForUser(userId);

  await logPayment(
    userId,
    paymentIntent.metadata.subscriptionId || 'unknown',
    paymentIntent.amount / 100,
    paymentIntent.currency.toUpperCase(),
    'stripe',
    paymentIntent.id,
    'failed',
    {
      failure_code: paymentIntent.last_payment_error?.code,
      failure_message: paymentIntent.last_payment_error?.message,
      eventType,
    },
    tenantId ?? undefined
  );

  await logAuditEvent({
    eventType: 'stripe.payment.failed',
    severity: 'warning',
    requestId,
    traceId,
    userId,
    tenantId: tenantId ?? undefined,
    metadata: { paymentIntentId: paymentIntent.id },
  });
  logger.warn({ paymentIntentId: paymentIntent.id, userId }, 'Stripe payment failed');
}

async function handlePaymentIntentCanceled(
  paymentIntent: Stripe.PaymentIntent,
  eventType: string,
  context: ProcessingContext
): Promise<void> {
  const { logger, requestId, traceId } = context;
  const userId = paymentIntent.metadata.userId;

  if (!userId) {
    logger.warn({ paymentIntentId: paymentIntent.id }, 'Stripe canceled payment without user metadata');
    return;
  }

  const tenantId = await resolveTenantIdForUser(userId);

  await logPayment(
    userId,
    paymentIntent.metadata.subscriptionId || 'unknown',
    paymentIntent.amount / 100,
    paymentIntent.currency.toUpperCase(),
    'stripe',
    paymentIntent.id,
    'failed',
    {
      cancellation_reason: 'User canceled',
      eventType,
    },
    tenantId ?? undefined
  );

  await logAuditEvent({
    eventType: 'stripe.payment.canceled',
    severity: 'warning',
    requestId,
    traceId,
    userId,
    tenantId: tenantId ?? undefined,
    metadata: { paymentIntentId: paymentIntent.id },
  });
  logger.info({ paymentIntentId: paymentIntent.id, userId }, 'Stripe payment canceled recorded');
}

async function handleSubscriptionCreatedOrUpdated(
  subscription: Stripe.Subscription,
  eventType: string,
  context: ProcessingContext
): Promise<void> {
  const { logger, requestId, traceId } = context;
  const userId = subscription.metadata.userId;

  if (!userId) {
    logger.warn({ subscriptionId: subscription.id }, 'Stripe subscription update without user metadata');
    return;
  }

  const resolvedTenantId = await resolveTenantIdForUser(userId);

  await logAuditEvent({
    eventType: 'stripe.subscription.updated',
    requestId,
    traceId,
    userId,
    tenantId: resolvedTenantId ?? undefined,
    metadata: {
      subscriptionId: subscription.id,
      status: subscription.status,
      eventType,
    },
  });
  logger.info({ subscriptionId: subscription.id, userId, status: subscription.status }, 'Stripe subscription updated');
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  eventType: string,
  context: ProcessingContext
): Promise<void> {
  const { logger, requestId, traceId } = context;
  const userId = subscription.metadata.userId;

  if (!userId) {
    logger.warn({ subscriptionId: subscription.id }, 'Stripe subscription deletion without user metadata');
    return;
  }

  const resolvedTenantId = await resolveTenantIdForUser(userId);

  const tenantId = await deactivateSubscription(userId, {
    reason: 'Subscription canceled in Stripe',
    requestId,
    traceId,
    tenantId: resolvedTenantId ?? undefined,
  });

  await logAuditEvent({
    eventType: 'stripe.subscription.deleted',
    requestId,
    traceId,
    userId,
    tenantId: tenantId ?? undefined,
    metadata: { subscriptionId: subscription.id, eventType },
  });
  logger.info({ subscriptionId: subscription.id, userId }, 'Stripe subscription delete processed');
}

async function resolveTenantIdForUser(userId: string): Promise<string | null> {
  if (!userId) {
    return null;
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.rpc('ensure_tenant_for_user', {
      user_uuid: userId,
    });

    if (error) {
      return null;
    }

    return data as string | null;
  } catch (error) {
    return null;
  }
}

