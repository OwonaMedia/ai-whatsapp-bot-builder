import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase';

/**
 * Test WhatsApp API Connection
 * POST /api/bots/[id]/test-whatsapp
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { phone_number_id, access_token } = await request.json();

    if (!phone_number_id || !access_token) {
      return NextResponse.json(
        { error: 'Phone Number ID und Access Token sind erforderlich' },
        { status: 400 }
      );
    }

    // Test WhatsApp API Connection by fetching phone number details
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${phone_number_id}?fields=verified_name,display_phone_number,code_verification_status`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${access_token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      return NextResponse.json(
        { 
          error: error.error?.message || 'WhatsApp API Verbindung fehlgeschlagen',
          details: error,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      message: 'WhatsApp API Verbindung erfolgreich!',
      phoneNumber: {
        id: phone_number_id,
        verifiedName: data.verified_name || 'Nicht verifiziert',
        displayPhoneNumber: data.display_phone_number || 'N/A',
        codeVerificationStatus: data.code_verification_status || 'N/A',
      },
    });
  } catch (error: any) {
    console.error('[Test WhatsApp] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Test fehlgeschlagen' },
      { status: 500 }
    );
  }
}

