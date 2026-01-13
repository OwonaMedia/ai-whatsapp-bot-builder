import { NextRequest, NextResponse } from 'next/server';

import { logAuditEvent } from '@/lib/monitoring/events';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getTenantContext, setActiveTenantCookie } from '@/lib/tenant/context';

export async function GET() {
  const context = await getTenantContext();
  return NextResponse.json({
    active: context.active,
    memberships: context.memberships,
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: any;
  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const name = (payload?.name ?? '').trim();
  const slug = payload?.slug ? String(payload.slug).trim() : null;
  const region = payload?.region ? String(payload.region).trim() : null;
  const defaultLocale = payload?.defaultLocale ? String(payload.defaultLocale).trim() : null;

  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 422 });
  }

  const { data, error } = await supabase.rpc('create_tenant', {
    p_name: name,
    p_slug: slug,
    p_region: region,
    p_default_locale: defaultLocale,
  });

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create tenant' }, { status: 400 });
  }

  const tenant = {
    id: data.id as string,
    name: data.name as string,
    slug: data.slug as string,
    defaultLocale: data.default_locale as string | null,
    region: data.region as string | null,
  };

  await setActiveTenantCookie(tenant.id);

  await logAuditEvent({
    eventType: 'tenant.created',
    userId: session.user.id,
    tenantId: tenant.id,
    metadata: {
      name: tenant.name,
      slug: tenant.slug,
      region: tenant.region,
      defaultLocale: tenant.defaultLocale,
    },
  });

  return NextResponse.json({ tenant }, { status: 201 });
}
