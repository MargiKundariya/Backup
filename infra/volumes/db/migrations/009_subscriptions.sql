-- 009_subscriptions.sql
-- Tracks active Stripe subscriptions (recurring billing).
-- A user with an active subscription row is granted credits monthly via webhook.

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id  TEXT        NOT NULL,
  stripe_sub_id       TEXT        NOT NULL UNIQUE,   -- Stripe subscription.id (sub_xxx)
  plan_id             TEXT        NOT NULL,           -- matches SubscriptionPlan.id in stripe.ts
  status              TEXT        NOT NULL            -- active | past_due | canceled | unpaid
                      CHECK (status IN ('active', 'past_due', 'canceled', 'unpaid')),
  current_period_end  TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN    NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription
DROP POLICY IF EXISTS "subscriptions: owner read" ON public.subscriptions;
CREATE POLICY "subscriptions: owner read"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- All writes go through service_role (API routes only)

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_subscriptions_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_subscriptions_updated_at();
