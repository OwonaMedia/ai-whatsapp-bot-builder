import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getMonitoringSnapshot } from '@/lib/monitoring/snapshot';
import { isMonitoringAllowed } from '@/lib/monitoring/allowlist';

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 401 });
  }

  if (!user || !isMonitoringAllowed(user.email)) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const daysParam = searchParams.get('days');
  const limitParam = searchParams.get('limit');

  const days = daysParam ? Math.max(1, Math.min(90, Number(daysParam))) : 30;
  const limit = limitParam ? Math.max(10, Math.min(200, Number(limitParam))) : 50;

  try {
    const snapshot = await getMonitoringSnapshot({ days, limit });
    return NextResponse.json(snapshot, { status: 200 });
  } catch (error: any) {
    console.error('[Monitoring API] Failed to load snapshot', error);
    return NextResponse.json(
      { error: 'Failed to load monitoring snapshot', message: error.message },
      { status: 500 }
    );
  }
}


