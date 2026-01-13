/**
 * Subscription Activation Helper
 * Aktiviert Subscriptions nach erfolgreicher Zahlung und führt Audit-Logs.
 */

import { getLogger } from '@/lib/logging/logger';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { logAuditEvent, logPaymentEvent } from '@/lib/monitoring/events';

const logger = getLogger();

export interface ActivateSubscriptionParams {
  userId: string;
  tier: 'free' | 'starter' | 'professional' | 'enterprise';
  billingCycle: 'monthly' | 'yearly';
  paymentProvider?: 'stripe' | 'paypal' | 'manual';
  paymentProviderSubscriptionId?: string;
  paymentIntentId?: string;
  orderId?: string;
  metadata?: Record<string, any>;
  tenantId?: string;
  requestId?: string;
  traceId?: string;
}

interface DeactivateSubscriptionContext {
  reason?: string;
  requestId?: string;
  traceId?: string;
  tenantId?: string;
}

async function resolveTenantId(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  userId: string,
  explicitTenantId?: string,
  fallbackTenantId?: string | null
): Promise<string | null> {
  if (explicitTenantId) {
    return explicitTenantId;
  }

  if (fallbackTenantId) {
    return fallbackTenantId;
  }

  const { data, error } = await supabase.rpc('ensure_tenant_for_user', {
    user_uuid: userId,
  });

  if (error) {
    logger.warn({ userId, error }, '[Subscription Activation] Failed to ensure tenant.');
    return null;
  }

  return data as string | null;
}

export async function activateSubscription(params: ActivateSubscriptionParams): Promise<string | null> {
  const supabase = getSupabaseAdminClient();
  const {
    userId,
    tier,
    billingCycle,
    paymentProvider,
    paymentProviderSubscriptionId,
    paymentIntentId,
    orderId,
    metadata,
    tenantId: providedTenantId,
    requestId,
    traceId,
  } = params;

  const periodMonths = billingCycle === 'yearly' ? 12 : 1;
  const currentPeriodStart = new Date();
  const currentPeriodEnd = new Date();
  currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + periodMonths);

  try {
    const { data: existingSubscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('id, tenant_id')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw new Error(`Failed to fetch existing subscription: ${fetchError.message}`);
    }

    const tenantId = await resolveTenantId(
      supabase,
      userId,
      providedTenantId,
      existingSubscription?.tenant_id ?? null
    );

    const subscriptionData = {
      user_id: userId,
      tenant_id: tenantId,
      tier,
      status: 'active' as const,
      billing_cycle: billingCycle,
      current_period_start: currentPeriodStart.toISOString(),
      current_period_end: currentPeriodEnd.toISOString(),
      cancel_at_period_end: false,
      cancelled_at: null,
      payment_provider: paymentProvider || null,
      payment_provider_subscription_id: paymentProviderSubscriptionId || null,
      metadata: {
        ...(metadata || {}),
        payment_intent_id: paymentIntentId,
        order_id: orderId,
        activated_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    };

    if (existingSubscription) {
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update(subscriptionData)
        .eq('id', existingSubscription.id);

      if (updateError) {
        throw new Error(`Failed to update subscription: ${updateError.message}`);
      }

      logger.info({ userId, tier, tenantId }, '[Subscription Activation] Updated subscription');
      await logAuditEvent({
        eventType: 'subscription.updated',
        userId,
        tenantId: tenantId ?? undefined,
        metadata: { tier, billingCycle, paymentProvider, requestId, traceId },
        requestId,
        traceId,
      });
    } else {
      const { error: insertError } = await supabase.from('subscriptions').insert(subscriptionData);

      if (insertError) {
        throw new Error(`Failed to create subscription: ${insertError.message}`);
      }

      logger.info({ userId, tier, tenantId }, '[Subscription Activation] Created subscription');
      await logAuditEvent({
        eventType: 'subscription.created',
        userId,
        tenantId: tenantId ?? undefined,
        metadata: { tier, billingCycle, paymentProvider, requestId, traceId },
        requestId,
        traceId,
      });
    }

    return tenantId ?? null;
  } catch (error: any) {
    logger.error({ err: error, userId, tier }, '[Subscription Activation] Error');
    await logAuditEvent({
      eventType: 'subscription.activation_failed',
      severity: 'error',
      userId,
      tenantId: providedTenantId,
      metadata: { error: error.message, tier, billingCycle, paymentProvider, requestId, traceId },
      requestId,
      traceId,
    });
    throw error;
  }
}

export async function deactivateSubscription(
  userId: string,
  context: DeactivateSubscriptionContext = {}
): Promise<string | null> {
  const supabase = getSupabaseAdminClient();
  const { reason, requestId, traceId, tenantId: providedTenantId } = context;

  try {
    const { data: existingSubscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('id, tenant_id, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw new Error(`Failed to load subscription: ${fetchError.message}`);
    }

    if (!existingSubscription) {
      logger.warn({ userId }, '[Subscription Activation] No active subscription to deactivate');
      return null;
    }

    const tenantId = providedTenantId ?? existingSubscription.tenant_id ?? null;

    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancel_at_period_end: true,
        metadata: {
          cancellation_reason: reason || 'Payment failed or refunded',
          cancelled_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingSubscription.id);

    if (error) {
      throw new Error(`Failed to deactivate subscription: ${error.message}`);
    }

    logger.info({ userId, tenantId }, '[Subscription Activation] Deactivated subscription');
    await logAuditEvent({
      eventType: 'subscription.deactivated',
      userId,
      tenantId: tenantId ?? undefined,
      metadata: { reason, requestId, traceId },
      requestId,
      traceId,
    });

    return tenantId ?? null;
  } catch (error: any) {
    logger.error({ err: error, userId }, '[Subscription Activation] Error');
    await logAuditEvent({
      eventType: 'subscription.deactivation_failed',
      severity: 'error',
      userId,
      tenantId: providedTenantId,
      metadata: { error: error.message, reason, requestId, traceId },
      requestId,
      traceId,
    });
    throw error;
  }
}

export async function logPayment(
  userId: string,
  subscriptionId: string,
  amount: number,
  currency: string,
  paymentProvider: 'stripe' | 'paypal',
  paymentProviderId: string,
  status: 'succeeded' | 'failed' | 'pending' | 'refunded' | 'canceled',
  metadata?: Record<string, any>,
  tenantId?: string
): Promise<void> {
  await logPaymentEvent({
    userId,
    subscriptionId,
    amount,
    currency,
    paymentProvider,
    paymentProviderId,
    status,
    metadata,
    eventType: metadata?.eventType,
    tenantId,
  });
}

