/**
 * Supabase client factories.
 *
 * browser  — used in React components / client hooks (singleton)
 * server   — used in API route handlers / Server Components (per-request)
 *
 * Env vars required in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL        http://localhost:8000  (Kong gateway)
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY   <anon JWT from infra/.env>
 *   SUPABASE_SERVICE_ROLE_KEY       <service_role JWT — SERVER ONLY, never expose>
 */

import { createBrowserClient } from '@supabase/ssr';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ── Env vars ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:8000';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Returns true when the required public env vars are present.
 * Use this guard before calling getBrowserClient() in optional features
 * (e.g. device sets, auto-save) so they fail gracefully when the backend
 * isn't configured instead of crashing the whole component tree.
 */
export function isSupabaseConfigured(): boolean {
  return !!SUPABASE_ANON_KEY;
}

// ── Browser client (singleton, safe to call repeatedly) ──────────────────────
// Generic is intentionally untyped here; run `supabase gen types typescript`
// after the stack is up to get full type safety.
let _browserClient: SupabaseClient | null = null;

export function getBrowserClient(): SupabaseClient {
  if (!SUPABASE_ANON_KEY) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and ' +
      'NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (copy from .env.local.example).'
    );
  }
  if (!_browserClient) {
    _browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return _browserClient;
}

// ── Server / API route client (uses service_role to bypass RLS) ──────────────
export function getServiceClient(): SupabaseClient {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in server environment');
  }
  return createClient(SUPABASE_URL, serviceKey, {
    auth: { persistSession: false },
  });
}
