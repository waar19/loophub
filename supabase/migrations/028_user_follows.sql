-- =====================================================
-- MIGRATION 028: User Following System
-- =====================================================
-- Allows users to follow each other and create social connections
-- =====================================================

-- User follows table
CREATE TABLE IF NOT EXISTS user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_created ON user_follows(created_at DESC);

-- Function to get follower count
CREATE OR REPLACE FUNCTION get_follower_count(p_user_id UUID)
RETURNS INT AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM user_follows WHERE following_id = p_user_id);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get following count
CREATE OR REPLACE FUNCTION get_following_count(p_user_id UUID)
RETURNS INT AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM user_follows WHERE follower_id = p_user_id);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if user A is following user B
CREATE OR REPLACE FUNCTION is_following(p_follower_id UUID, p_following_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_follows 
    WHERE follower_id = p_follower_id AND following_id = p_following_id
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get mutual follows (users who follow each other)
CREATE OR REPLACE FUNCTION get_mutual_follows(p_user_id UUID)
RETURNS TABLE (user_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT following_id
  FROM user_follows
  WHERE follower_id = p_user_id
  AND EXISTS (
    SELECT 1 FROM user_follows uf2
    WHERE uf2.follower_id = user_follows.following_id
    AND uf2.following_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- RLS Policies
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

-- Anyone can view follows (for public profiles)
CREATE POLICY "Anyone can view follows"
  ON user_follows FOR SELECT
  USING (true);

-- Users can follow others
CREATE POLICY "Users can follow others"
  ON user_follows FOR INSERT
  WITH CHECK (
    follower_id = auth.uid()
    AND follower_id != following_id
  );

-- Users can unfollow
CREATE POLICY "Users can unfollow"
  ON user_follows FOR DELETE
  USING (follower_id = auth.uid());

-- Add follow counts to profiles view (if not exists)
-- This will be used in profile queries
CREATE OR REPLACE VIEW profile_stats AS
SELECT 
  p.id,
  p.username,
  p.avatar_url,
  p.bio,
  p.level,
  p.reputation,
  p.created_at,
  get_follower_count(p.id) as follower_count,
  get_following_count(p.id) as following_count,
  (SELECT COUNT(*) FROM threads WHERE user_id = p.id) as thread_count,
  (SELECT COUNT(*) FROM comments WHERE user_id = p.id) as comment_count
FROM profiles p;

-- Trigger to update profile updated_at when follow relationships change
CREATE OR REPLACE FUNCTION update_profile_on_follow()
RETURNS TRIGGER AS $$
BEGIN
  -- Update both follower and following profiles
  UPDATE profiles SET updated_at = NOW() WHERE id = NEW.follower_id;
  UPDATE profiles SET updated_at = NOW() WHERE id = NEW.following_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_follows_update_profiles ON user_follows;
CREATE TRIGGER user_follows_update_profiles
  AFTER INSERT OR DELETE ON user_follows
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_on_follow();

COMMENT ON TABLE user_follows IS 'User following relationships';
COMMENT ON FUNCTION get_follower_count IS 'Get count of users following a specific user';
COMMENT ON FUNCTION get_following_count IS 'Get count of users a specific user is following';
COMMENT ON FUNCTION is_following IS 'Check if user A is following user B';
