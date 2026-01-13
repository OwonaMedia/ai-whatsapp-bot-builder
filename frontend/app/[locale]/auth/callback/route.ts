import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createRouteHandlerClient } from '@/lib/supabase';
import type { EmailOtpType } from '@supabase/supabase-js';

/**
 * Get base URL from request headers (works with proxy/nginx)
 * Uses forwarded headers from Nginx proxy to determine correct domain
 */
function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'whatsapp.owona.de';
  const protocol = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  return `${protocol}://${host}`;
}

/**
 * Email Confirmation Callback Handler
 * Handles Supabase email confirmation links
 * 
 * Supports both flows:
 * - Code Flow: ?code=xxx (exchangeCodeForSession)
 * - PKCE Flow: ?token_hash=xxx&type=email (verifyOtp)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> }
) {
  // Fix malformed URLs with double ? (e.g., ?next=/dashboard?token_hash=...)
  const fixedUrl = request.url.replace(/\?([^?]+)\?/, '?$1&');
  const requestUrl = new URL(fixedUrl);
  const code = requestUrl.searchParams.get('code');
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type') as EmailOtpType | null;
  const next = requestUrl.searchParams.get('next') || '/dashboard';
  const { locale } = await params;

  try {
    // Create Supabase client for route handler
    const supabase = await createRouteHandlerClient();
    
    // Try PKCE Flow first (token_hash), then Code Flow
    if (token_hash && type) {
      // PKCE Flow: SSR-friendly
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash,
      });

      if (error) {
        console.error('Auth callback error (PKCE):', error);
        const baseUrl = getBaseUrl(request);
        const errorUrl = new URL(`/${locale}/auth/auth-code-error`, baseUrl);
        // Check if email is in the token_hash or other params
        if (error.message.includes('expired') || error.message.includes('invalid')) {
          errorUrl.searchParams.set('error', 'otp_expired');
        }
        return NextResponse.redirect(errorUrl);
      }

      // Success - redirect to specified next URL or dashboard
      const baseUrl = getBaseUrl(request);
      const redirectPath = next.startsWith('/') 
        ? `/${locale}${next}`
        : `/${locale}/${next}`;
      
      const redirectUrl = new URL(redirectPath, baseUrl);
      return NextResponse.redirect(redirectUrl);
    } else if (code) {
      // Code Flow: Implicit flow (client-side)
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('Auth callback error (Code):', error);
        const baseUrl = getBaseUrl(request);
        const errorUrl = new URL(`/${locale}/auth/auth-code-error`, baseUrl);
        if (error.message.includes('expired') || error.message.includes('invalid')) {
          errorUrl.searchParams.set('error', 'otp_expired');
        }
        return NextResponse.redirect(errorUrl);
      }

      // Success - redirect to specified next URL or dashboard
      const baseUrl = getBaseUrl(request);
      const redirectPath = next.startsWith('/') 
        ? `/${locale}${next}`
        : `/${locale}/${next}`;
      
      const redirectUrl = new URL(redirectPath, baseUrl);
      return NextResponse.redirect(redirectUrl);
    }

    // No valid auth parameters - redirect to login
    console.warn('Auth callback: No code or token_hash provided');
    const baseUrl = getBaseUrl(request);
    return NextResponse.redirect(new URL(`/${locale}/auth/login`, baseUrl));
  } catch (error) {
    console.error('Callback handler error:', error);
    const baseUrl = getBaseUrl(request);
    return NextResponse.redirect(
      new URL(`/${locale}/auth/auth-code-error`, baseUrl)
    );
  }
}

