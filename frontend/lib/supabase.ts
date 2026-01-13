import {
  createAnonServerSupabaseClient,
  createServiceRoleSupabaseClient,
  getBrowserSupabaseClient,
  getRouteHandlerSupabaseClient,
} from './supabaseFactory';

export function createClient() {
  return getBrowserSupabaseClient();
}

export async function createRouteHandlerClient() {
  return getRouteHandlerSupabaseClient();
}

export async function createServerSupabaseClient() {
  return getRouteHandlerSupabaseClient();
}

export function createBackgroundAnonClient() {
  return createAnonServerSupabaseClient();
}

export function createServiceRoleClient() {
  return createServiceRoleSupabaseClient();
}

