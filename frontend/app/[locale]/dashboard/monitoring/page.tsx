import { redirect } from 'next/navigation';
import MonitoringDashboard from '@/components/monitoring/MonitoringDashboard';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { isMonitoringAllowed } from '@/lib/monitoring/allowlist';
import { getMonitoringSnapshot } from '@/lib/monitoring/snapshot';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const IS_BUILD_TIME =
  typeof process !== 'undefined' &&
  process.env.NEXT_PHASE === 'phase-production-build';

export default async function MonitoringPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (IS_BUILD_TIME) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white/40 p-8 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Monitoring</h1>
        <p className="mt-3 text-sm text-gray-600">
          Live-Monitoring wird nur zur Laufzeit geladen. Während des Builds werden Supabase-Abfragen
          unterdrückt.
        </p>
      </div>
    );
  }

  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect(`/${locale}/auth/login?redirect=/${locale}/dashboard/monitoring`);
  }

  if (!isMonitoringAllowed(user.email)) {
    redirect(`/${locale}/dashboard`);
  }

  const snapshot = await getMonitoringSnapshot();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <MonitoringDashboard locale={locale} initialSnapshot={snapshot} />
      </div>
    </div>
  );
}


