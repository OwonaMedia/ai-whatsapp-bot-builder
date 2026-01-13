import type { SupabaseClient } from '@supabase/supabase-js';
import { getAdminSupabaseClient as getAdminSingleton } from './supabaseFactory';

export function getSupabaseAdminClient(): SupabaseClient {
  return getAdminSingleton();
}


