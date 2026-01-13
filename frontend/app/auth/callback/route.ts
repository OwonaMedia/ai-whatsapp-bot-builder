import { createRouteHandlerClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Root-level callback handler (Fallback)
 * Redirects to locale-specific callback
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  // Redirect to locale-specific callback (default: de)
  const locale = 'de';
  const redirectUrl = new URL(`/${locale}/auth/callback`, request.url);
  
  if (code) {
    redirectUrl.searchParams.set('code', code);
  }
  if (next) {
    redirectUrl.searchParams.set('next', next);
  }

  return NextResponse.redirect(redirectUrl);
}

