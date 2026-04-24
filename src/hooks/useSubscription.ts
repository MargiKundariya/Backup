'use client';

/**
 * useSubscription
 * Fetches the user's active subscription row from the DB.
 * Falls back gracefully when Supabase isn't configured or user is unauthenticated.
 */

import { useState, useEffect } from 'react';
import { getBrowserClient, isSupabaseConfigured } from '@/lib/supabase';

export interface SubscriptionRow {
  id: string;
  plan_id: string;
  status: 'active' | 'past_due' | 'canceled' | 'unpaid';
  current_period_end: string;
  cancel_at_period_end: boolean;
}

export interface SubscriptionState {
  subscription: SubscriptionRow | null;
  loading: boolean;
  isActive: boolean;
}

export function useSubscription(): SubscriptionState {
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;

    async function fetchSub() {
      setLoading(true);
      try {
        const sb = getBrowserClient();
        const { data: { session } } = await sb.auth.getSession();
        if (!session) return;

        const { data } = await sb
          .from('subscriptions')
          .select('id, plan_id, status, current_period_end, cancel_at_period_end')
          .eq('user_id', session.user.id)
          .eq('status', 'active')
          .maybeSingle();

        if (!cancelled) setSubscription(data ?? null);
      } catch { /* Supabase not running */ }
      finally { if (!cancelled) setLoading(false); }
    }

    fetchSub();
    return () => { cancelled = true; };
  }, []);

  return {
    subscription,
    loading,
    isActive: subscription?.status === 'active',
  };
}
