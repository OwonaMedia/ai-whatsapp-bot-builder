import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseAdminClient } from '@/lib/supabaseAdmin';
import { getLogger } from '@/lib/logging/logger';

const logger = getLogger();

type ProviderKey = 'stripe' | 'paypal' | 'mtn-mobile-money' | string;

interface PaymentCredentialRecord {
  provider: ProviderKey;
  environment: string;
  status: 'active' | 'inactive' | 'disabled';
  config: Record<string, any>;
  metadata?: Record<string, any>;
  updated_at?: string;
}

interface CachedConfig {
  record: PaymentCredentialRecord;
  fetchedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 Minuten
const configCache = new Map<ProviderKey, CachedConfig>();

function isCacheValid(entry: CachedConfig | undefined): entry is CachedConfig {
  if (!entry) {
    return false;
  }
  return Date.now() - entry.fetchedAt < CACHE_TTL_MS;
}

async function fetchProviderRecord(
  supabase: SupabaseClient,
  provider: ProviderKey,
): Promise<PaymentCredentialRecord | null> {
  const { data, error } = await supabase
    .from('payment_credentials')
    .select('provider, environment, status, config, metadata, updated_at')
    .eq('provider', provider)
    .maybeSingle();

  if (error) {
    logger.error(
      { provider, error },
      '[Payment Provider Config] Fehler beim Laden aus Supabase.',
    );
    return null;
  }

  if (!data) {
    return null;
  }

  return data as PaymentCredentialRecord;
}

export async function loadPaymentProviderConfig(
  provider: ProviderKey,
  options: { requireActive?: boolean } = {},
): Promise<PaymentCredentialRecord | null> {
  const cached = configCache.get(provider);
  if (isCacheValid(cached)) {
    if (options.requireActive === false || cached.record.status === 'active') {
      return cached.record;
    }
  }

  const supabase = getSupabaseAdminClient();
  const record = await fetchProviderRecord(supabase, provider);

  if (record) {
    configCache.set(provider, { record, fetchedAt: Date.now() });
    if (options.requireActive && record.status !== 'active') {
      logger.warn(
        { provider, status: record.status },
        '[Payment Provider Config] Provider ist nicht aktiv.',
      );
      return null;
    }
  }

  return options.requireActive && record?.status !== 'active' ? null : record;
}

export function patchProcessEnv(vars: Record<string, string | undefined>) {
  Object.entries(vars).forEach(([key, value]) => {
    if (typeof value === 'string' && value.trim().length > 0) {
      process.env[key] = value;
    }
  });
}

export function invalidatePaymentConfig(provider?: ProviderKey) {
  if (provider) {
    configCache.delete(provider);
    return;
  }
  configCache.clear();
}

