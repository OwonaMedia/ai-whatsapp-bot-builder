import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { setRequestLocale } from 'next-intl/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const IS_BUILD_TIME =
  typeof process !== 'undefined' &&
  process.env.NEXT_PHASE === 'phase-production-build';

export default async function BotsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const resolvedParams = await params;
  setRequestLocale(resolvedParams.locale);

  if (IS_BUILD_TIME) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white/40 p-8 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Bot-Übersicht</h1>
        <p className="mt-3 text-sm text-gray-600">
          Diese Seite leitet im Live-Betrieb auf das Dashboard weiter. Während des Builds werden
          keine Supabase-Abfragen ausgeführt.
        </p>
      </div>
    );
  }
  
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${resolvedParams.locale}/auth/login?redirect=/${resolvedParams.locale}/bots`);
  }

  // Redirect to dashboard (bots overview is on dashboard)
  redirect(`/${resolvedParams.locale}/dashboard`);
}

