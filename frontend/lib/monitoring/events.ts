import { getLogger } from '@/lib/logging/logger';
import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';

type PaymentStatus = 'succeeded' | 'failed' | 'pending' | 'refunded' | 'canceled';
type PaymentProvider = 'stripe' | 'paypal' | 'manual' | 'mollie' | 'klarna';
type WebhookStatus = 'received' | 'processed' | 'failed';
type AuditSeverity = 'info' | 'warning' | 'error';

interface LogPaymentEventParams {
  userId?: string;
  subscriptionId?: string;
  amount?: number;
  currency?: string;
  paymentProvider: PaymentProvider;
  paymentProviderId?: string;
  status: PaymentStatus;
  eventType?: string;
  metadata?: Record<string, any>;
  tenantId?: string;
}

interface LogWebhookEventParams {
  provider: 'stripe' | 'paypal' | 'mollie' | 'klarna' | 'custom';
  eventId?: string;
  eventType?: string;
  status: WebhookStatus;
  httpStatus?: number;
  errorMessage?: string;
  payload?: Record<string, any> | null;
  metadata?: Record<string, any>;
  tenantId?: string;
}

interface LogAuditEventParams {
  eventType: string;
  severity?: AuditSeverity;
  userId?: string;
  botId?: string;
  requestId?: string;
  traceId?: string;
  metadata?: Record<string, any>;
  tenantId?: string;
}

interface LogWorkflowEventParams {
  workflowName: string;
  spanName: string;
  status: 'ok' | 'error';
  durationMs?: number;
  requestId?: string;
  traceId?: string;
  metadata?: Record<string, any>;
  tenantId?: string;
}

const logger = getLogger();

export async function logPaymentEvent(params: LogPaymentEventParams): Promise<void> {
  try {
    const supabase = getSupabaseAdminClient();
    const record: Record<string, any> = {
      user_id: params.userId ?? null,
      subscription_id: params.subscriptionId ?? null,
      amount: typeof params.amount === 'number' ? params.amount : null,
      currency: params.currency ?? null,
      payment_provider: params.paymentProvider,
      payment_provider_id: params.paymentProviderId ?? null,
      status: params.status,
      event_type: params.eventType ?? null,
      metadata: params.metadata ?? {},
      tenant_id: params.tenantId ?? null,
    };

    await supabase.from('payment_events').insert(record);
  } catch (error) {
    logger.error({ err: error, params }, '[Monitoring] Failed to log payment event');
  }
}

export async function logWebhookEvent(params: LogWebhookEventParams): Promise<void> {
  try {
    const supabase = getSupabaseAdminClient();

    const record: Record<string, any> = {
      provider: params.provider,
      event_id: params.eventId ?? null,
      event_type: params.eventType ?? null,
      status: params.status,
      http_status: params.httpStatus ?? null,
      error_message: params.errorMessage ?? null,
      metadata: params.metadata ?? {},
      tenant_id: params.tenantId ?? null,
    };

    if (params.payload !== undefined) {
      record.payload = params.payload;
    }

    if (params.status === 'processed') {
      record.processed_at = new Date().toISOString();
    }

    await supabase.from('webhook_events').upsert(record, {
      onConflict: 'provider,event_id',
      ignoreDuplicates: false,
    });
  } catch (error) {
    logger.error({ err: error, params }, '[Monitoring] Failed to log webhook event');
  }
}

export async function logAuditEvent(params: LogAuditEventParams): Promise<void> {
  try {
    const supabase = getSupabaseAdminClient();
    await supabase.from('app_audit_log').insert({
      event_type: params.eventType,
      severity: params.severity ?? 'info',
      user_id: params.userId ?? null,
      bot_id: params.botId ?? null,
      request_id: params.requestId ?? null,
      trace_id: params.traceId ?? null,
      metadata: params.metadata ?? {},
      tenant_id: params.tenantId ?? null,
    });
  } catch (error) {
    logger.error({ err: error, params }, '[Monitoring] Failed to log audit event');
  }
}

export async function logWorkflowEvent(params: LogWorkflowEventParams): Promise<void> {
  try {
    const supabase = getSupabaseAdminClient();
    await supabase.from('log_workflow_events').insert({
      workflow_name: params.workflowName,
      span_name: params.spanName,
      status: params.status,
      duration_ms: typeof params.durationMs === 'number' ? Math.round(params.durationMs) : null,
      request_id: params.requestId ?? null,
      trace_id: params.traceId ?? null,
      metadata: params.metadata ?? {},
      tenant_id: params.tenantId ?? null,
    });
  } catch (error) {
    logger.error({ err: error, params }, '[Monitoring] Failed to log workflow event');
  }
}


