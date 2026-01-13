#!/usr/bin/env ts-node
import { createClient } from '@supabase/supabase-js';

type CheckResult = {
  name: string;
  ok: boolean;
  status?: number;
  durationMs?: number;
  message?: string;
};

const APP_BASE_URL = process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://whatsapp.owona.de';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function runHttpCheck(path: string, name: string): Promise<CheckResult> {
  const url = new URL(path, APP_BASE_URL).toString();
  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'user-agent': 'whatsapp-owona-health-check',
      },
    });
    return {
      name,
      ok: response.ok,
      status: response.status,
      durationMs: Date.now() - startedAt,
      message: response.ok ? undefined : await response.text().catch(() => undefined),
    };
  } catch (error) {
    return {
      name,
      ok: false,
      durationMs: Date.now() - startedAt,
      message: error instanceof Error ? error.message : 'unknown_error',
    };
  }
}

async function runSupabaseCheck(): Promise<CheckResult> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return {
      name: 'Supabase connectivity',
      ok: false,
      message: 'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
    };
  }

  const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    realtime: {
      params: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
      },
    },
  });

  const startedAt = Date.now();
  try {
    const { error } = await client
      .from('bots')
      .select('id', { head: true, count: 'exact' })
      .limit(1);
    if (error) {
      throw error;
    }

    return {
      name: 'Supabase connectivity',
      ok: true,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      name: 'Supabase connectivity',
      ok: false,
      durationMs: Date.now() - startedAt,
      message: error instanceof Error ? error.message : 'unknown_error',
    };
  }
}

async function runStaticAssetCheck(): Promise<CheckResult> {
  const assets = [
    '/payment-logos/visa.svg',
    '/payment-logos/mastercard.svg',
    '/payment-logos/paypal.svg',
    '/payment-logos/stripe.svg',
  ];

  const startedAt = Date.now();
  let failed = 0;
  const failedAssets: string[] = [];

  for (const asset of assets) {
    const url = new URL(asset, APP_BASE_URL).toString();
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: {
          'user-agent': 'whatsapp-owona-health-check',
        },
      });
      if (!response.ok) {
        failed++;
        failedAssets.push(asset);
      }
    } catch (error) {
      failed++;
      failedAssets.push(asset);
    }
  }

  return {
    name: 'Static assets',
    ok: failed === 0,
    durationMs: Date.now() - startedAt,
    message: failed > 0 ? `Missing: ${failedAssets.join(', ')}` : undefined,
  };
}

async function runCriticalRoutesCheck(): Promise<CheckResult> {
  const routes = [
    '/de',
    '/de/dashboard',
    '/de/pricing',
    '/de/contact',
  ];

  const startedAt = Date.now();
  let failed = 0;
  const failedRoutes: string[] = [];

  for (const route of routes) {
    const url = new URL(route, APP_BASE_URL).toString();
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'user-agent': 'whatsapp-owona-health-check',
        },
      });
      // Accept 200, 500 (OpenTelemetry), but not 404
      if (response.status === 404) {
        failed++;
        failedRoutes.push(route);
      }
    } catch (error) {
      failed++;
      failedRoutes.push(route);
    }
  }

  return {
    name: 'Critical routes',
    ok: failed === 0,
    durationMs: Date.now() - startedAt,
    message: failed > 0 ? `404 errors: ${failedRoutes.join(', ')}` : undefined,
  };
}

async function main() {
  const results: CheckResult[] = [];

  results.push(await runHttpCheck('/api/health', 'API health'));
  results.push(await runHttpCheck('/api/monitoring/snapshot', 'Monitoring snapshot API'));
  results.push(await runSupabaseCheck());
  results.push(await runStaticAssetCheck());
  results.push(await runCriticalRoutesCheck());

  const hasFailure = results.some((result) => !result.ok);

  for (const result of results) {
    const status = result.ok ? 'OK' : 'FAIL';
    const duration = typeof result.durationMs === 'number' ? `${result.durationMs}ms` : 'n/a';
    const suffix = result.message ? ` – ${result.message}` : '';
    console.log(`[${status}] ${result.name} (${duration})${suffix}`);
  }

  process.exit(hasFailure ? 1 : 0);
}

main().catch((error) => {
  console.error('[health-check] Unexpected error', error);
  process.exit(1);
});


