import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { SupportConfig } from './config.js';
import WebSocket from 'ws';

export type SupportSupabaseClient = SupabaseClient;

if (typeof globalThis.WebSocket === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).WebSocket = WebSocket;
}

export function createSupportSupabase(config: SupportConfig): SupportSupabaseClient {
  const serviceKey = config.SUPABASE_SERVICE_ROLE_KEY;
  const authHeaders = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
  };

  return createClient(config.SUPABASE_SERVICE_URL, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: authHeaders,
    },
    db: {
      schema: 'public',
    },
    realtime: {
      // REALTIME DEAKTIVIERT - Kostenreduzierung ($20/24h Problem)
      // Subscriptions werden nicht mehr verwendet, daher keine Realtime-Konfiguration nötig
      params: {
        apikey: serviceKey,
      },
      headers: authHeaders,
    },
  });
}

