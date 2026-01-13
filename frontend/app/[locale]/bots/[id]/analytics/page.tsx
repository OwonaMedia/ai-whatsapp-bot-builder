import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const IS_BUILD_TIME =
  typeof process !== 'undefined' &&
  process.env.NEXT_PHASE === 'phase-production-build';

export default async function BotAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const resolvedParams = await params;

  if (IS_BUILD_TIME) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-4xl flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white/40 p-8 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">
          Analytics werden dynamisch geladen
        </h1>
        <p className="mt-3 text-sm text-gray-600">
          Während des Builds werden keine externen Supabase-Anfragen ausgeführt.
        </p>
      </div>
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${resolvedParams.locale}/auth/login?redirect=/${resolvedParams.locale}/bots/${resolvedParams.id}/analytics`);
  }

  // Get bot
  const { data: bot, error: botError } = await supabase
    .from('bots')
    .select('*')
    .eq('id', resolvedParams.id)
    .eq('user_id', user.id)
    .single();

  if (botError || !bot) {
    redirect(`/${resolvedParams.locale}/dashboard`);
  }

  // Get analytics data
  const { data: analytics } = await supabase
    .from('analytics')
    .select('*')
    .eq('bot_id', resolvedParams.id)
    .order('date', { ascending: false })
    .limit(30); // Last 30 days

  // Get conversation stats
  const { data: conversations } = await supabase
    .from('conversations')
    .select('id, status, created_at')
    .eq('bot_id', resolvedParams.id);

  // Get message stats
  const { data: messages } = await supabase
    .from('messages')
    .select('id, direction, message_type, created_at')
    .in(
      'conversation_id',
      conversations?.map((c: { id: string }) => c.id) || []
    );

  return (
    <AnalyticsDashboard
      bot={bot}
      analytics={analytics || []}
      conversations={conversations || []}
      messages={messages || []}
    />
  );
}

