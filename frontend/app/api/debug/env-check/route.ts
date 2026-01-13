import { NextResponse } from 'next/server';

/**
 * Debug endpoint to check loaded environment variables.
 * Returns masked values for security.
 */
export async function GET() {
  const mask = (val: string | undefined) => {
    if (!val) return '(empty)';
    if (val.startsWith('sb_')) return val.slice(0, 10) + '...' + val.slice(-10);
    if (val.startsWith('eyJ')) return val.slice(0, 20) + '...' + val.slice(-20);
    return val.slice(0, 10) + '...' + val.slice(-10);
  };

  return NextResponse.json({
    env: {
      NEXT_PUBLIC_SUPABASE_URL: mask(process.env.NEXT_PUBLIC_SUPABASE_URL),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: mask(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      SUPABASE_SERVICE_ROLE_KEY: mask(process.env.SUPABASE_SERVICE_ROLE_KEY),
      GROQ_API_KEY: mask(process.env.GROQ_API_KEY),
      NEXT_PUBLIC_FACEBOOK_APP_ID: mask(process.env.NEXT_PUBLIC_FACEBOOK_APP_ID),
      NODE_ENV: process.env.NODE_ENV,
    },
    timestamp: new Date().toISOString(),
  });
}
