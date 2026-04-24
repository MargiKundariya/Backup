-- 005_trial_credits_trigger.sql
-- Grants 25 trial credits (30-day expiry) to every new user on signup.
-- Triggered by an INSERT on auth.users via a Postgres trigger.

-- ─── Grant trial credits function ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.grant_trial_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.credits (user_id, amount, type, reference_id, expires_at)
  VALUES (
    NEW.id,
    25,
    'trial',
    'trial_' || NEW.id::TEXT,
    NOW() + INTERVAL '30 days'
  )
  ON CONFLICT (reference_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ─── Trigger on auth.users ────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_trial_credits();
