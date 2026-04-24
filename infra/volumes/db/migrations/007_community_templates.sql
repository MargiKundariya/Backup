-- 007_community_templates.sql
-- Community-contributed device templates pending admin review.

CREATE TABLE IF NOT EXISTS public.community_templates (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Submitted template metadata
  device_name  TEXT        NOT NULL,
  brand        TEXT        NOT NULL,
  category     TEXT        NOT NULL CHECK (category IN ('phone', 'tablet', 'laptop', 'watch')),
  storage_key  TEXT        NOT NULL,  -- path in Supabase Storage (community-templates bucket)
  -- Zone definitions as JSON (same shape as DeviceTemplate.zones)
  zones        JSONB       NOT NULL DEFAULT '[]',
  -- Review workflow
  status       TEXT        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewer_note TEXT       DEFAULT NULL,
  reviewed_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at  TIMESTAMPTZ DEFAULT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row-Level Security
ALTER TABLE public.community_templates ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can submit
DROP POLICY IF EXISTS "community_templates: owner read" ON public.community_templates;
CREATE POLICY "community_templates: owner read"
  ON public.community_templates FOR SELECT
  USING (auth.uid() = user_id OR status = 'approved');

-- Only admins (via service_role in API routes) can update status

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_community_templates_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS community_templates_updated_at ON public.community_templates;
CREATE TRIGGER community_templates_updated_at
  BEFORE UPDATE ON public.community_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_community_templates_updated_at();
