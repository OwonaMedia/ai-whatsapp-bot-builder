import { NextRequest, NextResponse } from 'next/server';

import { logAuditEvent } from '@/lib/monitoring/events';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getTenantContext, requireTenantContext } from '@/lib/tenant/context';

const ALLOWED_CREATOR_ROLES = new Set(['owner', 'admin', 'builder']);

export async function GET() {
  const tenant = await requireTenantContext();
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from('integration_accounts')
    .select(
      `id, name, environment, status, metadata, health_status, last_health_check_at,
      provider:integration_providers(provider_key, display_name, category)`
    )
    .eq('tenant_id', tenant.tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ accounts: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const context = await getTenantContext();

  if (!context.active) {
    return NextResponse.json({ error: 'Tenant context missing' }, { status: 400 });
  }

  if (!ALLOWED_CREATOR_ROLES.has(context.active.role)) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  let payload: any;
  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const providerKey = payload?.providerKey ? String(payload.providerKey) : '';
  const name = payload?.name ? String(payload.name) : '';
  const environment = payload?.environment ? String(payload.environment) : 'production';
  const status = payload?.status ? String(payload.status) : 'inactive';
  const metadata = (payload?.metadata ?? {}) as Record<string, any>;
  const encryptedCredentialsBase64 = payload?.encryptedCredentials ? String(payload.encryptedCredentials) : null;

  if (!providerKey || !name) {
    return NextResponse.json({ error: 'providerKey and name are required' }, { status: 422 });
  }

  const { data: provider, error: providerError } = await supabase
    .from('integration_providers')
    .select('id, provider_key, display_name')
    .eq('provider_key', providerKey)
    .maybeSingle();

  if (providerError || !provider) {
    return NextResponse.json({ error: 'integration provider not found' }, { status: 404 });
  }

  let encryptedCredentials: Buffer | null = null;
  if (encryptedCredentialsBase64) {
    try {
      encryptedCredentials = Buffer.from(encryptedCredentialsBase64, 'base64');
    } catch (error) {
      return NextResponse.json({ error: 'encryptedCredentials must be base64 encoded' }, { status: 422 });
    }
  }

  const { data, error } = await supabase
    .from('integration_accounts')
    .insert({
      tenant_id: context.active.tenantId,
      provider_id: provider.id,
      name,
      environment,
      status,
      metadata,
      encrypted_credentials: encryptedCredentials,
    })
    .select(
      `id, name, environment, status, metadata, health_status, last_health_check_at,
      provider:integration_providers(provider_key, display_name, category)`
    )
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Failed to create integration account' }, { status: 400 });
  }

  await logAuditEvent({
    eventType: 'integration.account.created',
    userId: session.user.id,
    tenantId: context.active.tenantId,
    metadata: {
      providerKey,
      name,
      environment,
      status,
    },
  });

  return NextResponse.json({ account: data }, { status: 201 });
}
