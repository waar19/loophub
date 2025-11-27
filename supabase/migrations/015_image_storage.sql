-- Migration: 015_image_storage.sql
-- Description: Sets up Supabase Storage buckets and image tracking

-- Note: Storage buckets are typically created via Supabase Dashboard or CLI
-- This migration creates the tracking table for uploaded images

-- 1. Create uploaded_images table to track all uploads
CREATE TABLE IF NOT EXISTS uploaded_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Storage info
  bucket_name TEXT NOT NULL DEFAULT 'uploads',
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  
  -- Image metadata
  width INTEGER,
  height INTEGER,
  
  -- Usage tracking
  used_in_thread_id UUID REFERENCES threads(id) ON DELETE SET NULL,
  used_in_comment_id UUID REFERENCES comments(id) ON DELETE SET NULL,
  used_in_profile BOOLEAN DEFAULT FALSE,
  
  -- URLs
  public_url TEXT NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_usage CHECK (
    used_in_thread_id IS NOT NULL OR 
    used_in_comment_id IS NOT NULL OR 
    used_in_profile = TRUE OR
    (used_in_thread_id IS NULL AND used_in_comment_id IS NULL AND used_in_profile = FALSE)
  )
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_uploaded_images_user ON uploaded_images(user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_images_thread ON uploaded_images(used_in_thread_id) WHERE used_in_thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_uploaded_images_comment ON uploaded_images(used_in_comment_id) WHERE used_in_comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_uploaded_images_created ON uploaded_images(created_at DESC);

-- 3. Enable RLS
ALTER TABLE uploaded_images ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DROP POLICY IF EXISTS "Users can view all images" ON uploaded_images;
CREATE POLICY "Users can view all images"
  ON uploaded_images FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can upload own images" ON uploaded_images;
CREATE POLICY "Users can upload own images"
  ON uploaded_images FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own images" ON uploaded_images;
CREATE POLICY "Users can update own images"
  ON uploaded_images FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own images" ON uploaded_images;
CREATE POLICY "Users can delete own images"
  ON uploaded_images FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Function to get user's storage usage
CREATE OR REPLACE FUNCTION get_user_storage_usage(p_user_id UUID)
RETURNS TABLE (
  total_files INTEGER,
  total_size_bytes BIGINT,
  total_size_mb NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_files,
    COALESCE(SUM(file_size), 0)::BIGINT as total_size_bytes,
    ROUND(COALESCE(SUM(file_size), 0) / 1024.0 / 1024.0, 2) as total_size_mb
  FROM uploaded_images
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to get user's recent images
CREATE OR REPLACE FUNCTION get_user_images(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  file_name TEXT,
  file_size INTEGER,
  mime_type TEXT,
  public_url TEXT,
  created_at TIMESTAMPTZ,
  used_in_thread_id UUID,
  used_in_comment_id UUID,
  used_in_profile BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ui.id,
    ui.file_name,
    ui.file_size,
    ui.mime_type,
    ui.public_url,
    ui.created_at,
    ui.used_in_thread_id,
    ui.used_in_comment_id,
    ui.used_in_profile
  FROM uploaded_images ui
  WHERE ui.user_id = p_user_id
  ORDER BY ui.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function to clean up orphaned images (not used anywhere for 24h+)
CREATE OR REPLACE FUNCTION cleanup_orphaned_images()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM uploaded_images
    WHERE used_in_thread_id IS NULL
      AND used_in_comment_id IS NULL
      AND used_in_profile = FALSE
      AND created_at < NOW() - INTERVAL '24 hours'
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Grant permissions
GRANT EXECUTE ON FUNCTION get_user_storage_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_images(UUID, INTEGER, INTEGER) TO authenticated;

-- Note: Run cleanup_orphaned_images() periodically via cron job or Edge Function
