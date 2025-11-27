-- Migration: 016_bookmarks.sql
-- Description: Adds bookmark/favorites functionality for threads

-- 1. Create bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate bookmarks
  UNIQUE(user_id, thread_id)
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_thread ON bookmarks(thread_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_created ON bookmarks(created_at DESC);

-- 3. Enable RLS
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DROP POLICY IF EXISTS "Users can view own bookmarks" ON bookmarks;
CREATE POLICY "Users can view own bookmarks"
  ON bookmarks FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create bookmarks" ON bookmarks;
CREATE POLICY "Users can create bookmarks"
  ON bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own bookmarks" ON bookmarks;
CREATE POLICY "Users can delete own bookmarks"
  ON bookmarks FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Function to toggle bookmark (add/remove)
CREATE OR REPLACE FUNCTION toggle_bookmark(p_user_id UUID, p_thread_id UUID)
RETURNS TABLE (
  bookmarked BOOLEAN,
  bookmark_id UUID
) AS $$
DECLARE
  existing_bookmark_id UUID;
BEGIN
  -- Check if bookmark exists
  SELECT id INTO existing_bookmark_id
  FROM bookmarks
  WHERE user_id = p_user_id AND thread_id = p_thread_id;
  
  IF existing_bookmark_id IS NOT NULL THEN
    -- Remove bookmark
    DELETE FROM bookmarks WHERE id = existing_bookmark_id;
    RETURN QUERY SELECT FALSE, NULL::UUID;
  ELSE
    -- Add bookmark
    INSERT INTO bookmarks (user_id, thread_id)
    VALUES (p_user_id, p_thread_id)
    RETURNING id INTO existing_bookmark_id;
    RETURN QUERY SELECT TRUE, existing_bookmark_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to check if user has bookmarked a thread
CREATE OR REPLACE FUNCTION is_bookmarked(p_user_id UUID, p_thread_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM bookmarks
    WHERE user_id = p_user_id AND thread_id = p_thread_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function to get user's bookmarked threads with details
CREATE OR REPLACE FUNCTION get_user_bookmarks(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  bookmark_id UUID,
  bookmarked_at TIMESTAMPTZ,
  thread_id UUID,
  thread_title TEXT,
  thread_content TEXT,
  thread_created_at TIMESTAMPTZ,
  thread_user_id UUID,
  thread_forum_id UUID,
  thread_upvotes INTEGER,
  thread_downvotes INTEGER,
  forum_name TEXT,
  forum_slug TEXT,
  author_username TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id as bookmark_id,
    b.created_at as bookmarked_at,
    t.id as thread_id,
    t.title as thread_title,
    LEFT(t.content, 200) as thread_content,
    t.created_at as thread_created_at,
    t.user_id as thread_user_id,
    t.forum_id as thread_forum_id,
    t.upvotes as thread_upvotes,
    t.downvotes as thread_downvotes,
    f.name as forum_name,
    f.slug as forum_slug,
    p.username as author_username
  FROM bookmarks b
  JOIN threads t ON b.thread_id = t.id
  JOIN forums f ON t.forum_id = f.id
  LEFT JOIN profiles p ON t.user_id = p.id
  WHERE b.user_id = p_user_id
  ORDER BY b.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Function to get bookmark count for a thread
CREATE OR REPLACE FUNCTION get_thread_bookmark_count(p_thread_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*)::INTEGER FROM bookmarks WHERE thread_id = p_thread_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Grant permissions
GRANT EXECUTE ON FUNCTION toggle_bookmark(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_bookmarked(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_bookmarks(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_thread_bookmark_count(UUID) TO authenticated;
