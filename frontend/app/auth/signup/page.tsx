import { redirect } from 'next/navigation';
import { defaultLocale } from '@/i18n';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Root Signup Page - Redirects to locale-based signup page
 * Main signup is at /[locale]/auth/signup
 */
export default async function SignupPage() {
  if (
    typeof process !== 'undefined' &&
    process.env.NEXT_PHASE === 'phase-production-build'
  ) {
    return null;
  }
  redirect(`/${defaultLocale}/auth/signup`);
}

