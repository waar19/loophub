-- LoopHub Notifications Migration
-- Run this in your Supabase SQL Editor

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('comment', 'reply', 'mention', 'thread_update')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT, -- URL to the related content (e.g., /thread/123)
  related_thread_id UUID REFERENCES threads(id) ON DELETE CASCADE,
  related_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  related_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- User who triggered the notification
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_related_thread ON notifications(related_thread_id) WHERE related_thread_id IS NOT NULL;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_link TEXT DEFAULT NULL,
  p_related_thread_id UUID DEFAULT NULL,
  p_related_comment_id UUID DEFAULT NULL,
  p_related_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    link,
    related_thread_id,
    related_comment_id,
    related_user_id
  )
  VALUES (
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_link,
    p_related_thread_id,
    p_related_comment_id,
    p_related_user_id
  )
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to notify thread author when someone comments
CREATE OR REPLACE FUNCTION notify_thread_author_on_comment()
RETURNS TRIGGER AS $$
DECLARE
  thread_author_id UUID;
  commenter_username TEXT;
  thread_title TEXT;
BEGIN
  -- Get thread author and title
  SELECT user_id, title INTO thread_author_id, thread_title
  FROM threads
  WHERE id = NEW.thread_id;
  
  -- Get commenter username
  SELECT username INTO commenter_username
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Don't notify if commenting on own thread
  IF thread_author_id IS NOT NULL AND thread_author_id != NEW.user_id THEN
    PERFORM create_notification(
      thread_author_id,
      'comment',
      'Nuevo comentario en tu hilo',
      COALESCE(commenter_username, 'Un usuario') || ' comentó en "' || thread_title || '"',
      '/thread/' || NEW.thread_id,
      NEW.thread_id,
      NEW.id,
      NEW.user_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new comments
DROP TRIGGER IF EXISTS on_comment_created_notify_author ON comments;
CREATE TRIGGER on_comment_created_notify_author
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_thread_author_on_comment();

-- Function to notify comment author when someone replies (if we add reply functionality)
-- For now, we'll notify when someone comments on the same thread after you
CREATE OR REPLACE FUNCTION notify_commenters_on_new_comment()
RETURNS TRIGGER AS $$
DECLARE
  commenter_record RECORD;
  commenter_username TEXT;
  thread_title TEXT;
BEGIN
  -- Get thread title
  SELECT title INTO thread_title
  FROM threads
  WHERE id = NEW.thread_id;
  
  -- Get commenter username
  SELECT username INTO commenter_username
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Notify all users who commented on this thread (except the new commenter)
  FOR commenter_record IN
    SELECT DISTINCT user_id
    FROM comments
    WHERE thread_id = NEW.thread_id
      AND user_id != NEW.user_id
      AND user_id IS NOT NULL
  LOOP
    PERFORM create_notification(
      commenter_record.user_id,
      'reply',
      'Nueva actividad en un hilo',
      COALESCE(commenter_username, 'Un usuario') || ' también comentó en "' || thread_title || '"',
      '/thread/' || NEW.thread_id,
      NEW.thread_id,
      NEW.id,
      NEW.user_id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for notifying other commenters (optional - can be disabled if too noisy)
-- DROP TRIGGER IF EXISTS on_comment_created_notify_commenters ON comments;
-- CREATE TRIGGER on_comment_created_notify_commenters
--   AFTER INSERT ON comments
--   FOR EACH ROW
--   EXECUTE FUNCTION notify_commenters_on_new_comment();

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unread_count
  FROM notifications
  WHERE user_id = p_user_id
    AND read = FALSE;
  
  RETURN COALESCE(unread_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

