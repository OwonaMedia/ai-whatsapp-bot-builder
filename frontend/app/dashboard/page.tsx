import { redirect } from 'next/navigation';
import { defaultLocale } from '@/i18n';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Root Dashboard Page - Redirects to locale-based dashboard
 * Main dashboard is at /[locale]/dashboard
 */
export default async function DashboardPage() {
  if (
    typeof process !== 'undefined' &&
    process.env.NEXT_PHASE === 'phase-production-build'
  ) {
    return null;
  }
  redirect(`/${defaultLocale}/dashboard`);
}

