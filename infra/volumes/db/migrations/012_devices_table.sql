-- Migration 012 — Devices table
-- Unified table for built-in and user-uploaded device templates.

CREATE TABLE IF NOT EXISTS public.devices (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  brand        TEXT NOT NULL,
  category     TEXT NOT NULL CHECK (category IN ('phone', 'tablet', 'laptop', 'watch')),
  template_path TEXT NOT NULL,  -- stores file path or data URL
  dimensions   JSONB NOT NULL, -- {width, height}
  zones        JSONB NOT NULL DEFAULT '[]',
  is_custom    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster filtering
CREATE INDEX IF NOT EXISTS idx_devices_category ON public.devices(category);
CREATE INDEX IF NOT EXISTS idx_devices_brand ON public.devices(brand);

-- updated_at trigger
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_devices_updated_at') THEN
    CREATE TRIGGER trg_devices_updated_at
      BEFORE UPDATE ON public.devices
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;
