-- 006_stripe_events.sql
-- Stores processed Stripe webhook events for idempotency.
-- Prevents double-crediting on webhook retries.

CREATE TABLE IF NOT EXISTS public.stripe_events (
  id           TEXT        PRIMARY KEY,  -- Stripe event.id (evt_xxx)
  type         TEXT        NOT NULL,     -- e.g. checkout.session.completed
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- No RLS needed — only accessed via service_role in API routes
