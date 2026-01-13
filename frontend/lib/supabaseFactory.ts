import { createBrowserClient, createServerClient } from '@supabase/ssr';
import {
  createClient as createSupabaseCoreClient,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { createSupabaseFetch } from './supabase-fetch';
import { createSupabaseStub } from './supabase-stub';

const argv = typeof process !== 'undefined' && Array.isArray(process.argv) ? process.argv : [];
const isNextBuildCommand = argv.includes('build') && argv.some((arg) => arg.includes('next'));
const isStaticBuild =
  process.env.NEXT_PHASE === 'phase-production-build' ||
  process.env.NEXT_RUNTIME === 'edge-build' ||
  isNextBuildCommand;
const isProduction = process.env.NODE_ENV === 'production';

const RAW_PUBLIC_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || undefined;
const RAW_PUBLIC_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || undefined;
const RAW_SERVICE_URL = (process.env.SUPABASE_SERVICE_URL ?? RAW_PUBLIC_URL)?.trim() || undefined;
const RAW_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || undefined;

type BrowserClient = ReturnType<typeof createBrowserClient>;
type ServerClient = ReturnType<typeof createServerClient>;

const browserSingleton: { client: BrowserClient | null } = { client: null };
const serviceSingleton: { client: SupabaseClient | null } = { client: null };
const adminSingleton: { client: SupabaseClient | null } = { client: null };

let publicValidationWarning: string | null = null;

if (RAW_PUBLIC_ANON_KEY?.startsWith('sbp_')) {
  publicValidationWarning =
    '[Supabase Factory] Service-Role-Key (sbp_*) wurde als NEXT_PUBLIC_SUPABASE_ANON_KEY konfiguriert.';
  console.error(`🚨 ${publicValidationWarning}`);
}

if (!RAW_PUBLIC_URL || !RAW_PUBLIC_ANON_KEY) {
  console.warn(
    '[Supabase Factory] NEXT_PUBLIC_SUPABASE_URL oder NEXT_PUBLIC_SUPABASE_ANON_KEY fehlen. Fallback auf Stub-Clients.',
  );
}

function logStubFallback(context: string, reason: string) {
  console.error(`[Supabase Factory][${context}] ${reason} – verwende Stub-Client.`);
}

type PublicConfig = { supabaseUrl: string; supabaseAnonKey: string };
type ServiceConfig = { supabaseUrl: string; serviceRoleKey: string };

function resolvePublicConfig(context: string, allowStub: boolean): PublicConfig | null {
  if (!RAW_PUBLIC_URL || !RAW_PUBLIC_ANON_KEY) {
    if (allowStub || isProduction) {
      logStubFallback(context, 'Öffentliche Supabase-Konfiguration ist unvollständig.');
      return null;
    }
    throw new Error(
      `[Supabase Factory][${context}] NEXT_PUBLIC_SUPABASE_URL oder NEXT_PUBLIC_SUPABASE_ANON_KEY fehlen.`,
    );
  }
  if (RAW_PUBLIC_ANON_KEY.startsWith('sbp_')) {
    if (allowStub || isProduction) {
      logStubFallback(
        context,
        'Service-Role-Key (sbp_*) darf nicht als Public Key verwendet werden (Sicherheitsrisiko).',
      );
      return null;
    }
    throw new Error(
      `[Supabase Factory][${context}] Service-Role-Key wurde als Public Key konfiguriert. Bitte ANON-Key verwenden.`,
    );
  }
  return { supabaseUrl: RAW_PUBLIC_URL, supabaseAnonKey: RAW_PUBLIC_ANON_KEY };
}

function resolveServiceConfig(context: string, allowStub: boolean): ServiceConfig | null {
  if (!RAW_SERVICE_URL || !RAW_SERVICE_ROLE_KEY) {
    if (allowStub || isProduction) {
      logStubFallback(context, 'Service-Role-Konfiguration ist unvollständig.');
      return null;
    }
    throw new Error(
      `[Supabase Factory][${context}] SUPABASE_SERVICE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlen.`,
    );
  }
  return { supabaseUrl: RAW_SERVICE_URL, serviceRoleKey: RAW_SERVICE_ROLE_KEY };
}

function attachRealtimeParams<T extends Record<string, unknown>>(options: T, apiKey: string) {
  // REALTIME KOMPLETT DEAKTIVIERT - Kosten-Problem
  // Realtime Message Count ist viel zu hoch, Kosten explodieren
  // Lösung: Realtime komplett deaktivieren, nur Polling verwenden
  const result = {
    ...options,
    realtime: {
      enabled: false, // Realtime komplett deaktiviert - KRITISCH für Kostenreduzierung
      params: {
        apikey: apiKey,
      },
    },
  };

  // Warnung nur einmal pro Client-Erstellung ausgeben (nicht bei jedem Aufruf)
  if (!(options as any).__realtimeWarningShown) {
    console.warn('[Supabase Factory] ⚠️ REALTIME KOMPLETT DEAKTIVIERT - Kostenreduzierung. Nur Polling wird verwendet.');
    (result as any).__realtimeWarningShown = true;
  }

  return result;
}

function safeCreateBrowserClient(
  supabaseUrl: string,
  supabaseAnonKey: string,
  context: string,
): BrowserClient {
  try {
    const client = createBrowserClient(
      supabaseUrl,
      supabaseAnonKey,
      attachRealtimeParams(
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
          global: {
            fetch: createSupabaseFetch(),
          },
        },
        supabaseAnonKey,
      ),
    );
    console.log('[Supabase Factory] Browser client erstellt.');
    return client;
  } catch (error) {
    logStubFallback(context, 'Erstellung des Browser-Clients schlug fehl.');
    console.error(error);
    if (!isProduction) {
      throw error;
    }
    return createSupabaseStub() as BrowserClient;
  }
}

function safeCreateServerClient(
  supabaseUrl: string,
  supabaseAnonKey: string,
  context: string,
  cookieStore: Awaited<ReturnType<(typeof import('next/headers'))['cookies']>>,
): ServerClient {
  console.log('[Supabase Factory]', context, '→ createServerClient (attempt)', {
    supabaseUrl: supabaseUrl?.slice(0, 32),
    hasKey: Boolean(supabaseAnonKey),
  });
  try {
    return createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      attachRealtimeParams(
        {
          global: {
            fetch: createSupabaseFetch(),
          },
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },
            setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
              try {
                cookiesToSet.forEach(({ name, value, options }) => {
                  cookieStore.set(name, value, options as any);
                });
              } catch {
                // In Server Components dürfen Cookies nicht gesetzt werden – ignorieren.
              }
            },
          },
        },
        supabaseAnonKey,
      ),
    );
  } catch (error) {
    logStubFallback(context, 'Erstellung des Server-Clients schlug fehl.');
    console.error(error);
    if (!isProduction) {
      throw error;
    }
    return createSupabaseStub() as ServerClient;
  } finally {
    console.log('[Supabase Factory]', context, '→ createServerClient (done)');
  }
}

function safeCreateServiceClient(
  supabaseUrl: string,
  serviceRoleKey: string,
  context: string,
  options: Parameters<typeof createSupabaseCoreClient>[2],
): SupabaseClient {
  console.log('[Supabase Factory]', context, '→ createClient (attempt)', {
    supabaseUrl: supabaseUrl?.slice(0, 32),
    hasKey: Boolean(serviceRoleKey),
  });
  try {
    return createSupabaseCoreClient(supabaseUrl, serviceRoleKey, attachRealtimeParams(options || {}, serviceRoleKey)) as SupabaseClient;
  } catch (error) {
    logStubFallback(context, 'Erstellung des Service-Clients schlug fehl.');
    console.error(error);
    if (!isProduction) {
      throw error;
    }
    return createSupabaseStub() as SupabaseClient;
  } finally {
    console.log('[Supabase Factory]', context, '→ createClient (done)');
  }
}

export function isStaticSupabaseBuild() {
  return isStaticBuild;
}

export function getBrowserSupabaseClient(): BrowserClient {
  if (isStaticBuild || typeof window === 'undefined') {
    return createSupabaseStub() as BrowserClient;
  }

  if (browserSingleton.client) {
    return browserSingleton.client;
  }

  const env = resolvePublicConfig('browser', true);
  if (!env) {
    browserSingleton.client = createSupabaseStub() as BrowserClient;
    return browserSingleton.client;
  }

  browserSingleton.client = safeCreateBrowserClient(env.supabaseUrl, env.supabaseAnonKey, 'browser');
  return browserSingleton.client;
}

export async function getServerComponentSupabaseClient(): Promise<ServerClient> {
  if (isStaticBuild) {
    return createSupabaseStub() as ServerClient;
  }

  const env = resolvePublicConfig('server-component', true);
  if (!env) {
    return createSupabaseStub() as ServerClient;
  }

  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();

  return safeCreateServerClient(env.supabaseUrl, env.supabaseAnonKey, 'server-component', cookieStore);
}

export async function getRouteHandlerSupabaseClient(): Promise<ServerClient> {
  if (isStaticBuild) {
    return createSupabaseStub() as ServerClient;
  }

  const env = resolvePublicConfig('route-handler', true);
  if (!env) {
    return createSupabaseStub() as ServerClient;
  }

  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();

  return safeCreateServerClient(env.supabaseUrl, env.supabaseAnonKey, 'route-handler', cookieStore);
}

export function getServiceRoleSupabaseClient(): SupabaseClient {
  if (isStaticBuild) {
    return createSupabaseStub() as SupabaseClient;
  }

  if (serviceSingleton.client) {
    return serviceSingleton.client;
  }

  const env = resolveServiceConfig('service-singleton', true);
  if (!env) {
    serviceSingleton.client = createSupabaseStub() as SupabaseClient;
    return serviceSingleton.client;
  }

  serviceSingleton.client = safeCreateServiceClient(
    env.supabaseUrl,
    env.serviceRoleKey,
    'service-singleton',
    {
      auth: {
        persistSession: false,
      },
      global: {
        fetch: createSupabaseFetch(),
      },
    },
  );
  return serviceSingleton.client;
}

export function createServiceRoleSupabaseClient(): SupabaseClient {
  if (isStaticBuild) {
    return createSupabaseStub() as SupabaseClient;
  }

  const env = resolveServiceConfig('service-factory', true);
  if (!env) {
    return createSupabaseStub() as SupabaseClient;
  }

  return safeCreateServiceClient(env.supabaseUrl, env.serviceRoleKey, 'service-factory', {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: createSupabaseFetch(),
    },
  });
}

export function createAnonServerSupabaseClient(options?: {
  persistSession?: boolean;
  autoRefreshToken?: boolean;
  detectSessionInUrl?: boolean;
}): SupabaseClient {
  if (isStaticBuild) {
    return createSupabaseStub() as SupabaseClient;
  }

  const env = resolvePublicConfig('anon-server', true);
  if (!env) {
    return createSupabaseStub() as SupabaseClient;
  }

  return safeCreateServiceClient(env.supabaseUrl, env.supabaseAnonKey, 'anon-server', {
    auth: {
      persistSession: options?.persistSession ?? false,
      autoRefreshToken: options?.autoRefreshToken ?? false,
      detectSessionInUrl: options?.detectSessionInUrl ?? false,
    },
    global: {
      fetch: createSupabaseFetch(),
    },
  });
}

export function getAdminSupabaseClient(): SupabaseClient {
  if (isStaticBuild) {
    return createSupabaseStub() as SupabaseClient;
  }

  if (adminSingleton.client) {
    return adminSingleton.client;
  }

  const env = resolveServiceConfig('admin-singleton', true);
  if (!env) {
    adminSingleton.client = createSupabaseStub() as SupabaseClient;
    return adminSingleton.client;
  }

  adminSingleton.client = safeCreateServiceClient(env.supabaseUrl, env.serviceRoleKey, 'admin-singleton', {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: createSupabaseFetch(),
    },
  });
  return adminSingleton.client;
}

export function isStubClient(): boolean {
  return (
    isStaticBuild ||
    !RAW_PUBLIC_URL ||
    !RAW_PUBLIC_ANON_KEY ||
    (typeof window !== 'undefined' && isProduction && publicValidationWarning !== null)
  );
}

export function getConfigStatus() {
  return {
    hasUrl: !!RAW_PUBLIC_URL,
    hasKey: !!RAW_PUBLIC_ANON_KEY,
    isValidKey: RAW_PUBLIC_ANON_KEY ? !RAW_PUBLIC_ANON_KEY.startsWith('sbp_') : false,
    warning: publicValidationWarning,
    isStub: isStubClient(),
    environment: process.env.NODE_ENV,
    phase: process.env.NEXT_PHASE,
  };
}

export function debugConfig() {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('[Supabase Factory] debugConfig() ist nur in Development verfügbar.');
    return;
  }

  const status = getConfigStatus();
  console.group('🔍 Supabase Configuration Debug');
  console.log('URL:', RAW_PUBLIC_URL ? `${RAW_PUBLIC_URL.substring(0, 40)}…` : '❌ fehlt');
  console.log('Anon Key Typ:', RAW_PUBLIC_ANON_KEY ? (RAW_PUBLIC_ANON_KEY.startsWith('eyJ') ? '✅ ANON' : RAW_PUBLIC_ANON_KEY.startsWith('sbp_') ? '🚨 SERVICE ROLE' : '⚠️ unbekannt') : '❌ fehlt');
  console.log('Status:', status);
  console.groupEnd();
}

