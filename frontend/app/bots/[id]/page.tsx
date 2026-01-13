import { redirect } from 'next/navigation';
import { defaultLocale } from '@/i18n';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Root Bot Page - Redirects to locale-based bot page
 * Main page is at /[locale]/bots/[id]
 */
export default async function BotPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (
    typeof process !== 'undefined' &&
    process.env.NEXT_PHASE === 'phase-production-build'
  ) {
    return null;
  }
  redirect(`/${defaultLocale}/bots/${id}`);
}

