import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { MetaGraphAPIClient } from '@/lib/whatsapp/meta-client';

/**
 * Meta Webhook Management API
 * Handles webhook configuration for WhatsApp Business API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { botId, webhookUrl, verifyToken, fields } = body;

    if (!botId || !webhookUrl || !verifyToken) {
      return NextResponse.json(
        { error: 'Missing required parameters: botId, webhookUrl, verifyToken' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    
    // Get bot configuration
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .select('bot_config, whatsapp_business_id')
      .eq('id', botId)
      .single();

    if (botError || !bot) {
      return NextResponse.json(
        { error: 'Bot not found' },
        { status: 404 }
      );
    }

    const whatsappConfig = (bot.bot_config as any)?.whatsapp;
    if (!whatsappConfig?.access_token || !whatsappConfig?.business_account_id) {
      return NextResponse.json(
        { error: 'WhatsApp not connected. Please connect via OAuth first.' },
        { status: 400 }
      );
    }

    const client = new MetaGraphAPIClient(whatsappConfig.access_token);
    const businessAccountId = whatsappConfig.business_account_id;

    // Subscribe to webhooks
    const subscribedFields = fields || ['messages', 'message_status'];
    await client.subscribeToWebhooks(businessAccountId, subscribedFields);

    // Update bot configuration with webhook info
    const updatedConfig = {
      ...bot.bot_config,
      whatsapp: {
        ...whatsappConfig,
        webhook_url: webhookUrl,
        verify_token: verifyToken,
        webhook_fields: subscribedFields,
        webhook_configured_at: new Date().toISOString(),
      },
    };

    const { error: updateError } = await supabase
      .from('bots')
      .update({ bot_config: updatedConfig })
      .eq('id', botId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update bot configuration' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook configured successfully',
      webhookUrl,
      fields: subscribedFields,
    });
  } catch (error) {
    console.error('Webhook configuration error:', error);
    return NextResponse.json(
      {
        error: 'Failed to configure webhook',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Get current webhook configuration
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const botId = searchParams.get('botId');

    if (!botId) {
      return NextResponse.json(
        { error: 'Missing botId parameter' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .select('bot_config')
      .eq('id', botId)
      .single();

    if (botError || !bot) {
      return NextResponse.json(
        { error: 'Bot not found' },
        { status: 404 }
      );
    }

    const whatsappConfig = (bot.bot_config as any)?.whatsapp;
    
    return NextResponse.json({
      webhookUrl: whatsappConfig?.webhook_url || null,
      verifyToken: whatsappConfig?.verify_token || null,
      fields: whatsappConfig?.webhook_fields || [],
      configuredAt: whatsappConfig?.webhook_configured_at || null,
    });
  } catch (error) {
    console.error('Get webhook configuration error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get webhook configuration',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

