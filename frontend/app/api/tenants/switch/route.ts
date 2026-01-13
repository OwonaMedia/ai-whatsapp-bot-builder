import { NextRequest, NextResponse } from 'next/server';

import { logAuditEvent } from '@/lib/monitoring/events';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { setActiveTenantCookie } from '@/lib/tenant/context';

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

  const tenantId = payload?.tenantId ? String(payload.tenantId) : null;

  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId is required' }, { status: 422 });
  }

  const { data, error } = await supabase
    .from('tenant_members')
    .select(
      `tenant_id, role, status, tenants!inner (
        name,
        slug,
        default_locale,
        branding,
        settings
      )`
    )
    .eq('tenant_id', tenantId)
    .eq('user_id', session.user.id)
    .eq('status', 'active')
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: 'Tenant membership not found or inactive' }, { status: 403 });
  }

  await setActiveTenantCookie(tenantId);

  await logAuditEvent({
    eventType: 'tenant.switched',
    userId: session.user.id,
    tenantId,
    metadata: {
      role: data.role,
      slug: data.tenants.slug,
    },
  });

  return NextResponse.json({
    active: {
      tenantId,
      name: data.tenants.name,
      slug: data.tenants.slug,
      role: data.role,
      status: data.status,
      metadata: {
        defaultLocale: data.tenants.default_locale,
        branding: data.tenants.branding,
        settings: data.tenants.settings,
      },
    },
  });
}
