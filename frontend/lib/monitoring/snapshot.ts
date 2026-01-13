import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

export interface PaymentEventRecord {
  id: string;
  created_at: string;
  recorded_at?: string;
  user_id?: string | null;
  subscription_id?: string | null;
  amount?: number | null;
  currency?: string | null;
  payment_provider: string;
  payment_provider_id?: string | null;
  status: string;
  event_type?: string | null;
  metadata?: Record<string, any> | null;
}

export interface WebhookEventRecord {
  id: string;
  created_at: string;
  processed_at?: string | null;
  provider: string;
  event_id?: string | null;
  event_type?: string | null;
  status: string;
  http_status?: number | null;
  error_message?: string | null;
  metadata?: Record<string, any> | null;
}

export interface MonitoringSnapshot {
  stats: {
    totalRevenue: number;
    totalPayments: number;
    failedPayments: number;
    refundedPayments: number;
    successRate: number;
    webhookFailures: number;
    lastPayment?: PaymentEventRecord;
    lastWebhookFailure?: WebhookEventRecord;
  };
  payments: PaymentEventRecord[];
  webhooks: WebhookEventRecord[];
  range: {
    days: number;
    from: string;
    to: string;
  };
}

interface SnapshotOptions {
  days?: number;
  limit?: number;
}

export async function getMonitoringSnapshot({ days = 30, limit = 50 }: SnapshotOptions = {}): Promise<MonitoringSnapshot> {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);

  const timeFilter = from.toISOString();

  let payments: PaymentEventRecord[] = [];
  let webhooks: WebhookEventRecord[] = [];

  try {
    const supabase = getSupabaseAdminClient();

    const { data: paymentData, error: paymentsError } = await supabase
      .from('payment_events')
      .select('id,created_at,recorded_at,user_id,subscription_id,amount,currency,payment_provider,payment_provider_id,status,event_type,metadata')
      .gte('created_at', timeFilter)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (paymentsError) {
      console.error('[Monitoring] Failed to load payment events', paymentsError);
    } else if (Array.isArray(paymentData)) {
      payments = paymentData as PaymentEventRecord[];
    }

    const { data: webhookData, error: webhooksError } = await supabase
      .from('webhook_events')
      .select('id,created_at,processed_at,provider,event_id,event_type,status,http_status,error_message,metadata')
      .gte('created_at', timeFilter)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (webhooksError) {
      console.error('[Monitoring] Failed to load webhook events', webhooksError);
    } else if (Array.isArray(webhookData)) {
      webhooks = webhookData as WebhookEventRecord[];
    }
  } catch (error) {
    console.error('[Monitoring] Unexpected error while building snapshot', error);
  }

  const normalizedPayments = payments;
  const normalizedWebhooks = webhooks;

  const totalRevenue = normalizedPayments
    .filter((payment) => payment.status === 'succeeded' && typeof payment.amount === 'number')
    .reduce((sum, payment) => sum + (payment.amount ?? 0), 0);

  const failedPayments = normalizedPayments.filter((payment) => payment.status === 'failed').length;
  const refundedPayments = normalizedPayments.filter((payment) => payment.status === 'refunded').length;
  const succeededPayments = normalizedPayments.filter((payment) => payment.status === 'succeeded').length;
  const countedPayments = succeededPayments + failedPayments + refundedPayments;
  const successRate = countedPayments === 0 ? 0 : (succeededPayments / countedPayments) * 100;

  const webhookFailures = normalizedWebhooks.filter((event) => event.status === 'failed').length;
  const lastWebhookFailure = normalizedWebhooks.find((event) => event.status === 'failed');

  return {
    stats: {
      totalRevenue,
      totalPayments: normalizedPayments.length,
      failedPayments,
      refundedPayments,
      successRate: Math.round(successRate * 10) / 10,
      webhookFailures,
      lastPayment: normalizedPayments[0],
      lastWebhookFailure,
    },
    payments: normalizedPayments,
    webhooks: normalizedWebhooks,
    range: {
      days,
      from: from.toISOString(),
      to: to.toISOString(),
    },
  };
}


