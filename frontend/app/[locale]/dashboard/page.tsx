import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import DashboardContent from '@/components/dashboard/DashboardContent';
import { isNextRedirectError } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const IS_BUILD_TIME =
  typeof process !== 'undefined' &&
  process.env.NEXT_PHASE === 'phase-production-build';

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  console.log('[Dashboard] params locale:', locale);
  
  if (IS_BUILD_TIME) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white/40 p-8 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-3 text-sm text-gray-600">
          Während des Builds werden keine Supabase-Abfragen ausgeführt. Im Live-Betrieb erscheinen
          hier deine Bots und KPIs.
        </p>
      </div>
    );
  }

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect(`/${locale}/auth/login?redirect=/${locale}/dashboard`);
    }

  // Get user bots
  const { data: bots, error } = await supabase
    .from('bots')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // ✅ Handle error gracefully - Table might not exist yet
  if (error) {
    console.error('[Dashboard] Error loading bots:', error);
    // If table doesn't exist, return empty array instead of crashing
    if (error.code === 'PGRST205' || error.message?.includes('not find the table')) {
      console.warn('[Dashboard] Bots table does not exist yet. Migration may not have been applied.');
      return (
        <DashboardContent 
          initialBots={[]} 
          userEmail={user.email || ''}
        />
      );
    }
  }

  return (
    <DashboardContent 
      initialBots={bots || []} 
      userEmail={user.email || ''}
    />
  );
  } catch (error: unknown) {
    console.error('[Dashboard] Error initializing Supabase:', error);
    // ✅ FIX: Wenn es ein NEXT_REDIRECT Error ist (z.B. von redirect() in createServerSupabaseClient), 
    // dann weiterwerfen, ansonsten zur Homepage umleiten
    if (isNextRedirectError(error)) {
      throw error; // Weiterwerfen, damit Next.js den Redirect verarbeitet
    }
    // If Supabase is not configured, redirect to home page with error message
    redirect(`/${locale}?error=supabase_not_configured`);
  }
}

