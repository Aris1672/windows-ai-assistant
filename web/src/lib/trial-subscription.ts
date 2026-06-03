// web/src/lib/trial-subscription.ts
// Helper functions for checking trial/subscription status

import { SupabaseClient } from '@supabase/supabase-js';

export interface SubscriptionStatus {
  status: 'trial' | 'active' | 'cancelled' | 'expired';
  daysLeft: number | null;
  trialEndedAt: string | null;
  subscriptionEndsAt: string | null;
  isValid: boolean; // true if trial or active, false if expired/cancelled
}

/**
 * Get user's current subscription status
 */
export async function getUserSubscriptionStatus(
  supabase: SupabaseClient,
  userId: string
): Promise<SubscriptionStatus> {
  const { data, error } = await supabase
    .from('users')
    .select(
      'subscription_status, trial_ended_at, subscription_ended_at, subscription_ends_at'
    )
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Failed to fetch subscription status:', error);
    return {
      status: 'expired',
      daysLeft: null,
      trialEndedAt: null,
      subscriptionEndsAt: null,
      isValid: false,
    };
  }

  const now = new Date();
  const status = data.subscription_status as 'trial' | 'active' | 'cancelled' | 'expired';

  let daysLeft = null;
  let endDate = null;

  if (status === 'trial' && data.trial_ended_at) {
    endDate = new Date(data.trial_ended_at);
    daysLeft = Math.ceil(
      (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
  } else if (status === 'active' && data.subscription_ends_at) {
    endDate = new Date(data.subscription_ends_at);
    daysLeft = Math.ceil(
      (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  const isValid = status === 'trial' || status === 'active';

  return {
    status,
    daysLeft: daysLeft && daysLeft < 0 ? 0 : daysLeft,
    trialEndedAt: data.trial_ended_at,
    subscriptionEndsAt: data.subscription_ends_at,
    isValid,
  };
}

/**
 * Mark user's trial as expired if trial_ended_at has passed
 * Returns true if status was changed to 'expired'
 */
export async function markTrialExpiredIfNeeded(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error: selectError } = await supabase
    .from('users')
    .select('subscription_status, trial_ended_at')
    .eq('id', userId)
    .single();

  if (selectError) {
    console.error('Failed to check trial status:', selectError);
    return false;
  }

  const now = new Date();
  const trialEndedAt = new Date(data.trial_ended_at);

  if (
    data.subscription_status === 'trial' &&
    trialEndedAt < now
  ) {
    const { error: updateError } = await supabase
      .from('users')
      .update({ subscription_status: 'expired' })
      .eq('id', userId);

    if (updateError) {
      console.error('Failed to mark trial as expired:', updateError);
      return false;
    }

    return true;
  }

  return false;
}

/**
 * Check if a subscription has expired and mark it if needed
 * Returns true if status was changed to 'expired'
 */
export async function markSubscriptionExpiredIfNeeded(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error: selectError } = await supabase
    .from('users')
    .select('subscription_status, subscription_ends_at')
    .eq('id', userId)
    .single();

  if (selectError) {
    console.error('Failed to check subscription status:', selectError);
    return false;
  }

  const now = new Date();
  const subscriptionEndsAt = new Date(data.subscription_ends_at);

  if (
    data.subscription_status === 'active' &&
    subscriptionEndsAt < now
  ) {
    const { error: updateError } = await supabase
      .from('users')
      .update({ subscription_status: 'expired' })
      .eq('id', userId);

    if (updateError) {
      console.error('Failed to mark subscription as expired:', updateError);
      return false;
    }

    return true;
  }

  return false;
}

/**
 * Activate a subscription for a user (called when they pay)
 */
export async function activateSubscription(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const now = new Date();
  const subscriptionEndsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

  const { error } = await supabase
    .from('users')
    .update({
      subscription_status: 'active',
      subscription_started_at: now.toISOString(),
      subscription_ends_at: subscriptionEndsAt.toISOString(),
      last_payment_at: now.toISOString(),
      tokens_used_this_month: 0, // Reset monthly tokens
    })
    .eq('id', userId);

  if (error) {
    console.error('Failed to activate subscription:', error);
    return false;
  }

  return true;
}

/**
 * Check if user has an active/valid trial or subscription
 * Used as middleware to block expired users
 */
export async function isUserAccessValid(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  // Mark expired if needed
  await markTrialExpiredIfNeeded(supabase, userId);
  await markSubscriptionExpiredIfNeeded(supabase, userId);

  // Check current status
  const status = await getUserSubscriptionStatus(supabase, userId);
  return status.isValid;
}

/**
 * Get trial end date formatted for email (e.g., "June 15, 2026")
 */
export function formatTrialEndDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Calculate days remaining (used for UI display)
 */
export function getDaysRemaining(endDateString: string): number {
  const endDate = new Date(endDateString);
  const now = new Date();
  const daysLeft = Math.ceil(
    (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  return daysLeft < 0 ? 0 : daysLeft;
}
