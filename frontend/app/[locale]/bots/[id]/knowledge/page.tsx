import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import KnowledgeManagement from '@/components/knowledge/KnowledgeManagement';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const IS_BUILD_TIME =
  typeof process !== 'undefined' &&
  process.env.NEXT_PHASE === 'phase-production-build';

export default async function BotKnowledgePage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const resolvedParams = await params;

  if (IS_BUILD_TIME) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-4xl flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white/40 p-8 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">
          Wissensverwaltung wird vorbereitet
        </h1>
        <p className="mt-3 text-sm text-gray-600">
          Diese Seite lädt im Produktionsbetrieb dynamisch Supabase-Daten. Während des Builds
          werden keine externen Anfragen ausgeführt.
        </p>
      </div>
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${resolvedParams.locale}/auth/login?redirect=/${resolvedParams.locale}/bots/${resolvedParams.id}/knowledge`);
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

  // Get knowledge sources for this bot
  const { data: knowledgeSources } = await supabase
    .from('knowledge_sources')
    .select('*')
    .eq('bot_id', resolvedParams.id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  return (
    <KnowledgeManagement bot={bot} initialSources={knowledgeSources || []} />
  );
}

