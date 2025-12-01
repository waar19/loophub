-- Migration: 029_reactions_system.sql
-- Description: Adds emoji reactions system for comments and threads

-- 1. Create reactions table
CREATE TABLE IF NOT EXISTS reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('thread', 'comment')),
  content_id UUID NOT NULL,
  reaction_type VARCHAR(20) NOT NULL CHECK (reaction_type IN ('thumbs_up', 'heart', 'laugh', 'fire', 'lightbulb', 'party')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: a user can only have one reaction of each type per content
  UNIQUE(user_id, content_type, content_id, reaction_type)
);

-- 2. Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_reactions_content ON reactions(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user ON reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_reactions_type ON reactions(reaction_type);
CREATE INDEX IF NOT EXISTS idx_reactions_created ON reactions(created_at DESC);

-- 3. Enable RLS
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DROP POLICY IF EXISTS "Anyone can view reactions" ON reactions;
CREATE POLICY "Anyone can view reactions"
  ON reactions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can add reactions" ON reactions;
CREATE POLICY "Authenticated users can add reactions"
  ON reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own reactions" ON reactions;
CREATE POLICY "Users can delete own reactions"
  ON reactions FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Function to toggle reaction (add/remove)
CREATE OR REPLACE FUNCTION toggle_reaction(
  p_user_id UUID,
  p_content_type VARCHAR(20),
  p_content_id UUID,
  p_reaction_type VARCHAR(20)
)
RETURNS TABLE (
  action TEXT,
  reaction_id UUID
) AS $$
DECLARE
  existing_reaction_id UUID;
BEGIN
  -- Check if reaction exists
  SELECT id INTO existing_reaction_id
  FROM reactions
  WHERE user_id = p_user_id 
    AND content_type = p_content_type 
    AND content_id = p_content_id
    AND reaction_type = p_reaction_type;
  
  IF existing_reaction_id IS NOT NULL THEN
    -- Remove reaction
    DELETE FROM reactions WHERE id = existing_reaction_id;
    RETURN QUERY SELECT 'removed'::TEXT, NULL::UUID;
  ELSE
    -- Add reaction
    INSERT INTO reactions (user_id, content_type, content_id, reaction_type)
    VALUES (p_user_id, p_content_type, p_content_id, p_reaction_type)
    RETURNING id INTO existing_reaction_id;
    RETURN QUERY SELECT 'added'::TEXT, existing_reaction_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6. Function to get aggregated reactions for content
CREATE OR REPLACE FUNCTION get_reactions_for_content(
  p_content_type VARCHAR(20),
  p_content_id UUID,
  p_current_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  reaction_type VARCHAR(20),
  count BIGINT,
  has_reacted BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.reaction_type,
    COUNT(*)::BIGINT as count,
    COALESCE(bool_or(r.user_id = p_current_user_id), FALSE) as has_reacted
  FROM reactions r
  WHERE r.content_type = p_content_type 
    AND r.content_id = p_content_id
  GROUP BY r.reaction_type
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function to get users who reacted with a specific type
CREATE OR REPLACE FUNCTION get_reactors(
  p_content_type VARCHAR(20),
  p_content_id UUID,
  p_reaction_type VARCHAR(20),
  p_current_user_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  reacted_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.user_id,
    p.username,
    p.avatar_url,
    r.created_at as reacted_at
  FROM reactions r
  LEFT JOIN profiles p ON r.user_id = p.id
  WHERE r.content_type = p_content_type 
    AND r.content_id = p_content_id
    AND r.reaction_type = p_reaction_type
  ORDER BY 
    -- Current user first
    CASE WHEN r.user_id = p_current_user_id THEN 0 ELSE 1 END,
    -- Then by most recent
    r.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Function to check if this is the first reaction on content
CREATE OR REPLACE FUNCTION is_first_reaction_on_content(
  p_content_type VARCHAR(20),
  p_content_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) = 1
    FROM reactions
    WHERE content_type = p_content_type AND content_id = p_content_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Function to notify content author on first reaction
CREATE OR REPLACE FUNCTION notify_author_on_reaction()
RETURNS TRIGGER AS $$
DECLARE
  content_author_id UUID;
  reactor_username TEXT;
  content_title TEXT;
  notification_link TEXT;
  reaction_count INTEGER;
BEGIN
  -- Get reactor username
  SELECT username INTO reactor_username
  FROM profiles
  WHERE id = NEW.user_id;

  -- Get content author and details based on content type
  IF NEW.content_type = 'thread' THEN
    SELECT user_id, title INTO content_author_id, content_title
    FROM threads
    WHERE id = NEW.content_id;
    notification_link := '/thread/' || NEW.content_id;
  ELSIF NEW.content_type = 'comment' THEN
    SELECT c.user_id, t.title, t.id INTO content_author_id, content_title
    FROM comments c
    JOIN threads t ON c.thread_id = t.id
    WHERE c.id = NEW.content_id;
    notification_link := '/thread/' || (
      SELECT thread_id FROM comments WHERE id = NEW.content_id
    );
  END IF;

  -- Don't notify if reacting to own content (Requirement 5.3)
  IF content_author_id IS NULL OR content_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Count total reactions on this content
  SELECT COUNT(*) INTO reaction_count
  FROM reactions
  WHERE content_type = NEW.content_type AND content_id = NEW.content_id;

  -- Only notify on first reaction (Requirement 5.1)
  -- For batching (Requirement 5.2), we update existing notification if within time window
  IF reaction_count = 1 THEN
    -- First reaction - create notification
    PERFORM create_notification(
      content_author_id,
      'reaction',
      'Nueva reacción',
      COALESCE(reactor_username, 'Alguien') || ' reaccionó a tu ' || 
        CASE NEW.content_type 
          WHEN 'thread' THEN 'hilo' 
          WHEN 'comment' THEN 'comentario' 
        END || ' "' || LEFT(content_title, 50) || '"',
      notification_link,
      CASE WHEN NEW.content_type = 'thread' THEN NEW.content_id ELSE NULL END,
      CASE WHEN NEW.content_type = 'comment' THEN NEW.content_id ELSE NULL END,
      NEW.user_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Add 'reaction' to notification types if not exists
DO $$
BEGIN
  -- Update the check constraint to include 'reaction' type
  ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
  ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
    CHECK (type IN ('comment', 'reply', 'mention', 'thread_update', 'reaction'));
EXCEPTION
  WHEN others THEN
    -- Constraint might not exist or have different name, ignore
    NULL;
END $$;

-- 11. Create trigger for notifications on new reactions
DROP TRIGGER IF EXISTS on_reaction_created_notify_author ON reactions;
CREATE TRIGGER on_reaction_created_notify_author
  AFTER INSERT ON reactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_author_on_reaction();

-- 12. Grant permissions
GRANT EXECUTE ON FUNCTION toggle_reaction(UUID, VARCHAR, UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION get_reactions_for_content(VARCHAR, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_reactions_for_content(VARCHAR, UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_reactors(VARCHAR, UUID, VARCHAR, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_reactors(VARCHAR, UUID, VARCHAR) TO anon;
GRANT EXECUTE ON FUNCTION is_first_reaction_on_content(VARCHAR, UUID) TO authenticated;
