-- 011_users_auth.sql
-- Native auth schema: replaces Supabase GoTrue (auth.users).
-- public.users  — stores accounts with hashed passwords
-- public.sessions — tracks active JWT sessions for revocation

-- ── Extensions (idempotent) ───────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  role          TEXT        NOT NULL DEFAULT 'user'
                CHECK (role IN ('user', 'super_admin')),
  full_name     TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- ── Sessions ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sessions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_jti  TEXT        NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user     ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_jti      ON public.sessions(token_jti);
CREATE INDEX IF NOT EXISTS idx_sessions_expires  ON public.sessions(expires_at);

-- ── updated_at trigger for users ──────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Seed: default super_admin (change password after first login!) ─────────────
-- Password: Admin@1234  (bcrypt hash)
INSERT INTO public.users (email, password_hash, role, full_name)
VALUES (
  'admin@skinmockup.com',
  '$2b$12$CjQDytrBtmKNEnRzK1pOp.uWge7e/BNH9CKX9cXPA1DnqfBWnawle',
  'super_admin',
  'Super Admin'
) ON CONFLICT (email) DO NOTHING;

-- ── Recreate FK references to point to public.users instead of auth.users ──────
-- NOTE: Only run this if the tables exist AND previously referenced auth.users.
-- The IF EXISTS guards make this safe to re-run.

-- projects
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'projects_user_id_fkey'
      AND table_name = 'projects'
  ) THEN
    ALTER TABLE public.projects DROP CONSTRAINT projects_user_id_fkey;
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- designs
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'designs_user_id_fkey'
      AND table_name = 'designs'
  ) THEN
    ALTER TABLE public.designs DROP CONSTRAINT designs_user_id_fkey;
    ALTER TABLE public.designs
      ADD CONSTRAINT designs_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- design_queues
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'design_queues_user_id_fkey'
      AND table_name = 'design_queues'
  ) THEN
    ALTER TABLE public.design_queues DROP CONSTRAINT design_queues_user_id_fkey;
    ALTER TABLE public.design_queues
      ADD CONSTRAINT design_queues_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- user_preferences
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_preferences_user_id_fkey'
      AND table_name = 'user_preferences'
  ) THEN
    ALTER TABLE public.user_preferences DROP CONSTRAINT user_preferences_user_id_fkey;
    ALTER TABLE public.user_preferences
      ADD CONSTRAINT user_preferences_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- credits
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'credits_user_id_fkey'
      AND table_name = 'credits'
  ) THEN
    ALTER TABLE public.credits DROP CONSTRAINT credits_user_id_fkey;
    ALTER TABLE public.credits
      ADD CONSTRAINT credits_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- device_sets
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'device_sets_user_id_fkey'
      AND table_name = 'device_sets'
  ) THEN
    ALTER TABLE public.device_sets DROP CONSTRAINT device_sets_user_id_fkey;
    ALTER TABLE public.device_sets
      ADD CONSTRAINT device_sets_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- subscriptions
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'subscriptions_user_id_fkey'
      AND table_name = 'subscriptions'
  ) THEN
    ALTER TABLE public.subscriptions DROP CONSTRAINT subscriptions_user_id_fkey;
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- licenses
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'licenses_owner_user_id_fkey'
      AND table_name = 'licenses'
  ) THEN
    ALTER TABLE public.licenses DROP CONSTRAINT licenses_owner_user_id_fkey;
    ALTER TABLE public.licenses
      ADD CONSTRAINT licenses_owner_user_id_fkey
      FOREIGN KEY (owner_user_id) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ── Cleanup expired sessions (run periodically via cron or on startup) ─────────
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.sessions WHERE expires_at < NOW();
END;
$$;
