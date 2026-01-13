import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side Facebook OAuth initiation
 * Better for mobile/Safari than client-side popup
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get('locale') || 'de';
  const type = searchParams.get('type') || 'login'; // login or signup

  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
  if (!appId) {
    return NextResponse.json({ error: 'Facebook App ID not configured' }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
  const redirectUri = `${baseUrl}/${locale}/auth/callback`;
  const state = Buffer.from(JSON.stringify({ locale, type, timestamp: Date.now() })).toString('base64');

  const oauthUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
  oauthUrl.searchParams.set('client_id', appId);
  oauthUrl.searchParams.set('redirect_uri', redirectUri);
  oauthUrl.searchParams.set('state', state);
  oauthUrl.searchParams.set('scope', 'email,public_profile');
  oauthUrl.searchParams.set('response_type', 'code');
  // Für Mobile: display=page statt popup
  oauthUrl.searchParams.set('display', 'page');

  return NextResponse.redirect(oauthUrl.toString());
}
