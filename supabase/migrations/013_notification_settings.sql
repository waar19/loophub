-- Migration 013: Notification Settings
-- Adds user preferences for notification management

-- 1. Create notification_settings table
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- In-app notification preferences
  notify_comments BOOLEAN DEFAULT TRUE,       -- New comments on your threads
  notify_replies BOOLEAN DEFAULT TRUE,        -- Replies to your comments
  notify_mentions BOOLEAN DEFAULT TRUE,       -- When someone mentions you
  notify_upvotes BOOLEAN DEFAULT TRUE,        -- Upvotes on your content
  notify_downvotes BOOLEAN DEFAULT FALSE,     -- Downvotes on your content
  notify_milestones BOOLEAN DEFAULT TRUE,     -- Vote milestones (5, 10, 25, etc.)
  
  -- Browser notification preferences
  browser_notifications BOOLEAN DEFAULT FALSE,
  
  -- Sound preferences
  sound_enabled BOOLEAN DEFAULT FALSE,
  
  -- Email preferences (for future use)
  email_digest BOOLEAN DEFAULT FALSE,         -- Weekly email digest
  email_mentions BOOLEAN DEFAULT FALSE,       -- Email when mentioned
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_user_notification_settings UNIQUE (user_id)
);

-- 2. Create index for fast user lookup
CREATE INDEX IF NOT EXISTS idx_notification_settings_user 
  ON notification_settings(user_id);

-- 3. Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_notification_settings_timestamp ON notification_settings;
CREATE TRIGGER update_notification_settings_timestamp
  BEFORE UPDATE ON notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_settings_timestamp();

-- 4. RLS Policies
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Users can read their own settings
DROP POLICY IF EXISTS "Users can read own notification settings" ON notification_settings;
CREATE POLICY "Users can read own notification settings"
  ON notification_settings FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own settings
DROP POLICY IF EXISTS "Users can insert own notification settings" ON notification_settings;
CREATE POLICY "Users can insert own notification settings"
  ON notification_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own settings
DROP POLICY IF EXISTS "Users can update own notification settings" ON notification_settings;
CREATE POLICY "Users can update own notification settings"
  ON notification_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- 5. Function to get or create notification settings for a user
CREATE OR REPLACE FUNCTION get_or_create_notification_settings(p_user_id UUID)
RETURNS notification_settings AS $$
DECLARE
  settings notification_settings;
BEGIN
  -- Try to get existing settings
  SELECT * INTO settings
  FROM notification_settings
  WHERE user_id = p_user_id;
  
  -- If not found, create default settings
  IF NOT FOUND THEN
    INSERT INTO notification_settings (user_id)
    VALUES (p_user_id)
    RETURNING * INTO settings;
  END IF;
  
  RETURN settings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to check if user should receive a notification type
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
    WHEN 'thread_update' THEN TRUE
    ELSE TRUE
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Update create_notification function to check settings
-- First drop existing function to avoid parameter name conflicts
DROP FUNCTION IF EXISTS create_notification(UUID, TEXT, TEXT, TEXT, TEXT, UUID, UUID, UUID);

CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_link TEXT DEFAULT NULL,
  p_thread_id UUID DEFAULT NULL,
  p_comment_id UUID DEFAULT NULL,
  p_related_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  -- Check if user wants this type of notification
  IF NOT should_notify_user(p_user_id, p_type) THEN
    RETURN NULL;
  END IF;

  INSERT INTO notifications (user_id, type, title, message, link, related_thread_id, related_comment_id, related_user_id)
  VALUES (p_user_id, p_type, p_title, p_message, p_link, p_thread_id, p_comment_id, p_related_user_id)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Grant execute permissions
GRANT EXECUTE ON FUNCTION get_or_create_notification_settings(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION should_notify_user(UUID, TEXT) TO authenticated;
