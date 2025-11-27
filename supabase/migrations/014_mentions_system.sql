-- Migration: 014_mentions_system.sql
-- Description: Adds support for @username mentions

-- Create mentions table to track all mentions
CREATE TABLE IF NOT EXISTS mentions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_type TEXT NOT NULL CHECK (source_type IN ('thread', 'comment')),
  source_id UUID NOT NULL,
  mentioned_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mentioning_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate mentions in the same source
  UNIQUE(source_type, source_id, mentioned_user_id)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_mentions_mentioned_user ON mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_mentions_source ON mentions(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_mentions_created_at ON mentions(created_at DESC);

-- Enable RLS
ALTER TABLE mentions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Anyone can read mentions, only the mentioning user can insert
DROP POLICY IF EXISTS "Anyone can view mentions" ON mentions;
CREATE POLICY "Anyone can view mentions"
  ON mentions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create mentions" ON mentions;
CREATE POLICY "Authenticated users can create mentions"
  ON mentions FOR INSERT
  WITH CHECK (auth.uid() = mentioning_user_id);

DROP POLICY IF EXISTS "Mentioning user can delete mentions" ON mentions;
CREATE POLICY "Mentioning user can delete mentions"
  ON mentions FOR DELETE
  USING (auth.uid() = mentioning_user_id);

-- Drop existing functions first to avoid conflicts
DROP FUNCTION IF EXISTS process_mentions(TEXT, UUID, UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS search_users_for_mention(TEXT, INTEGER);

-- Function to extract mentions from text and create mention records + notifications
CREATE OR REPLACE FUNCTION process_mentions(
  p_source_type TEXT,
  p_source_id UUID,
  p_mentioning_user_id UUID,
  p_content TEXT,
  p_link TEXT
)
RETURNS INTEGER AS $$
DECLARE
  v_mention TEXT;
  v_mentioned_user_id UUID;
  v_mentioning_username TEXT;
  v_mention_count INTEGER := 0;
  v_notification_title TEXT;
  v_notification_message TEXT;
BEGIN
  -- Get the mentioning user's username
  SELECT username INTO v_mentioning_username
  FROM profiles
  WHERE id = p_mentioning_user_id;

  -- Find all @mentions in the content using regex
  -- Matches @username where username is alphanumeric with underscores, 3-20 chars
  FOR v_mention IN
    SELECT DISTINCT (regexp_matches(p_content, '@([a-zA-Z0-9_]{3,20})', 'g'))[1]
  LOOP
    -- Find the mentioned user
    SELECT id INTO v_mentioned_user_id
    FROM profiles
    WHERE LOWER(username) = LOWER(v_mention)
      AND id != p_mentioning_user_id; -- Don't mention yourself
    
    IF v_mentioned_user_id IS NOT NULL THEN
      -- Insert mention record (ignore if duplicate)
      INSERT INTO mentions (source_type, source_id, mentioned_user_id, mentioning_user_id)
      VALUES (p_source_type, p_source_id, v_mentioned_user_id, p_mentioning_user_id)
      ON CONFLICT (source_type, source_id, mentioned_user_id) DO NOTHING;
      
      IF FOUND THEN
        v_mention_count := v_mention_count + 1;
        
        -- Check if user wants mention notifications
        IF should_notify_user(v_mentioned_user_id, 'mentions') THEN
          -- Create notification
          v_notification_title := CASE p_source_type
            WHEN 'thread' THEN 'Te mencionaron en un hilo'
            WHEN 'comment' THEN 'Te mencionaron en un comentario'
            ELSE 'Te mencionaron'
          END;
          
          v_notification_message := '@' || v_mentioning_username || ' te mencionó';
          
          INSERT INTO notifications (
            user_id,
            type,
            title,
            message,
            link,
            related_user_id,
            related_thread_id,
            related_comment_id
          )
          VALUES (
            v_mentioned_user_id,
            'mention',
            v_notification_title,
            v_notification_message,
            p_link,
            p_mentioning_user_id,
            CASE WHEN p_source_type = 'thread' THEN p_source_id ELSE NULL END,
            CASE WHEN p_source_type = 'comment' THEN p_source_id ELSE NULL END
          );
        END IF;
      END IF;
    END IF;
  END LOOP;
  
  RETURN v_mention_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get users for autocomplete (searches by username prefix)
CREATE OR REPLACE FUNCTION search_users_for_mention(
  p_query TEXT,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  username TEXT,
  avatar_url TEXT,
  level INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.avatar_url,
    p.level
  FROM profiles p
  WHERE p.username IS NOT NULL
    AND p.username ILIKE p_query || '%'
  ORDER BY 
    p.level DESC,
    p.karma DESC,
    p.username ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION process_mentions TO authenticated;
GRANT EXECUTE ON FUNCTION search_users_for_mention TO authenticated;
