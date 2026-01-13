import { redirect } from 'next/navigation';
import { defaultLocale } from '@/i18n';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Fallback Login Page - Redirects to locale-based login
 * Main login is at /[locale]/auth/login
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: { redirect?: string };
}) {
  // Redirect to locale-based login
  const redirectPath = searchParams.redirect 
    ? `/${defaultLocale}/auth/login?redirect=${encodeURIComponent(searchParams.redirect)}`
    : `/${defaultLocale}/auth/login`;

  if (
    typeof process !== 'undefined' &&
    process.env.NEXT_PHASE === 'phase-production-build'
  ) {
    return null;
  }

  redirect(redirectPath);
}

