/**
 * Subscription Management Utilities
 * Functions to check subscription limits and features
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient, createRouteHandlerClient } from './supabase';

export type SubscriptionTier = 'free' | 'starter' | 'professional' | 'enterprise';
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trialing' | 'expired';

export interface SubscriptionLimits {
  max_bots: number;
  max_messages_per_month: number;
  max_conversations_per_month: number | null;
  features: {
    analytics_export: boolean;
    api_access: boolean;
    white_label: boolean;
    custom_integrations: boolean;
    funnel_analysis: boolean;
    templates: boolean;
  };
  support_level: 'community' | 'email' | 'priority' | 'dedicated';
}

export interface UserSubscription {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  billing_cycle: 'monthly' | 'yearly';
  current_period_start: string;
  current_period_end: string;
  limits: SubscriptionLimits;
}

export interface UserUsage {
  bots_count: number;
  messages_count: number;
  conversations_count: number;
  month: string;
}

/**
 * Get user's current subscription tier
 */
async function resolveSupabaseClient(): Promise<SupabaseClient> {
  if (typeof window === 'undefined') {
    return createRouteHandlerClient();
  }
  return createClient();
}

export async function getUserSubscriptionTier(userId: string): Promise<SubscriptionTier> {
  const supabase = await resolveSupabaseClient();
  
  const { data, error } = await supabase.rpc('get_user_subscription_tier', {
    user_uuid: userId,
  });

  if (error) {
    console.error('Error getting subscription tier:', error);
    return 'free'; // Default to free on error
  }

  return (data as SubscriptionTier) || 'free';
}

/**
 * Get subscription limits for a tier
 */
export async function getSubscriptionLimits(tier: SubscriptionTier): Promise<SubscriptionLimits | null> {
  const supabase = await resolveSupabaseClient();
  
  const { data, error } = await supabase
    .from('subscription_limits')
    .select('*')
    .eq('tier', tier)
    .single();

  if (error) {
    console.error('Error getting subscription limits:', error);
    return null;
  }

  return {
    max_bots: data.max_bots,
    max_messages_per_month: data.max_messages_per_month,
    max_conversations_per_month: data.max_conversations_per_month,
    features: data.features as SubscriptionLimits['features'],
    support_level: data.support_level,
  };
}

/**
 * Get user's full subscription information
 */
export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  const supabase = await resolveSupabaseClient();
  
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gt('current_period_end', new Date().toISOString())
    .single();

  if (error || !data) {
    // Return free tier as default
    const limits = await getSubscriptionLimits('free');
    if (!limits) return null;
    
    return {
      tier: 'free',
      status: 'active',
      billing_cycle: 'monthly',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
      limits,
    };
  }

  const limits = await getSubscriptionLimits(data.tier as SubscriptionTier);
  if (!limits) return null;

  return {
    tier: data.tier as SubscriptionTier,
    status: data.status as SubscriptionStatus,
    billing_cycle: data.billing_cycle as 'monthly' | 'yearly',
    current_period_start: data.current_period_start,
    current_period_end: data.current_period_end,
    limits,
  };
}

/**
 * Check if user can create a new bot
 * Returns { allowed: boolean, reason?: string }
 */
export async function canCreateBot(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const supabase = await resolveSupabaseClient();
  
  const { data, error } = await supabase.rpc('can_create_bot', {
    user_uuid: userId,
  });

  if (error) {
    console.error('Error checking bot creation limit:', error);
    return { allowed: false, reason: 'Fehler beim Prüfen des Limits' };
  }

  if (!data) {
    // Get subscription to provide better error message
    const subscription = await getUserSubscription(userId);
    if (subscription) {
      const currentBots = await getCurrentBotCount(userId);
      return {
        allowed: false,
        reason: `Sie haben das Limit von ${subscription.limits.max_bots} Bot(s) erreicht. Bitte upgraden Sie Ihren Plan, um mehr Bots zu erstellen.`,
      };
    }
    return { allowed: false, reason: 'Limit erreicht' };
  }

  return { allowed: true };
}

/**
 * Check if user can send a message (monthly limit)
 */
export async function canSendMessage(userId: string): Promise<{ allowed: boolean; reason?: string }> {
  const supabase = await resolveSupabaseClient();
  
  const { data, error } = await supabase.rpc('can_send_message', {
    user_uuid: userId,
  });

  if (error) {
    console.error('Error checking message limit:', error);
    return { allowed: false, reason: 'Fehler beim Prüfen des Limits' };
  }

  if (!data) {
    // Get subscription to provide better error message
    const subscription = await getUserSubscription(userId);
    if (subscription) {
      const usage = await getUserUsage(userId);
      return {
        allowed: false,
        reason: `Sie haben das monatliche Limit von ${subscription.limits.max_messages_per_month} Nachrichten erreicht. Bitte upgraden Sie Ihren Plan.`,
      };
    }
    return { allowed: false, reason: 'Limit erreicht' };
  }

  return { allowed: true };
}

/**
 * Increment message usage counter
 */
export async function incrementMessageUsage(userId: string): Promise<void> {
  const supabase = await resolveSupabaseClient();
  
  const { error } = await supabase.rpc('increment_message_usage', {
    user_uuid: userId,
  });

  if (error) {
    console.error('Error incrementing message usage:', error);
  }
}

/**
 * Get current usage for user
 */
export async function getUserUsage(userId: string): Promise<UserUsage> {
  const supabase = await resolveSupabaseClient();
  
  const { data, error } = await supabase.rpc('get_user_usage', {
    user_uuid: userId,
  });

  if (error || !data || data.length === 0) {
    // Return default usage
    const botCount = await getCurrentBotCount(userId);
    return {
      bots_count: botCount,
      messages_count: 0,
      conversations_count: 0,
      month: new Date().toISOString().substring(0, 7) + '-01',
    };
  }

  return data[0] as UserUsage;
}

/**
 * Check if user has access to a specific feature
 */
export async function hasFeature(userId: string, featureName: string): Promise<boolean> {
  const supabase = await resolveSupabaseClient();
  
  const { data, error } = await supabase.rpc('has_feature', {
    user_uuid: userId,
    feature_name: featureName,
  });

  if (error) {
    console.error('Error checking feature access:', error);
    return false;
  }

  return data === true;
}

/**
 * Get current bot count for user
 */
async function getCurrentBotCount(userId: string): Promise<number> {
  const supabase = await resolveSupabaseClient();
  
  const { count, error } = await supabase
    .from('bots')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .neq('status', 'archived');

  if (error) {
    console.error('Error counting bots:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Get subscription overview for user
 */
export async function getSubscriptionOverview(userId: string) {
  const supabase = await resolveSupabaseClient();
  
  const { data, error } = await supabase
    .from('user_subscription_overview')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error getting subscription overview:', error);
    return null;
  }

  return data;
}

