-- 010_licenses.sql
-- Windows Desktop Licensing System
-- License keys for offline desktop app with machine-bound activation

-- Licenses table: one row per license key sold
CREATE TABLE IF NOT EXISTS licenses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key           TEXT NOT NULL UNIQUE,        -- "XXXX-XXXX-XXXX-XXXX" format
  tier          TEXT NOT NULL CHECK (tier IN ('individual', 'studio', 'agency')),
  max_seats     INT  NOT NULL DEFAULT 1,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked')),
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id      TEXT,                        -- Stripe checkout session or order reference
  notes         TEXT,                        -- Admin notes
  expires_at    TIMESTAMPTZ,                 -- NULL = perpetual
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- License activations: one row per machine activation
CREATE TABLE IF NOT EXISTS license_activations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id      UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  machine_id      TEXT NOT NULL,             -- SHA-256 of hardware fingerprint
  machine_label   TEXT,                      -- Human-readable (OS username + hostname)
  token_jti       TEXT NOT NULL UNIQUE,      -- JWT id — used for revocation
  activated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_heartbeat  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deactivated_at  TIMESTAMPTZ,               -- NULL = still active
  UNIQUE (license_id, machine_id)            -- one activation per machine per license
);

-- License events audit log
CREATE TABLE IF NOT EXISTS license_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id  UUID NOT NULL REFERENCES licenses(id) ON DELETE CASCADE,
  event       TEXT NOT NULL,                 -- 'activated', 'deactivated', 'heartbeat', 'revoked', 'suspended'
  machine_id  TEXT,
  ip_address  TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_license_activations_license ON license_activations(license_id);
CREATE INDEX IF NOT EXISTS idx_license_activations_machine ON license_activations(machine_id);
CREATE INDEX IF NOT EXISTS idx_license_activations_jti     ON license_activations(token_jti);
CREATE INDEX IF NOT EXISTS idx_license_events_license      ON license_events(license_id);
CREATE INDEX IF NOT EXISTS idx_licenses_key                ON licenses(key);
CREATE INDEX IF NOT EXISTS idx_licenses_owner              ON licenses(owner_user_id);

-- View: seat usage per license
CREATE OR REPLACE VIEW license_seat_usage AS
SELECT
  l.id,
  l.key,
  l.tier,
  l.max_seats,
  l.status,
  COUNT(a.id) FILTER (WHERE a.deactivated_at IS NULL) AS active_seats,
  l.max_seats - COUNT(a.id) FILTER (WHERE a.deactivated_at IS NULL) AS seats_remaining
FROM licenses l
LEFT JOIN license_activations a ON a.license_id = l.id
GROUP BY l.id;

-- RLS: users can see their own licenses
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_activations ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_events ENABLE ROW LEVEL SECURITY;

-- Policies for licenses
DROP POLICY IF EXISTS "owner can view license" ON licenses;
CREATE POLICY "owner can view license" ON licenses
  FOR SELECT USING (owner_user_id = auth.uid());

-- Policies for activations (owner of the license can see activations)
DROP POLICY IF EXISTS "owner can view activations" ON license_activations;
CREATE POLICY "owner can view activations" ON license_activations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM licenses l
      WHERE l.id = license_activations.license_id
        AND l.owner_user_id = auth.uid()
    )
  );

-- Service role bypasses RLS — used by API routes

-- Function: activate_license (atomic, prevents race conditions)
-- Returns: the activation row id and a signed token payload
CREATE OR REPLACE FUNCTION activate_license(
  p_key        TEXT,
  p_machine_id TEXT,
  p_label      TEXT DEFAULT NULL,
  p_jti        TEXT DEFAULT gen_random_uuid()::text
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_license     licenses%ROWTYPE;
  v_active_seats INT;
  v_activation  license_activations%ROWTYPE;
BEGIN
  -- Lock the license row to prevent concurrent over-activation
  SELECT * INTO v_license
  FROM licenses
  WHERE key = p_key
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'license_not_found');
  END IF;

  IF v_license.status != 'active' THEN
    RETURN jsonb_build_object('error', 'license_' || v_license.status);
  END IF;

  IF v_license.expires_at IS NOT NULL AND v_license.expires_at < NOW() THEN
    RETURN jsonb_build_object('error', 'license_expired');
  END IF;

  -- Check if this machine is already activated (allow re-activation)
  SELECT * INTO v_activation
  FROM license_activations
  WHERE license_id = v_license.id
    AND machine_id = p_machine_id
    AND deactivated_at IS NULL;

  IF FOUND THEN
    -- Re-activation: update heartbeat and jti
    UPDATE license_activations
    SET last_heartbeat = NOW(),
        token_jti      = p_jti,
        machine_label  = COALESCE(p_label, machine_label)
    WHERE id = v_activation.id;

    INSERT INTO license_events (license_id, event, machine_id, metadata)
    VALUES (v_license.id, 'reactivated', p_machine_id, jsonb_build_object('jti', p_jti));

    RETURN jsonb_build_object(
      'ok', true,
      'activation_id', v_activation.id,
      'license_id',    v_license.id,
      'tier',          v_license.tier,
      'reactivated',   true
    );
  END IF;

  -- Count current active seats
  SELECT COUNT(*) INTO v_active_seats
  FROM license_activations
  WHERE license_id = v_license.id
    AND deactivated_at IS NULL;

  IF v_active_seats >= v_license.max_seats THEN
    RETURN jsonb_build_object(
      'error',       'seats_exhausted',
      'max_seats',   v_license.max_seats,
      'active_seats', v_active_seats
    );
  END IF;

  -- Create new activation
  INSERT INTO license_activations (license_id, machine_id, machine_label, token_jti)
  VALUES (v_license.id, p_machine_id, p_label, p_jti)
  RETURNING * INTO v_activation;

  INSERT INTO license_events (license_id, event, machine_id, metadata)
  VALUES (v_license.id, 'activated', p_machine_id, jsonb_build_object('jti', p_jti));

  RETURN jsonb_build_object(
    'ok',            true,
    'activation_id', v_activation.id,
    'license_id',    v_license.id,
    'tier',          v_license.tier,
    'reactivated',   false
  );
END;
$$;

-- Function: deactivate_license
CREATE OR REPLACE FUNCTION deactivate_license(
  p_key        TEXT,
  p_machine_id TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_license    licenses%ROWTYPE;
  v_activation license_activations%ROWTYPE;
BEGIN
  SELECT * INTO v_license FROM licenses WHERE key = p_key;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'license_not_found');
  END IF;

  SELECT * INTO v_activation
  FROM license_activations
  WHERE license_id = v_license.id
    AND machine_id = p_machine_id
    AND deactivated_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'activation_not_found');
  END IF;

  UPDATE license_activations
  SET deactivated_at = NOW()
  WHERE id = v_activation.id;

  INSERT INTO license_events (license_id, event, machine_id)
  VALUES (v_license.id, 'deactivated', p_machine_id);

  RETURN jsonb_build_object('ok', true);
END;
$$;

-- updated_at trigger for licenses
CREATE OR REPLACE FUNCTION update_license_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS licenses_updated_at ON licenses;
CREATE TRIGGER licenses_updated_at
  BEFORE UPDATE ON licenses
  FOR EACH ROW EXECUTE FUNCTION update_license_updated_at();
