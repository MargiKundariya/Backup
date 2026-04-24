'use client';

/**
 * useDeviceSets
 * Manages named device lineups ("My Lineup").
 *
 * - Authenticated: persists to /api/device-sets (Supabase DB)
 * - Unauthenticated: falls back to localStorage
 */

import { useState, useEffect, useCallback } from 'react';
import { getBrowserClient, isSupabaseConfigured } from '@/lib/supabase';

const LS_KEY = 'skinmockup-device-sets';

export interface DeviceSet {
  id: string;
  name: string;
  device_ids: string[];
}

function lsSets(): DeviceSet[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}

function lsSave(sets: DeviceSet[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(sets));
}

export function useDeviceSets() {
  const [sets, setSets] = useState<DeviceSet[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch on mount
  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      // Fall back to localStorage when Supabase isn't configured
      if (!isSupabaseConfigured()) {
        setSets(lsSets());
        return;
      }

      setLoading(true);
      try {
        const sb = getBrowserClient();
        const { data: { session } } = await sb.auth.getSession();

        if (!session) {
          setSets(lsSets());
          return;
        }

        const res = await window.fetch('/api/device-sets', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!cancelled && res.ok) {
          const data = await res.json() as DeviceSet[];
          setSets(data);
        }
      } catch {
        // Network or config error — silently fall back to localStorage
        if (!cancelled) setSets(lsSets());
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, []);

  const saveSet = useCallback(async (name: string, device_ids: string[]) => {
    if (!isSupabaseConfigured()) {
      const newSet: DeviceSet = { id: crypto.randomUUID(), name, device_ids };
      const updated = [...lsSets(), newSet];
      lsSave(updated);
      setSets(updated);
      return;
    }

    try {
      const sb = getBrowserClient();
      const { data: { session } } = await sb.auth.getSession();

      if (!session) {
        const newSet: DeviceSet = { id: crypto.randomUUID(), name, device_ids };
        const updated = [...lsSets(), newSet];
        lsSave(updated);
        setSets(updated);
        return;
      }

      const res = await window.fetch('/api/device-sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ name, device_ids }),
      });
      if (res.ok) {
        const created = await res.json() as DeviceSet;
        setSets((prev) => [created, ...prev]);
      }
    } catch {
      // Fall back to localStorage on error
      const newSet: DeviceSet = { id: crypto.randomUUID(), name, device_ids };
      const updated = [...lsSets(), newSet];
      lsSave(updated);
      setSets(updated);
    }
  }, []);

  const deleteSet = useCallback(async (id: string) => {
    if (!isSupabaseConfigured()) {
      const updated = lsSets().filter((s) => s.id !== id);
      lsSave(updated);
      setSets(updated);
      return;
    }

    try {
      const sb = getBrowserClient();
      const { data: { session } } = await sb.auth.getSession();

      if (!session) {
        const updated = lsSets().filter((s) => s.id !== id);
        lsSave(updated);
        setSets(updated);
        return;
      }

      await window.fetch(`/api/device-sets?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
    } catch { /* ignore */ }

    setSets((prev) => prev.filter((s) => s.id !== id));
  }, []);

  return { sets, loading, saveSet, deleteSet };
}
