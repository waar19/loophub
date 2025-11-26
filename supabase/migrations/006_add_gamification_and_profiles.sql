-- LoopHub Gamification & Enhanced Profiles Migration
-- Run this in your Supabase SQL Editor

-- 1. Add new columns to profiles table
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS reputation INTEGER DEFAULT 0 NOT NULL;

-- 2. Create likes table
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES threads(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure a user can only like a thread or comment once
  UNIQUE(user_id, thread_id),
  UNIQUE(user_id, comment_id),
  
  -- Ensure that either thread_id or comment_id is set, but not both
  CONSTRAINT check_like_target CHECK (
    (thread_id IS NOT NULL AND comment_id IS NULL) OR
    (thread_id IS NULL AND comment_id IS NOT NULL)
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_thread_id ON likes(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_likes_comment_id ON likes(comment_id) WHERE comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_reputation ON profiles(reputation DESC);

-- Add like counts to threads and comments (for faster queries)
ALTER TABLE threads 
  ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0 NOT NULL;

ALTER TABLE comments 
  ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0 NOT NULL;

-- Enable RLS on likes table
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- Likes policies
CREATE POLICY "Likes are viewable by everyone"
  ON likes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create likes"
  ON likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes"
  ON likes FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Function to increment reputation when receiving a like
CREATE OR REPLACE FUNCTION increment_reputation_on_like()
RETURNS TRIGGER AS $$
DECLARE
  content_author_id UUID;
BEGIN
  -- Get the author of the liked content
  IF NEW.thread_id IS NOT NULL THEN
    SELECT user_id INTO content_author_id FROM threads WHERE id = NEW.thread_id;
  ELSIF NEW.comment_id IS NOT NULL THEN
    SELECT user_id INTO content_author_id FROM comments WHERE id = NEW.comment_id;
  END IF;
  
  -- Increment reputation if author exists (and isn't liking their own content)
  IF content_author_id IS NOT NULL AND content_author_id != NEW.user_id THEN
    UPDATE profiles 
    SET reputation = reputation + 1
    WHERE id = content_author_id;
  END IF;
  
  -- Increment like count
  IF NEW.thread_id IS NOT NULL THEN
    UPDATE threads SET like_count = like_count + 1 WHERE id = NEW.thread_id;
  ELSIF NEW.comment_id IS NOT NULL THEN
    UPDATE comments SET like_count = like_count + 1 WHERE id = NEW.comment_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Function to decrement reputation when removing a like
CREATE OR REPLACE FUNCTION decrement_reputation_on_unlike()
RETURNS TRIGGER AS $$
DECLARE
  content_author_id UUID;
BEGIN
  -- Get the author of the unliked content
  IF OLD.thread_id IS NOT NULL THEN
    SELECT user_id INTO content_author_id FROM threads WHERE id = OLD.thread_id;
  ELSIF OLD.comment_id IS NOT NULL THEN
    SELECT user_id INTO content_author_id FROM comments WHERE id = OLD.comment_id;
  END IF;
  
  -- Decrement reputation if author exists (and isn't unliking their own content)
  IF content_author_id IS NOT NULL AND content_author_id != OLD.user_id THEN
    UPDATE profiles 
    SET reputation = reputation - 1
    WHERE id = content_author_id;
  END IF;
  
  -- Decrement like count
  IF OLD.thread_id IS NOT NULL THEN
    UPDATE threads SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.thread_id;
  ELSIF OLD.comment_id IS NOT NULL THEN
    UPDATE comments SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.comment_id;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create triggers
DROP TRIGGER IF EXISTS on_like_created ON likes;
CREATE TRIGGER on_like_created
  AFTER INSERT ON likes
  FOR EACH ROW EXECUTE FUNCTION increment_reputation_on_like();

DROP TRIGGER IF EXISTS on_like_deleted ON likes;
CREATE TRIGGER on_like_deleted
  AFTER DELETE ON likes
  FOR EACH ROW EXECUTE FUNCTION decrement_reputation_on_unlike();

-- 6. Update existing like counts (migration helper)
UPDATE threads SET like_count = (
  SELECT COUNT(*) FROM likes WHERE thread_id = threads.id
);

UPDATE comments SET like_count = (
  SELECT COUNT(*) FROM likes WHERE comment_id = comments.id
);

-- 7. Policy for updating profile settings
CREATE POLICY "Users can update own profile settings"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
