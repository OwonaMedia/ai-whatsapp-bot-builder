import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { MetaGraphAPIClient } from '@/lib/whatsapp/meta-client';
import { PhoneVerificationService } from '@/lib/whatsapp/phone-verification';

/**
 * Phone Verification API Endpoint
 * Handles phone number verification requests and code verification
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { botId, action, phoneNumberId, code, method } = body;

    if (!botId || !action) {
      return NextResponse.json(
        { error: 'Missing required parameters: botId, action' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();
    
    // Get bot configuration
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
    if (!whatsappConfig?.access_token || !whatsappConfig?.business_account_id) {
      return NextResponse.json(
        { error: 'WhatsApp not connected. Please connect via OAuth first.' },
        { status: 400 }
      );
    }

    const client = new MetaGraphAPIClient(whatsappConfig.access_token);
    const service = new PhoneVerificationService(client);
    const businessAccountId = whatsappConfig.business_account_id;

    if (action === 'request_code') {
      if (!phoneNumberId) {
        return NextResponse.json(
          { error: 'Missing phoneNumberId' },
          { status: 400 }
        );
      }

      const result = await service.requestVerificationCode(phoneNumberId, {
        method: method || 'SMS',
        language: 'de',
      });

      return NextResponse.json({
        success: result.success,
        code_length: result.code_length,
      });
    }

    if (action === 'verify_code') {
      if (!phoneNumberId || !code) {
        return NextResponse.json(
          { error: 'Missing phoneNumberId or code' },
          { status: 400 }
        );
      }

      const result = await service.verifyCode(phoneNumberId, code);

      if (result.success && result.verified) {
        // Update bot configuration with verified phone number
        const updatedConfig = {
          ...bot.bot_config,
          whatsapp: {
            ...whatsappConfig,
            phone_number_id: phoneNumberId,
            phone_verified_at: new Date().toISOString(),
          },
        };

        await supabase
          .from('bots')
          .update({ bot_config: updatedConfig })
          .eq('id', botId);
      }

      return NextResponse.json(result);
    }

    if (action === 'list_phones') {
      const phoneNumbers = await service.getPhoneNumbers(businessAccountId);
      return NextResponse.json({
        success: true,
        phoneNumbers,
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: request_code, verify_code, or list_phones' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Phone verification error:', error);
    return NextResponse.json(
      {
        error: 'Phone verification failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

