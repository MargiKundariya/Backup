-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 001 — Initial application schema
-- This is the same content applied by init/00-schema.sql on container first-run.
-- Listed here so migrate.sh can track it in schema_migrations.
-- All statements use IF NOT EXISTS / OR REPLACE so this is safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── schema_migrations tracking table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  id          TEXT PRIMARY KEY,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Projects ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.projects (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT 'Untitled Project',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Designs ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.designs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id     UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  device_id      TEXT NOT NULL,
  zone_designs   JSONB NOT NULL DEFAULT '{}',
  export_options JSONB NOT NULL DEFAULT '{}',
  thumbnail      TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Design queue ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.design_queues (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT 'Queue',
  items       JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── User preferences ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  presets         JSONB NOT NULL DEFAULT '[]',
  recent_devices  TEXT[] NOT NULL DEFAULT '{}',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── updated_at trigger ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_projects_updated_at') THEN
    CREATE TRIGGER trg_projects_updated_at
      BEFORE UPDATE ON public.projects
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_designs_updated_at') THEN
    CREATE TRIGGER trg_designs_updated_at
      BEFORE UPDATE ON public.designs
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_design_queues_updated_at') THEN
    CREATE TRIGGER trg_design_queues_updated_at
      BEFORE UPDATE ON public.design_queues
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE public.projects         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.designs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_queues    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'projects_owner' AND tablename = 'projects') THEN
    CREATE POLICY "projects_owner" ON public.projects USING (auth.uid() = user_id);
    CREATE POLICY "projects_owner_insert" ON public.projects FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'designs_owner' AND tablename = 'designs') THEN
    CREATE POLICY "designs_owner" ON public.designs USING (auth.uid() = user_id);
    CREATE POLICY "designs_owner_insert" ON public.designs FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'design_queues_owner' AND tablename = 'design_queues') THEN
    CREATE POLICY "design_queues_owner" ON public.design_queues USING (auth.uid() = user_id);
    CREATE POLICY "design_queues_owner_insert" ON public.design_queues FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_prefs_owner' AND tablename = 'user_preferences') THEN
    CREATE POLICY "user_prefs_owner" ON public.user_preferences USING (auth.uid() = user_id);
    CREATE POLICY "user_prefs_owner_insert" ON public.user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_designs_project    ON public.designs(project_id);
CREATE INDEX IF NOT EXISTS idx_designs_user       ON public.designs(user_id);
CREATE INDEX IF NOT EXISTS idx_design_queues_user ON public.design_queues(user_id);
