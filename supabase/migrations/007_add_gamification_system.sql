-- Migration: 007_add_gamification_system.sql
-- Adds gamification features: superlikes, thread hiding, and resource marking
-- Part of the level-based gamification system

-- Add new columns to threads table
ALTER TABLE threads
ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_resource BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS hidden_until TIMESTAMP WITH TIME ZONE;

-- Create superlikes table
CREATE TABLE IF NOT EXISTS superlikes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, thread_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_superlikes_user_id ON superlikes(user_id);
CREATE INDEX IF NOT EXISTS idx_superlikes_thread_id ON superlikes(thread_id);
CREATE INDEX IF NOT EXISTS idx_superlikes_author_id ON superlikes(author_id);
CREATE INDEX IF NOT EXISTS idx_threads_is_hidden ON threads(is_hidden);
CREATE INDEX IF NOT EXISTS idx_threads_is_resource ON threads(is_resource);

-- Create function to increment reputation
CREATE OR REPLACE FUNCTION increment_reputation(user_id UUID, amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles
  SET reputation = reputation + amount
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to auto-unhide threads after 12 hours
CREATE OR REPLACE FUNCTION auto_unhide_threads()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_hidden = TRUE AND NEW.hidden_until IS NOT NULL THEN
    -- Schedule unhiding (in a real implementation, you'd use pg_cron or similar)
    -- For now, we'll rely on application-level checks
    NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-unhiding
DROP TRIGGER IF EXISTS trigger_auto_unhide_threads ON threads;
CREATE TRIGGER trigger_auto_unhide_threads
  AFTER UPDATE OF is_hidden ON threads
  FOR EACH ROW
  WHEN (NEW.is_hidden = TRUE)
  EXECUTE FUNCTION auto_unhide_threads();

-- RLS Policies for superlikes table
ALTER TABLE superlikes ENABLE ROW LEVEL SECURITY;

-- Users can view all superlikes
CREATE POLICY "Superlikes are viewable by everyone"
  ON superlikes FOR SELECT
  USING (true);

-- Users can only create their own superlikes
CREATE POLICY "Users can create their own superlikes"
  ON superlikes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own superlikes
CREATE POLICY "Users can delete their own superlikes"
  ON superlikes FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON superlikes TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE superlikes IS 'Tracks superlikes given to threads, which award +2 karma to authors';
COMMENT ON COLUMN threads.is_hidden IS 'Indicates if thread is temporarily hidden (shadow-hide feature)';
COMMENT ON COLUMN threads.is_resource IS 'Marks thread as a useful resource';
COMMENT ON COLUMN threads.hidden_at IS 'Timestamp when thread was hidden';
COMMENT ON COLUMN threads.hidden_until IS 'Timestamp when thread should be automatically unhidden';
COMMENT ON FUNCTION increment_reputation IS 'Increments user reputation by specified amount (used for superlikes)';
