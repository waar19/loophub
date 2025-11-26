-- Migration 012: Nested Comments (Threaded Replies)
-- Adds parent_id to enable Reddit-style threaded conversations

-- 1. Add parent_id column to comments table
ALTER TABLE comments 
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES comments(id) ON DELETE CASCADE;

-- 2. Add index for parent_id lookups (get all replies to a comment)
CREATE INDEX IF NOT EXISTS idx_comments_parent_id 
  ON comments(parent_id) 
  WHERE parent_id IS NOT NULL;

-- 3. Add composite index for thread + parent queries
CREATE INDEX IF NOT EXISTS idx_comments_thread_parent 
  ON comments(thread_id, parent_id, created_at DESC);

-- 4. Add depth column to track nesting level (denormalized for performance)
ALTER TABLE comments 
  ADD COLUMN IF NOT EXISTS depth INTEGER DEFAULT 0 CHECK (depth >= 0 AND depth <= 5);

-- 5. Function to calculate comment depth
CREATE OR REPLACE FUNCTION calculate_comment_depth(p_parent_id UUID)
RETURNS INTEGER AS $$
DECLARE
  parent_depth INTEGER;
BEGIN
  IF p_parent_id IS NULL THEN
    RETURN 0;
  END IF;
  
  SELECT depth INTO parent_depth
  FROM comments
  WHERE id = p_parent_id;
  
  -- Limit maximum depth to 5 levels
  RETURN LEAST(COALESCE(parent_depth, 0) + 1, 5);
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger to automatically set depth on insert/update
CREATE OR REPLACE FUNCTION set_comment_depth()
RETURNS TRIGGER AS $$
BEGIN
  NEW.depth = calculate_comment_depth(NEW.parent_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_comment_set_depth ON comments;
CREATE TRIGGER on_comment_set_depth
  BEFORE INSERT OR UPDATE OF parent_id ON comments
  FOR EACH ROW
  EXECUTE FUNCTION set_comment_depth();

-- 7. Function to get comment tree recursively
CREATE OR REPLACE FUNCTION get_comment_tree(p_thread_id UUID, p_parent_id UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  thread_id UUID,
  user_id UUID,
  parent_id UUID,
  content TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  upvote_count INTEGER,
  downvote_count INTEGER,
  score INTEGER,
  depth INTEGER,
  username TEXT,
  avatar_url TEXT,
  user_reputation INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE comment_tree AS (
    -- Base case: get top-level comments or replies to specific parent
    SELECT 
      c.id,
      c.thread_id,
      c.user_id,
      c.parent_id,
      c.content,
      c.created_at,
      c.updated_at,
      c.upvote_count,
      c.downvote_count,
      c.score,
      c.depth,
      p.username,
      p.avatar_url,
      p.reputation as user_reputation,
      ARRAY[c.created_at] as path
    FROM comments c
    LEFT JOIN profiles p ON c.user_id = p.id
    WHERE c.thread_id = p_thread_id
      AND c.parent_id IS NOT DISTINCT FROM p_parent_id
    
    UNION ALL
    
    -- Recursive case: get replies to comments we've already found
    SELECT 
      c.id,
      c.thread_id,
      c.user_id,
      c.parent_id,
      c.content,
      c.created_at,
      c.updated_at,
      c.upvote_count,
      c.downvote_count,
      c.score,
      c.depth,
      p.username,
      p.avatar_url,
      p.reputation as user_reputation,
      ct.path || c.created_at
    FROM comments c
    INNER JOIN comment_tree ct ON c.parent_id = ct.id
    LEFT JOIN profiles p ON c.user_id = p.id
    WHERE c.depth <= 5  -- Safety limit
  )
  SELECT 
    ct.id,
    ct.thread_id,
    ct.user_id,
    ct.parent_id,
    ct.content,
    ct.created_at,
    ct.updated_at,
    ct.upvote_count,
    ct.downvote_count,
    ct.score,
    ct.depth,
    ct.username,
    ct.avatar_url,
    ct.user_reputation
  FROM comment_tree ct
  ORDER BY ct.path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Update notify_thread_author_on_comment to handle replies
CREATE OR REPLACE FUNCTION notify_thread_author_on_comment()
RETURNS TRIGGER AS $$
DECLARE
  thread_author_id UUID;
  parent_comment_author_id UUID;
  thread_title TEXT;
  commenter_username TEXT;
BEGIN
  -- Get thread info
  SELECT user_id, title INTO thread_author_id, thread_title
  FROM threads
  WHERE id = NEW.thread_id;
  
  -- Get commenter username
  SELECT username INTO commenter_username
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- If this is a reply to another comment, notify that comment's author
  IF NEW.parent_id IS NOT NULL THEN
    SELECT user_id INTO parent_comment_author_id
    FROM comments
    WHERE id = NEW.parent_id;
    
    -- Notify parent comment author (if not replying to yourself)
    IF parent_comment_author_id IS NOT NULL AND parent_comment_author_id != NEW.user_id THEN
      PERFORM create_notification(
        parent_comment_author_id,
        'reply',
        'Nueva respuesta a tu comentario',
        COALESCE(commenter_username, 'Alguien') || ' respondió a tu comentario en "' || thread_title || '"',
        '/thread/' || NEW.thread_id || '#comment-' || NEW.id,
        NEW.thread_id,
        NEW.id,
        NEW.user_id
      );
    END IF;
  ELSE
    -- Top-level comment: notify thread author (if not commenting on your own thread)
    IF thread_author_id IS NOT NULL AND thread_author_id != NEW.user_id THEN
      PERFORM create_notification(
        thread_author_id,
        'comment',
        'Nuevo comentario en tu hilo',
        COALESCE(commenter_username, 'Alguien') || ' comentó en "' || thread_title || '"',
        '/thread/' || NEW.thread_id || '#comment-' || NEW.id,
        NEW.thread_id,
        NEW.id,
        NEW.user_id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Function to get reply count for a comment
CREATE OR REPLACE FUNCTION get_reply_count(p_comment_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM comments
    WHERE parent_id = p_comment_id
  );
END;
$$ LANGUAGE plpgsql;

-- 10. Add column to track reply count (denormalized for performance)
ALTER TABLE comments 
  ADD COLUMN IF NOT EXISTS reply_count INTEGER DEFAULT 0;

-- 11. Function to update reply count
CREATE OR REPLACE FUNCTION update_parent_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment parent's reply count
    IF NEW.parent_id IS NOT NULL THEN
      UPDATE comments
      SET reply_count = reply_count + 1
      WHERE id = NEW.parent_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement parent's reply count
    IF OLD.parent_id IS NOT NULL THEN
      UPDATE comments
      SET reply_count = GREATEST(reply_count - 1, 0)
      WHERE id = OLD.parent_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_comment_update_reply_count ON comments;
CREATE TRIGGER on_comment_update_reply_count
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_parent_reply_count();

-- 12. Update existing comments to have correct reply counts
UPDATE comments c
SET reply_count = (
  SELECT COUNT(*)::INTEGER
  FROM comments r
  WHERE r.parent_id = c.id
);

-- Migration complete: Nested comments with threaded replies
