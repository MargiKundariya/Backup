-- 014_user_extended_details.sql
-- Adds address, company_name, phone_number, and logo_url to public.users

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT;
