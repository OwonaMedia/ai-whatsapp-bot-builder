import { context, trace as otTrace } from '@opentelemetry/api';
import * as crypto from 'crypto';
import type { Logger } from 'pino';
import { NextRequest, NextResponse } from 'next/server';

import { createRequestLogger } from '@/lib/logging/logger';
import { logAuditEvent, logWebhookEvent, logWorkflowEvent } from '@/lib/monitoring/events';
import { createClient } from '@/lib/supabase';

interface ProcessingContext {
  requestId: string;
  traceId?: string;
  logger: Logger;
}

/**
 * WhatsApp Webhook Handler
 * Empfängt Nachrichten von WhatsApp Business API
 */

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const { logger, requestId } = createRequestLogger({
    component: 'api:webhooks.whatsapp',
    metadata: {
      method: request.method,
      forwardedFor: request.headers.get('x-forwarded-for') ?? undefined,
    },
  });

  const activeSpan = otTrace.getSpan(context.active());
  const traceId = activeSpan?.spanContext().traceId;

  let rawBody = '';
  try {
    rawBody = await request.text();
  } catch (error) {
    logger.error({ err: error }, 'Failed to read WhatsApp webhook body');
    await logWebhookEvent({
      provider: 'custom',
      eventId: requestId,
      status: 'failed',
      errorMessage: 'body_read_failed',
      metadata: { channel: 'whatsapp' },
    });
    await logAuditEvent({
      eventType: 'whatsapp.webhook.body_read_failed',
      severity: 'error',
      requestId,
      traceId,
    });
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const signature = request.headers.get('x-hub-signature-256');
  const webhookSecret = process.env.WHATSAPP_WEBHOOK_SECRET;

  if (webhookSecret && signature) {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (`sha256=${expectedSignature}` !== signature) {
      logger.warn({ signature }, 'Invalid WhatsApp webhook signature');
      await logWebhookEvent({
        provider: 'custom',
        eventId: requestId,
        status: 'failed',
        errorMessage: 'invalid_signature',
        metadata: { channel: 'whatsapp' },
      });
      await logAuditEvent({
        eventType: 'whatsapp.webhook.invalid_signature',
        severity: 'warning',
        requestId,
        traceId,
        metadata: { signature },
      });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  let payload: any = {};
  if (rawBody.trim().length > 0) {
    try {
      payload = JSON.parse(rawBody);
    } catch (error) {
      logger.error({ err: error }, 'Unable to parse WhatsApp webhook JSON payload');
      await logWebhookEvent({
        provider: 'custom',
        eventId: requestId,
        status: 'failed',
        errorMessage: 'invalid_json',
        metadata: { channel: 'whatsapp' },
      });
      await logAuditEvent({
        eventType: 'whatsapp.webhook.invalid_json',
        severity: 'error',
        requestId,
        traceId,
      });
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
  }

  await logWebhookEvent({
    provider: 'custom',
    eventId: requestId,
    status: 'received',
    eventType: 'whatsapp_webhook',
    metadata: { channel: 'whatsapp' },
  });

  let inboundMessageCount = 0;
  let statusUpdateCount = 0;

  try {
    if (payload.entry) {
      for (const entry of payload.entry) {
        if (!entry.changes) continue;
        for (const change of entry.changes) {
          if (change.value.messages) {
            for (const message of change.value.messages) {
              if (
                message.type === 'interactive' &&
                message.interactive?.type === 'button_reply'
              ) {
                const buttonId = message.interactive.button_reply?.id;
                if (buttonId) {
                  message.text = { body: buttonId };
                }
              } else if (
                message.type === 'interactive' &&
                message.interactive?.type === 'list_reply'
              ) {
                const listId = message.interactive.list_reply?.id;
                if (listId) {
                  message.text = { body: listId };
                }
              }
              inboundMessageCount += 1;
              await processIncomingMessage(message, change.value.metadata, {
                requestId,
                traceId,
                logger,
              });
            }
          }

          if (change.value.statuses) {
            for (const status of change.value.statuses) {
              statusUpdateCount += 1;
              await processMessageStatus(status, {
                requestId,
                traceId,
                logger,
              });
            }
          }
        }
      }
    }

    await logWebhookEvent({
      provider: 'custom',
      eventId: requestId,
      status: 'processed',
      metadata: {
        channel: 'whatsapp',
        inboundMessageCount,
        statusUpdateCount,
      },
    });

    await logAuditEvent({
      eventType: 'whatsapp.webhook.processed',
      requestId,
      traceId,
      metadata: {
        inboundMessageCount,
        statusUpdateCount,
      },
    });

    const durationMs = Date.now() - startTime;
    await logWorkflowEvent({
      workflowName: 'whatsapp_webhook',
      spanName: 'POST',
      status: 'ok',
      durationMs,
      requestId,
      traceId,
      metadata: {
        inboundMessageCount,
        statusUpdateCount,
      },
    });

    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    logger.error({ err: error }, 'WhatsApp webhook processing failed');
    await logWebhookEvent({
      provider: 'custom',
      eventId: requestId,
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : 'unknown_error',
      metadata: {
        channel: 'whatsapp',
        inboundMessageCount,
        statusUpdateCount,
      },
    });

    await logAuditEvent({
      eventType: 'whatsapp.webhook.failed',
      severity: 'error',
      requestId,
      traceId,
      metadata: {
        inboundMessageCount,
        statusUpdateCount,
      },
    });

    const durationMs = Date.now() - startTime;
    await logWorkflowEvent({
      workflowName: 'whatsapp_webhook',
      spanName: 'POST',
      status: 'error',
      durationMs,
      requestId,
      traceId,
      metadata: {
        inboundMessageCount,
        statusUpdateCount,
      },
    });

    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('hub.mode');
  const token = request.nextUrl.searchParams.get('hub.verify_token');
  const challenge = request.nextUrl.searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

async function processIncomingMessage(message: any, metadata: any, context: ProcessingContext) {
  const supabase = createClient();
  const { logger, requestId, traceId } = context;

  try {
    const from = message.from;
    const messageText = message.text?.body || '';
    const messageId = message.id;

    const phoneHash = await hashPhoneNumber(from);

    const targetPhone = metadata?.phone_number_id || from;
    const { data: bots } = await supabase
      .from('bots')
      .select('*, bot_flows(*), tenant_id')
      .eq('status', 'active')
      .eq('whatsapp_phone_number', targetPhone)
      .limit(1);

    if (!bots || bots.length === 0) {
      logger.warn({ phoneHash, targetPhone }, 'No active bot found for phone number');
      await logAuditEvent({
        eventType: 'whatsapp.message.no_active_bot',
        severity: 'warning',
        requestId,
        traceId,
        metadata: { phoneHash, targetPhone },
      });
      return;
    }

    const bot = bots[0];
    const tenantId = bot.tenant_id as string | undefined;

    const { data: flowData } = await supabase
      .from('bot_flows')
      .select('*')
      .eq('bot_id', bot.id)
      .eq('is_active', true)
      .single();

    if (!flowData) {
      logger.warn({ botId: bot.id }, 'No active flow found for bot');
      await logAuditEvent({
        eventType: 'whatsapp.message.no_active_flow',
        severity: 'warning',
        requestId,
        traceId,
        botId: bot.id,
        tenantId,
      });
      return;
    }

    let { data: conversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('bot_id', bot.id)
      .eq('phone_hash', phoneHash)
      .single();

    if (!conversation) {
      const { data: newConversation, error } = await supabase
        .from('conversations')
        .insert({
          bot_id: bot.id,
          whatsapp_number: from,
          phone_hash: phoneHash,
          consent_given: true,
          consent_timestamp: new Date().toISOString(),
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;
      conversation = newConversation;
    }

    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      direction: 'inbound',
      message_type: 'text',
      content: messageText,
      whatsapp_message_id: messageId,
      created_at: new Date().toISOString(),
    });

    await logAuditEvent({
      eventType: 'whatsapp.message.inbound',
      requestId,
      traceId,
      botId: bot.id,
      tenantId,
      metadata: {
        conversationId: conversation.id,
        whatsappMessageId: messageId,
      },
    });

    const { StateManager } = await import('@/lib/bot/stateManager');
    await StateManager.updateWithUserMessage(conversation.id, messageText);
    const state = await StateManager.getOrCreateState(conversation.id, bot.id);

    const { FlowExecutor } = await import('@/lib/bot/flowExecutor');
    const { WhatsAppClient } = await import('@/lib/whatsapp/client');

    const whatsappClient = new WhatsAppClient(
      bot.whatsapp_business_id || process.env.WHATSAPP_PHONE_NUMBER_ID,
      process.env.WHATSAPP_ACCESS_TOKEN
    );

    const flow = flowData.flow_data as any;
    const executor = new FlowExecutor(
      flow,
      {
        ...state,
        lastUserMessage: messageText,
      },
      whatsappClient,
      from
    );

    if (state.variables?.waitingForQuestionNodeId) {
      executor.handleQuestionResponse(messageText).catch((error) => {
        logger.error({ err: error, botId: bot.id }, 'Question response handling error');
      });
    } else {
      executor.execute().catch((error) => {
        logger.error({ err: error, botId: bot.id }, 'Flow execution error');
      });
    }
  } catch (error) {
    logger.error({ err: error }, 'Error processing incoming WhatsApp message');
    await logAuditEvent({
      eventType: 'whatsapp.message.processing_failed',
      severity: 'error',
      requestId,
      traceId,
      metadata: {
        whatsappMessageId: message?.id,
      },
    });
  }
}

async function processMessageStatus(status: any, context: ProcessingContext) {
  const supabase = createClient();
  const { logger, requestId, traceId } = context;

  try {
    const messageId = status.id;
    const messageStatus = status.status;

    const { data: messageRow } = await supabase
      .from('messages')
      .select('tenant_id')
      .eq('whatsapp_message_id', messageId)
      .maybeSingle();

    const tenantId = messageRow?.tenant_id as string | undefined;

    await supabase
      .from('messages')
      .update({
        delivered_at: messageStatus === 'delivered' ? new Date().toISOString() : null,
        read_at: messageStatus === 'read' ? new Date().toISOString() : null,
      })
      .eq('whatsapp_message_id', messageId);

    await logAuditEvent({
      eventType: 'whatsapp.message.status_update',
      requestId,
      traceId,
      tenantId,
      metadata: {
        whatsappMessageId: messageId,
        status: messageStatus,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Error processing WhatsApp message status');
    await logAuditEvent({
      eventType: 'whatsapp.message.status_failed',
      severity: 'error',
      requestId,
      traceId,
      metadata: {
        whatsappMessageId: status?.id,
      },
    });
  }
}

async function hashPhoneNumber(phoneNumber: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = process.env.WHATSAPP_SALT || 'default-salt';
  const data = encoder.encode(phoneNumber + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

