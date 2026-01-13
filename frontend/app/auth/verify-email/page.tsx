import { redirect } from 'next/navigation';
import { defaultLocale } from '@/i18n';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Root Verify Email Page - Redirects to locale-based verify email page
 * Main page is at /[locale]/auth/verify-email (if it exists)
 * Or redirects to login if page doesn't exist
 */
export default async function VerifyEmailPage() {
  if (
    typeof process !== 'undefined' &&
    process.env.NEXT_PHASE === 'phase-production-build'
  ) {
    return null;
  }
  // Note: Verify email might not have a locale route, so redirect to login
  redirect(`/${defaultLocale}/auth/login`);
}

