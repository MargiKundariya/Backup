-- ─────────────────────────────────────────────────────────────────────────────
-- SkinMockup application schema
-- Applied on first container start via docker-entrypoint-initdb.d
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Migration tracking (created here so migrate.sh can use it on fresh DBs) ──
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  id          TEXT PRIMARY KEY,
  applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Mark 001 as applied — its content is this file (init/00-schema.sql)
INSERT INTO public.schema_migrations (id) VALUES ('001_initial_schema.sql')
ON CONFLICT (id) DO NOTHING;

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
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  device_id   TEXT NOT NULL,
  zone_designs JSONB NOT NULL DEFAULT '{}',   -- Record<zoneId, ZoneDesign>
  export_options JSONB NOT NULL DEFAULT '{}',
  thumbnail   TEXT,                           -- storage path
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Design queue (saved batch queues) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.design_queues (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT 'Queue',
  items       JSONB NOT NULL DEFAULT '[]',    -- { name, storageKey }[]
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── User preferences ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  presets     JSONB NOT NULL DEFAULT '[]',    -- TransformPreset[]
  recent_devices TEXT[] NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── updated_at trigger ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_designs_updated_at
  BEFORE UPDATE ON public.designs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_design_queues_updated_at
  BEFORE UPDATE ON public.design_queues
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE public.projects          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.designs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.design_queues     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences  ENABLE ROW LEVEL SECURITY;

-- Projects: owner only
CREATE POLICY "projects_owner" ON public.projects
  USING (auth.uid() = user_id);
CREATE POLICY "projects_owner_insert" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Designs: owner only
CREATE POLICY "designs_owner" ON public.designs
  USING (auth.uid() = user_id);
CREATE POLICY "designs_owner_insert" ON public.designs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Design queues: owner only
CREATE POLICY "design_queues_owner" ON public.design_queues
  USING (auth.uid() = user_id);
CREATE POLICY "design_queues_owner_insert" ON public.design_queues
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User preferences: owner only
CREATE POLICY "user_prefs_owner" ON public.user_preferences
  USING (auth.uid() = user_id);
CREATE POLICY "user_prefs_owner_insert" ON public.user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_designs_project ON public.designs(project_id);
CREATE INDEX IF NOT EXISTS idx_designs_user    ON public.designs(user_id);
CREATE INDEX IF NOT EXISTS idx_design_queues_user ON public.design_queues(user_id);
