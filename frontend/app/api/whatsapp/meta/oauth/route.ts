import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { MetaGraphAPIClient } from '@/lib/whatsapp/meta-client';

/**
 * Meta OAuth Callback Handler
 * Handles OAuth callback from Meta/Facebook Business Manager
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorReason = searchParams.get('error_reason');
  const errorDescription = searchParams.get('error_description');

  // Handle OAuth errors
  if (error) {
    const redirectUrl = new URL('/bots/new', request.url);
    redirectUrl.searchParams.set('error', 'oauth_failed');
    redirectUrl.searchParams.set('reason', errorReason || error);
    redirectUrl.searchParams.set('description', errorDescription || 'OAuth authorization failed');
    return NextResponse.redirect(redirectUrl);
  }

  if (!code || !state) {
    return NextResponse.json(
      { error: 'Missing code or state parameter' },
      { status: 400 }
    );
  }

  try {
    // Parse state (should contain botId and other context)
    const stateData = JSON.parse(decodeURIComponent(state));
    const { botId, userId } = stateData;

    if (!botId) {
      return NextResponse.json(
        { error: 'Missing botId in state' },
        { status: 400 }
      );
    }

    // Exchange code for access token
    const tokenResponse = await exchangeCodeForToken(code);
    
    if (!tokenResponse.access_token) {
      return NextResponse.json(
        { error: 'Failed to obtain access token' },
        { status: 500 }
      );
    }

    // Get business account ID from token response or fetch it
    const businessAccountId = tokenResponse.business_account_id || await getBusinessAccountId(tokenResponse.access_token);

    if (!businessAccountId) {
      return NextResponse.json(
        { error: 'Failed to obtain business account ID' },
        { status: 500 }
      );
    }

    // Save credentials to database
    const supabase = await createServerSupabaseClient();
    const { error: dbError } = await supabase
      .from('bots')
      .update({
        whatsapp_business_id: businessAccountId,
        bot_config: {
          whatsapp: {
            provider: 'meta-direct',
            access_token: tokenResponse.access_token,
            business_account_id: businessAccountId,
            token_type: tokenResponse.token_type,
            expires_in: tokenResponse.expires_in,
            connected_at: new Date().toISOString(),
          },
        },
      })
      .eq('id', botId);

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save credentials' },
        { status: 500 }
      );
    }

    // Redirect to bot page with success
    const redirectUrl = new URL(`/bots/${botId}`, request.url);
    redirectUrl.searchParams.set('whatsapp_connected', 'true');
    redirectUrl.searchParams.set('provider', 'meta');
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('OAuth callback error:', error);
    const redirectUrl = new URL('/bots/new', request.url);
    redirectUrl.searchParams.set('error', 'oauth_error');
    redirectUrl.searchParams.set('message', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.redirect(redirectUrl);
  }
}

/**
 * Exchange OAuth code for access token
 */
async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
  business_account_id?: string;
  user_id?: string;
}> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri = process.env.META_OAUTH_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/meta/oauth`;

  if (!appId || !appSecret) {
    throw new Error('Meta App ID or Secret not configured');
  }

  const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token`;
  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });

  const response = await fetch(`${tokenUrl}?${params.toString()}`, {
    method: 'GET',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Token exchange failed: ${response.status} - ${error.error?.message || response.statusText}`
    );
  }

  return response.json();
}

/**
 * Get business account ID from access token
 */
async function getBusinessAccountId(accessToken: string): Promise<string | null> {
  try {
    const client = new MetaGraphAPIClient(accessToken);
    
    // Try to get business accounts for the user
    const response = await fetch(
      'https://graph.facebook.com/v18.0/me/businesses?fields=id,name',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const businesses = data.data || [];

    // Get WhatsApp Business Accounts for the first business
    if (businesses.length > 0) {
      const businessId = businesses[0].id;
      const wabaResponse = await fetch(
        `https://graph.facebook.com/v18.0/${businessId}/owned_whatsapp_business_accounts?fields=id,name`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (wabaResponse.ok) {
        const wabaData = await wabaResponse.json();
        const accounts = wabaData.data || [];
        return accounts.length > 0 ? accounts[0].id : null;
      }
    }

    return null;
  } catch (error) {
    console.error('Failed to get business account ID:', error);
    return null;
  }
}

