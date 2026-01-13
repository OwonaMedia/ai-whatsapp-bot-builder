import { cache } from 'react';
import { cookies, headers } from 'next/headers';

import { createServerSupabaseClient } from '@/lib/supabase-server';

export type TenantRole = 'owner' | 'admin' | 'builder' | 'analyst' | 'viewer';

export interface TenantMetadata {
  defaultLocale?: string | null;
  branding?: Record<string, any> | null;
  settings?: Record<string, any> | null;
}

export interface TenantMembership {
  tenantId: string;
  slug: string;
  name: string;
  role: TenantRole;
  status: 'active' | 'invited' | 'suspended';
  metadata: TenantMetadata;
}

export interface TenantContext {
  active: TenantMembership | null;
  memberships: TenantMembership[];
}

const TENANT_COOKIE_NAME = 'tenant_id';
const ROLE_PRIORITY: Record<TenantRole, number> = {
  owner: 0,
  admin: 1,
  builder: 2,
  analyst: 3,
  viewer: 4,
};

function sortMemberships(memberships: TenantMembership[]): TenantMembership[] {
  return [...memberships].sort((a, b) => {
    const priorityDiff = ROLE_PRIORITY[a.role] - ROLE_PRIORITY[b.role];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    return a.name.localeCompare(b.name);
  });
}

async function fetchMemberships(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  userId: string
): Promise<TenantMembership[]> {
  const { data, error } = await supabase
    .from('tenant_members')
    .select(
      `tenant_id, role, status, tenants!inner (
        id,
        name,
        slug,
        default_locale,
        branding,
        settings
      )`
    )
    .eq('user_id', userId)
    .eq('status', 'active');

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    tenantId: row.tenant_id as string,
    role: row.role as TenantRole,
    status: row.status as TenantMembership['status'],
    slug: row.tenants.slug as string,
    name: row.tenants.name as string,
    metadata: {
      defaultLocale: row.tenants.default_locale,
      branding: row.tenants.branding as Record<string, any> | null,
      settings: row.tenants.settings as Record<string, any> | null,
    },
  }));
}

function resolveActiveMembership(
  memberships: TenantMembership[],
  candidate?: string | null
): TenantMembership | null {
  if (memberships.length === 0) {
    return null;
  }

  if (candidate) {
    const matched = memberships.find((membership) => membership.tenantId === candidate);
    if (matched) {
      return matched;
    }
  }

  const sorted = sortMemberships(memberships);
  return sorted[0] ?? null;
}

export const getTenantContext = cache(async (): Promise<TenantContext> => {
  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user?.id) {
    return { active: null, memberships: [] };
  }

  const membershipList = await fetchMemberships(supabase, session.user.id);
  const sortedMemberships = sortMemberships(membershipList);

  const cookieStore = await cookies();
  const candidateFromCookie = cookieStore.get(TENANT_COOKIE_NAME)?.value;
  const candidateFromHeader = (await headers()).get('x-tenant-id') ?? undefined;
  const candidateFromMetadata = session.user.user_metadata?.defaultTenantId as string | undefined;

  const activeMembership = resolveActiveMembership(sortedMemberships, candidateFromHeader || candidateFromCookie || candidateFromMetadata);

  return {
    active: activeMembership,
    memberships: sortedMemberships,
  };
});

export async function requireTenantContext(): Promise<TenantMembership> {
  const context = await getTenantContext();
  if (!context.active) {
    throw new Error('Aktiver Tenant konnte nicht bestimmt werden.');
  }
  return context.active;
}

export async function setActiveTenantCookie(tenantId: string | null): Promise<void> {
  const cookieStore = await cookies();

  if (!tenantId) {
    cookieStore.delete(TENANT_COOKIE_NAME);
    return;
  }

  cookieStore.set(TENANT_COOKIE_NAME, tenantId, {
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
    secure: true,
    maxAge: 60 * 60 * 24 * 30, // 30 Tage
  });
}

export function getTenantCookieName(): string {
  return TENANT_COOKIE_NAME;
}
