-- Migration 011: Enhanced Notifications System with Realtime Support
-- Extends the existing notifications system (005) with vote notifications and Realtime optimizations

-- 1. Add new notification types for voting system
ALTER TABLE notifications 
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications 
  ADD CONSTRAINT notifications_type_check 
  CHECK (type IN ('comment', 'reply', 'mention', 'thread_update', 'upvote', 'downvote', 'vote_milestone'));

-- 2. Add index for Realtime queries (user_id + created_at DESC for recent notifications)
CREATE INDEX IF NOT EXISTS idx_notifications_user_recent 
  ON notifications(user_id, created_at DESC) 
  WHERE read = FALSE;

-- 3. Add index for notification type filtering
CREATE INDEX IF NOT EXISTS idx_notifications_type 
  ON notifications(user_id, type, created_at DESC);

-- 4. Function to notify when receiving upvote on thread
CREATE OR REPLACE FUNCTION notify_thread_upvote()
RETURNS TRIGGER AS $$
DECLARE
  thread_author_id UUID;
  thread_title TEXT;
  voter_username TEXT;
  current_upvotes INTEGER;
BEGIN
  -- Only notify on upvotes (vote_type = 1)
  IF NEW.vote_type != 1 THEN
    RETURN NEW;
  END IF;

  -- Get thread author and title
  SELECT user_id, title, upvote_count INTO thread_author_id, thread_title, current_upvotes
  FROM threads
  WHERE id = NEW.thread_id;
  
  -- Get voter username
  SELECT username INTO voter_username
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Don't notify if voting on own thread
  IF thread_author_id IS NOT NULL AND thread_author_id != NEW.user_id THEN
    -- Only notify every 5 upvotes to avoid spam (1, 5, 10, 15, etc.)
    IF current_upvotes % 5 = 0 THEN
      PERFORM create_notification(
        thread_author_id,
        'vote_milestone',
        '¡Tu hilo alcanzó ' || current_upvotes || ' votos positivos!',
        '"' || thread_title || '" ha recibido ' || current_upvotes || ' upvotes',
        '/thread/' || NEW.thread_id,
        NEW.thread_id,
        NULL,
        NEW.user_id
      );
    ELSIF current_upvotes = 1 THEN
      -- Notify on first upvote
      PERFORM create_notification(
        thread_author_id,
        'upvote',
        'Recibiste un voto positivo',
        COALESCE(voter_username, 'Alguien') || ' votó positivamente en "' || thread_title || '"',
        '/thread/' || NEW.thread_id,
        NEW.thread_id,
        NULL,
        NEW.user_id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to notify when receiving upvote on comment
CREATE OR REPLACE FUNCTION notify_comment_upvote()
RETURNS TRIGGER AS $$
DECLARE
  comment_author_id UUID;
  comment_content TEXT;
  voter_username TEXT;
  thread_id_ref UUID;
  current_upvotes INTEGER;
BEGIN
  -- Only notify on upvotes (vote_type = 1)
  IF NEW.vote_type != 1 THEN
    RETURN NEW;
  END IF;

  -- Get comment author and content
  SELECT user_id, content, thread_id, upvote_count 
  INTO comment_author_id, comment_content, thread_id_ref, current_upvotes
  FROM comments
  WHERE id = NEW.comment_id;
  
  -- Get voter username
  SELECT username INTO voter_username
  FROM profiles
  WHERE id = NEW.user_id;
  
  -- Don't notify if voting on own comment
  IF comment_author_id IS NOT NULL AND comment_author_id != NEW.user_id THEN
    -- Only notify every 5 upvotes or on first upvote
    IF current_upvotes % 5 = 0 THEN
      PERFORM create_notification(
        comment_author_id,
        'vote_milestone',
        '¡Tu comentario alcanzó ' || current_upvotes || ' votos positivos!',
        'Tu comentario ha recibido ' || current_upvotes || ' upvotes',
        '/thread/' || thread_id_ref || '#comment-' || NEW.comment_id,
        thread_id_ref,
        NEW.comment_id,
        NEW.user_id
      );
    ELSIF current_upvotes = 1 THEN
      PERFORM create_notification(
        comment_author_id,
        'upvote',
        'Recibiste un voto positivo',
        COALESCE(voter_username, 'Alguien') || ' votó positivamente en tu comentario',
        '/thread/' || thread_id_ref || '#comment-' || NEW.comment_id,
        thread_id_ref,
        NEW.comment_id,
        NEW.user_id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create triggers for vote notifications
DROP TRIGGER IF EXISTS on_thread_upvote_notify ON votes;
CREATE TRIGGER on_thread_upvote_notify
  AFTER INSERT ON votes
  FOR EACH ROW
  WHEN (NEW.thread_id IS NOT NULL AND NEW.vote_type = 1)
  EXECUTE FUNCTION notify_thread_upvote();

DROP TRIGGER IF EXISTS on_comment_upvote_notify ON votes;
CREATE TRIGGER on_comment_upvote_notify
  AFTER INSERT ON votes
  FOR EACH ROW
  WHEN (NEW.comment_id IS NOT NULL AND NEW.vote_type = 1)
  EXECUTE FUNCTION notify_comment_upvote();

-- 7. Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE notifications
  SET read = TRUE
  WHERE user_id = p_user_id
    AND read = FALSE
  RETURNING COUNT(*) INTO updated_count;
  
  RETURN COALESCE(updated_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Policy for creating notifications (system can create)
DROP POLICY IF EXISTS "System can create notifications" ON notifications;
CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- 9. Enable Realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- 10. Create a view for recent unread notifications (for performance)
CREATE OR REPLACE VIEW recent_unread_notifications AS
SELECT 
  n.*,
  p.username as related_user_username,
  p.avatar_url as related_user_avatar
FROM notifications n
LEFT JOIN profiles p ON n.related_user_id = p.id
WHERE n.read = FALSE
  AND n.created_at > NOW() - INTERVAL '30 days'
ORDER BY n.created_at DESC;

-- Grant access to the view
GRANT SELECT ON recent_unread_notifications TO authenticated;

-- 11. Function to get notification summary
CREATE OR REPLACE FUNCTION get_notification_summary(p_user_id UUID)
RETURNS TABLE (
  total_unread INTEGER,
  recent_notifications JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM notifications WHERE user_id = p_user_id AND read = FALSE) as total_unread,
    (SELECT COALESCE(jsonb_agg(row_to_json(n.*)), '[]'::jsonb)
     FROM (
       SELECT * FROM recent_unread_notifications
       WHERE user_id = p_user_id
       LIMIT 5
     ) n
    ) as recent_notifications;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migration complete: Enhanced notifications with vote support and Realtime optimization
