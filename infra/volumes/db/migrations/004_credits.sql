-- 004_credits.sql
-- Credit ledger: tracks all credit transactions per user.
-- Each row is immutable — credits are never updated, only inserted.
-- Balance = SUM(amount) per user, excluding expired trial credits.

-- ─── Credits table ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.credits (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Positive = credit added (purchase / trial / refund)
  -- Negative = credit consumed (consume)
  amount       INTEGER     NOT NULL,
  type         TEXT        NOT NULL CHECK (type IN ('purchase', 'trial', 'refund', 'consume')),
  -- For idempotency: Stripe payment_intent_id, export job ID, etc.
  reference_id TEXT        UNIQUE,
  -- Trial credits expire; purchased/refund/consume rows have NULL expires_at
  expires_at   TIMESTAMPTZ DEFAULT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Row-Level Security ───────────────────────────────────────────────────────
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;

-- Users can only read their own credits
DROP POLICY IF EXISTS "credits: owner read" ON public.credits;
CREATE POLICY "credits: owner read"
  ON public.credits FOR SELECT
  USING (auth.uid() = user_id);

-- No direct client INSERT/UPDATE/DELETE — all mutations go through API routes
-- using the service_role client (bypasses RLS intentionally).

-- ─── credit_balance view ──────────────────────────────────────────────────────
-- Returns current spendable balance per user.
-- Excludes expired trial credits (expired_at < NOW()).
CREATE OR REPLACE VIEW public.credit_balance AS
SELECT
  user_id,
  COALESCE(SUM(amount), 0)::INTEGER AS balance
FROM public.credits
WHERE
  -- Include all non-expired rows
  (expires_at IS NULL OR expires_at > NOW())
GROUP BY user_id;

-- ─── Atomic credit deduction function ────────────────────────────────────────
-- Raises an exception if the user's balance is insufficient.
-- Inserts a negative 'consume' row and returns the new balance.
-- Must be called inside a transaction.
CREATE OR REPLACE FUNCTION public.deduct_credits(
  p_user_id    UUID,
  p_amount     INTEGER,
  p_reference  TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Lock the user's credit rows for this transaction
  PERFORM 1
  FROM public.credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Compute current spendable balance
  SELECT COALESCE(SUM(amount), 0)
  INTO v_balance
  FROM public.credits
  WHERE user_id = p_user_id
    AND (expires_at IS NULL OR expires_at > NOW());

  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient credits: balance=%, required=%', v_balance, p_amount;
  END IF;

  -- Insert consume row
  INSERT INTO public.credits (user_id, amount, type, reference_id)
  VALUES (p_user_id, -p_amount, 'consume', p_reference);

  v_new_balance := v_balance - p_amount;
  RETURN v_new_balance;
END;
$$;
