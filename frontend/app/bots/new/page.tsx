import { redirect } from 'next/navigation';
import { defaultLocale } from '@/i18n';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Root New Bot Page - Redirects to locale-based new bot page
 * Main page is at /[locale]/bots/new
 */
export default async function NewBotPage() {
  if (
    typeof process !== 'undefined' &&
    process.env.NEXT_PHASE === 'phase-production-build'
  ) {
    return null;
  }
  redirect(`/${defaultLocale}/bots/new`);
}

