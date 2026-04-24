-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 002 — Supabase Storage: design-images bucket + RLS
-- ─────────────────────────────────────────────────────────────────────────────

-- Create the private bucket for zone design images.
-- Storage path layout: design-images/{userId}/{designId}/{zoneId}.webp
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'design-images',
  'design-images',
  false,                                          -- private: signed URLs required
  10485760,                                       -- 10 MB per file
  ARRAY['image/webp', 'image/png', 'image/jpeg']
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects (Supabase enables it by default; belt-and-braces).
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Owner-only SELECT (download via signed URL)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'storage_design_images_owner_select'
      AND tablename = 'objects'
      AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "storage_design_images_owner_select"
      ON storage.objects FOR SELECT
      USING (
        bucket_id = 'design-images'
        AND auth.uid()::text = (string_to_array(name, '/'))[1]
      );
  END IF;
END $$;

-- Owner-only INSERT (upload)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'storage_design_images_owner_insert'
      AND tablename = 'objects'
      AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "storage_design_images_owner_insert"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'design-images'
        AND auth.uid()::text = (string_to_array(name, '/'))[1]
      );
  END IF;
END $$;

-- Owner-only UPDATE (upsert re-upload)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'storage_design_images_owner_update'
      AND tablename = 'objects'
      AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "storage_design_images_owner_update"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'design-images'
        AND auth.uid()::text = (string_to_array(name, '/'))[1]
      );
  END IF;
END $$;

-- Owner-only DELETE (clean up on design deletion)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'storage_design_images_owner_delete'
      AND tablename = 'objects'
      AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "storage_design_images_owner_delete"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'design-images'
        AND auth.uid()::text = (string_to_array(name, '/'))[1]
      );
  END IF;
END $$;
