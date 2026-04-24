'use client';

import { useState, useEffect, useCallback } from 'react';

export interface CreditHistoryRow {
  id: string;
  amount: number;
  type: 'purchase' | 'trial' | 'refund' | 'consume';
  reference_id: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface CreditsState {
  balance: number;
  history: CreditHistoryRow[];
  loading: boolean;
  confirmed: boolean;
  refresh: () => void;
}

export function useCredits(): CreditsState {
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState<CreditHistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function fetchBalance() {
      setLoading(true);
      try {
        const res = await fetch('/api/credits');
        if (cancelled) return;
        
        if (res.ok) {
          const data = await res.json() as { balance: number; history: CreditHistoryRow[] };
          setBalance(data.balance);
          setHistory(data.history || []);
          setConfirmed(true);
        }
      } catch (err) {
        console.error('[useCredits] Failed to fetch balance', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchBalance();
    return () => { cancelled = true; };
  }, [tick]);

  return { balance, history, loading, confirmed, refresh };
}
