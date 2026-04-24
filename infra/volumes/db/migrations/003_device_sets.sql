-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 003 — Device Sets ("My Lineup")
-- Vendors save named groups of device IDs they always export to.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.device_sets (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  device_ids  TEXT[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- updated_at trigger
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_device_sets_updated_at') THEN
    CREATE TRIGGER trg_device_sets_updated_at
      BEFORE UPDATE ON public.device_sets
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- RLS — owner only
ALTER TABLE public.device_sets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'device_sets_owner' AND tablename = 'device_sets'
  ) THEN
    CREATE POLICY "device_sets_owner" ON public.device_sets USING (auth.uid() = user_id);
    CREATE POLICY "device_sets_owner_insert" ON public.device_sets
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_device_sets_user ON public.device_sets(user_id);
