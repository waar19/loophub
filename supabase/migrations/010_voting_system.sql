-- Migration 010: Upgrade Likes to Full Voting System (Upvote/Downvote)
-- This migration transforms the existing likes system into a complete voting system

-- 1. Rename 'likes' table to 'votes' for clarity
ALTER TABLE likes RENAME TO votes;

-- 2. Add vote_type column to distinguish upvotes from downvotes
-- 1 = upvote, -1 = downvote
ALTER TABLE votes ADD COLUMN IF NOT EXISTS vote_type SMALLINT NOT NULL DEFAULT 1;

-- Add constraint to ensure vote_type is only 1 or -1
ALTER TABLE votes ADD CONSTRAINT check_vote_type CHECK (vote_type IN (1, -1));

-- 3. Add downvote_count columns to threads and comments
ALTER TABLE threads ADD COLUMN IF NOT EXISTS downvote_count INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS downvote_count INTEGER DEFAULT 0 NOT NULL;

-- Rename like_count to upvote_count for clarity (optional, keeps compatibility)
ALTER TABLE threads RENAME COLUMN like_count TO upvote_count;
ALTER TABLE comments RENAME COLUMN like_count TO upvote_count;

-- 4. Add calculated score columns (upvotes - downvotes)
ALTER TABLE threads ADD COLUMN IF NOT EXISTS score INTEGER GENERATED ALWAYS AS (upvote_count - downvote_count) STORED;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS score INTEGER GENERATED ALWAYS AS (upvote_count - downvote_count) STORED;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_votes_user_thread ON votes(user_id, thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_votes_user_comment ON votes(user_id, comment_id) WHERE comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_votes_vote_type ON votes(vote_type);
CREATE INDEX IF NOT EXISTS idx_threads_score ON threads(score DESC);
CREATE INDEX IF NOT EXISTS idx_comments_score ON comments(score DESC);

-- 6. Drop old indexes from 'likes' table (now 'votes')
DROP INDEX IF EXISTS idx_likes_user_id;
DROP INDEX IF EXISTS idx_likes_thread_id;
DROP INDEX IF EXISTS idx_likes_comment_id;

-- Create new indexes with proper names
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_thread_id ON votes(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_votes_comment_id ON votes(comment_id) WHERE comment_id IS NOT NULL;

-- 7. Update RLS policies (rename from 'likes' to 'votes')
DROP POLICY IF EXISTS "Likes are viewable by everyone" ON votes;
DROP POLICY IF EXISTS "Users can like content" ON votes;
DROP POLICY IF EXISTS "Users can unlike their own likes" ON votes;

CREATE POLICY "Votes are viewable by everyone"
  ON votes FOR SELECT
  USING (true);

CREATE POLICY "Users can vote on content"
  ON votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can change their own votes"
  ON votes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can remove their own votes"
  ON votes FOR DELETE
  USING (auth.uid() = user_id);

-- 8. Create function to update vote counts (replaces old like count function)
CREATE OR REPLACE FUNCTION update_thread_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment appropriate counter
    IF NEW.vote_type = 1 THEN
      UPDATE threads SET upvote_count = upvote_count + 1 WHERE id = NEW.thread_id;
    ELSE
      UPDATE threads SET downvote_count = downvote_count + 1 WHERE id = NEW.thread_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- User changed their vote (upvote to downvote or vice versa)
    IF OLD.vote_type != NEW.vote_type THEN
      IF NEW.vote_type = 1 THEN
        -- Changed from downvote to upvote
        UPDATE threads 
        SET upvote_count = upvote_count + 1, 
            downvote_count = downvote_count - 1 
        WHERE id = NEW.thread_id;
      ELSE
        -- Changed from upvote to downvote
        UPDATE threads 
        SET upvote_count = upvote_count - 1, 
            downvote_count = downvote_count + 1 
        WHERE id = NEW.thread_id;
      END IF;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement appropriate counter
    IF OLD.vote_type = 1 THEN
      UPDATE threads SET upvote_count = GREATEST(upvote_count - 1, 0) WHERE id = OLD.thread_id;
    ELSE
      UPDATE threads SET downvote_count = GREATEST(downvote_count - 1, 0) WHERE id = OLD.thread_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_comment_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment appropriate counter
    IF NEW.vote_type = 1 THEN
      UPDATE comments SET upvote_count = upvote_count + 1 WHERE id = NEW.comment_id;
    ELSE
      UPDATE comments SET downvote_count = downvote_count + 1 WHERE id = NEW.comment_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- User changed their vote
    IF OLD.vote_type != NEW.vote_type THEN
      IF NEW.vote_type = 1 THEN
        UPDATE comments 
        SET upvote_count = upvote_count + 1, 
            downvote_count = downvote_count - 1 
        WHERE id = NEW.comment_id;
      ELSE
        UPDATE comments 
        SET upvote_count = upvote_count - 1, 
            downvote_count = downvote_count + 1 
        WHERE id = NEW.comment_id;
      END IF;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement appropriate counter
    IF OLD.vote_type = 1 THEN
      UPDATE comments SET upvote_count = GREATEST(upvote_count - 1, 0) WHERE id = OLD.comment_id;
    ELSE
      UPDATE comments SET downvote_count = GREATEST(downvote_count - 1, 0) WHERE id = OLD.comment_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 9. Drop old triggers and create new ones
DROP TRIGGER IF EXISTS update_thread_like_count_trigger ON votes;
DROP TRIGGER IF EXISTS update_comment_like_count_trigger ON votes;

-- Separate triggers for INSERT/UPDATE and DELETE (WHEN clause issue)
CREATE TRIGGER update_thread_vote_counts_trigger_insert_update
  AFTER INSERT OR UPDATE ON votes
  FOR EACH ROW
  WHEN (NEW.thread_id IS NOT NULL)
  EXECUTE FUNCTION update_thread_vote_counts();

CREATE TRIGGER update_thread_vote_counts_trigger_delete
  AFTER DELETE ON votes
  FOR EACH ROW
  WHEN (OLD.thread_id IS NOT NULL)
  EXECUTE FUNCTION update_thread_vote_counts();

CREATE TRIGGER update_comment_vote_counts_trigger_insert_update
  AFTER INSERT OR UPDATE ON votes
  FOR EACH ROW
  WHEN (NEW.comment_id IS NOT NULL)
  EXECUTE FUNCTION update_comment_vote_counts();

CREATE TRIGGER update_comment_vote_counts_trigger_delete
  AFTER DELETE ON votes
  FOR EACH ROW
  WHEN (OLD.comment_id IS NOT NULL)
  EXECUTE FUNCTION update_comment_vote_counts();

-- 10. Update karma triggers to handle upvotes and downvotes
-- Drop existing like-based karma triggers
DROP TRIGGER IF EXISTS award_karma_for_thread_like ON votes;
DROP TRIGGER IF EXISTS remove_karma_for_thread_unlike ON votes;
DROP TRIGGER IF EXISTS award_karma_for_comment_like ON votes;
DROP TRIGGER IF EXISTS remove_karma_for_comment_unlike ON votes;

-- Create new karma functions for voting
CREATE OR REPLACE FUNCTION update_karma_for_thread_vote()
RETURNS TRIGGER AS $$
DECLARE
  thread_author_id UUID;
  karma_change INTEGER;
BEGIN
  -- Get the thread author
  SELECT user_id INTO thread_author_id FROM threads WHERE id = COALESCE(NEW.thread_id, OLD.thread_id);
  
  IF TG_OP = 'INSERT' THEN
    karma_change := NEW.vote_type; -- +1 for upvote, -1 for downvote
    UPDATE profiles SET karma = karma + karma_change WHERE id = thread_author_id;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Vote changed from upvote to downvote or vice versa
    IF OLD.vote_type != NEW.vote_type THEN
      karma_change := (NEW.vote_type - OLD.vote_type); -- Will be +2 or -2
      UPDATE profiles SET karma = karma + karma_change WHERE id = thread_author_id;
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    karma_change := -OLD.vote_type; -- Reverse the karma
    UPDATE profiles SET karma = GREATEST(karma + karma_change, 0) WHERE id = thread_author_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_karma_for_comment_vote()
RETURNS TRIGGER AS $$
DECLARE
  comment_author_id UUID;
  karma_change INTEGER;
BEGIN
  -- Get the comment author
  SELECT user_id INTO comment_author_id FROM comments WHERE id = COALESCE(NEW.comment_id, OLD.comment_id);
  
  IF TG_OP = 'INSERT' THEN
    karma_change := NEW.vote_type;
    UPDATE profiles SET karma = karma + karma_change WHERE id = comment_author_id;
    
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.vote_type != NEW.vote_type THEN
      karma_change := (NEW.vote_type - OLD.vote_type);
      UPDATE profiles SET karma = karma + karma_change WHERE id = comment_author_id;
    END IF;
    
  ELSIF TG_OP = 'DELETE' THEN
    karma_change := -OLD.vote_type;
    UPDATE profiles SET karma = GREATEST(karma + karma_change, 0) WHERE id = comment_author_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for karma
CREATE TRIGGER update_karma_for_thread_vote_trigger_insert_update
  AFTER INSERT OR UPDATE ON votes
  FOR EACH ROW
  WHEN (NEW.thread_id IS NOT NULL)
  EXECUTE FUNCTION update_karma_for_thread_vote();

CREATE TRIGGER update_karma_for_thread_vote_trigger_delete
  AFTER DELETE ON votes
  FOR EACH ROW
  WHEN (OLD.thread_id IS NOT NULL)
  EXECUTE FUNCTION update_karma_for_thread_vote();

CREATE TRIGGER update_karma_for_comment_vote_trigger_insert_update
  AFTER INSERT OR UPDATE ON votes
  FOR EACH ROW
  WHEN (NEW.comment_id IS NOT NULL)
  EXECUTE FUNCTION update_karma_for_comment_vote();

CREATE TRIGGER update_karma_for_comment_vote_trigger_delete
  AFTER DELETE ON votes
  FOR EACH ROW
  WHEN (OLD.comment_id IS NOT NULL)
  EXECUTE FUNCTION update_karma_for_comment_vote();

-- 11. Add helpful comments
COMMENT ON TABLE votes IS 'Stores user votes (upvotes and downvotes) on threads and comments';
COMMENT ON COLUMN votes.vote_type IS 'Type of vote: 1 for upvote, -1 for downvote';
COMMENT ON COLUMN threads.upvote_count IS 'Number of upvotes received';
COMMENT ON COLUMN threads.downvote_count IS 'Number of downvotes received';
COMMENT ON COLUMN threads.score IS 'Net score: upvotes - downvotes (calculated column)';
COMMENT ON COLUMN comments.upvote_count IS 'Number of upvotes received';
COMMENT ON COLUMN comments.downvote_count IS 'Number of downvotes received';
COMMENT ON COLUMN comments.score IS 'Net score: upvotes - downvotes (calculated column)';

-- 12. Migrate existing data (all existing likes become upvotes)
-- This is safe because all existing records will have vote_type = 1 (default)
-- UPDATE votes SET vote_type = 1 WHERE vote_type IS NULL;
-- Not needed since we added DEFAULT 1

-- Done! The migration is complete.
-- Next steps:
-- 1. Update API endpoint (/api/likes -> /api/votes or update logic)
-- 2. Create VoteButtons component
-- 3. Update UI to show upvote/downvote buttons
-- 4. Update translations
