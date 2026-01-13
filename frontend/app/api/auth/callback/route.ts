import { createRouteHandlerClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

/**
 * OAuth callback handler
 * Handles both email verification and Facebook OAuth
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const next = searchParams.get('next') || '/dashboard';

  if (!code) {
    return NextResponse.redirect(
      new URL('/auth/error?message=Missing verification code', request.url)
    );
  }

  try {
    const supabase = await createRouteHandlerClient();

    // Check if this is a Facebook OAuth callback (has state param)
    if (state) {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
      const { locale, type } = stateData;

      // Exchange Facebook code for access token
      const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
      const appSecret = process.env.FACEBOOK_APP_SECRET;
      const redirectUri = `${request.nextUrl.origin}/${locale}/auth/callback`;

      if (!appId || !appSecret) {
        throw new Error('Facebook credentials not configured');
      }

      const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
      tokenUrl.searchParams.set('client_id', appId);
      tokenUrl.searchParams.set('client_secret', appSecret);
      tokenUrl.searchParams.set('redirect_uri', redirectUri);
      tokenUrl.searchParams.set('code', code);

      const tokenResponse = await fetch(tokenUrl.toString());
      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange Facebook code for token');
      }

      const { access_token } = await tokenResponse.json();

      // Get user info from Facebook
      const userResponse = await fetch(
        `https://graph.facebook.com/v18.0/me?fields=id,name,email&access_token=${access_token}`
      );
      
      if (!userResponse.ok) {
        throw new Error('Failed to fetch Facebook user info');
      }

      const fbUser = await userResponse.json();

      // Sign in or sign up with Supabase
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'facebook',
        token: access_token,
      });

      if (error) {
        // Try alternative: sign in with email if available
        if (fbUser.email) {
          const { error: signInError } = await supabase.auth.signInWithOAuth({
            provider: 'facebook',
            options: {
              redirectTo: `${request.nextUrl.origin}/${locale}/auth/callback`,
            },
          });
          
          if (signInError) throw signInError;
        } else {
          throw error;
        }
      }

      return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
    }

    // Standard email verification flow
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('[Callback Error]', error);
      return NextResponse.redirect(
        new URL(
          `/auth/error?message=${encodeURIComponent(error.message)}`,
          request.url
        )
      );
    }

    // Redirect to dashboard or next page
    return NextResponse.redirect(new URL(next, request.url));
  } catch (error) {
    console.error('[Callback Error]', error);
    return NextResponse.redirect(
      new URL(
        '/auth/error?message=' +
          encodeURIComponent(
            error instanceof Error ? error.message : 'Verification failed'
          ),
        request.url
      )
    );
  }
}
