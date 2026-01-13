import { NextResponse } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('integration_providers')
    .select('provider_key, display_name, category, description, docs_url, capabilities')
    .order('display_name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ providers: data ?? [] });
}
