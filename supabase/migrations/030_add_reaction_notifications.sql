-- Migration 030: Add reaction notification settings
-- Adds notify_reactions column to notification_settings table

-- 1. Add notify_reactions column to notification_settings
ALTER TABLE notification_settings 
ADD COLUMN IF NOT EXISTS notify_reactions BOOLEAN DEFAULT TRUE;

-- 2. Update should_notify_user function to handle reaction type
CREATE OR REPLACE FUNCTION should_notify_user(p_user_id UUID, p_notification_type TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  settings notification_settings;
BEGIN
  -- Get user settings
  SELECT * INTO settings
  FROM notification_settings
  WHERE user_id = p_user_id;
  
  -- If no settings, use defaults (all enabled except downvotes)
  IF NOT FOUND THEN
    RETURN CASE p_notification_type
      WHEN 'downvote' THEN FALSE
      ELSE TRUE
    END;
  END IF;
  
  -- Check based on notification type
  RETURN CASE p_notification_type
    WHEN 'comment' THEN settings.notify_comments
    WHEN 'reply' THEN settings.notify_replies
    WHEN 'mention' THEN settings.notify_mentions
    WHEN 'upvote' THEN settings.notify_upvotes
    WHEN 'downvote' THEN settings.notify_downvotes
    WHEN 'vote_milestone' THEN settings.notify_milestones
    WHEN 'reaction' THEN settings.notify_reactions
    WHEN 'thread_update' THEN TRUE
    ELSE TRUE
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
