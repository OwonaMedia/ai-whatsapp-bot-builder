import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceRoleSupabaseClient } from './supabaseFactory';

export function getServiceSupabaseClient(): SupabaseClient {
  return getServiceRoleSupabaseClient();
}
