-- 013_device_approval.sql
-- Adds ownership and approval status to the devices table.

ALTER TABLE public.devices
  ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for performance on visibility queries
CREATE INDEX IF NOT EXISTS idx_devices_owner ON public.devices(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_devices_approved ON public.devices(is_approved);

-- Backfill existing devices as approved (visible to all)
UPDATE public.devices SET is_approved = TRUE;
