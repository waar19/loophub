-- Migration: 018_thread_subscriptions.sql
-- Description: Adds ability to follow/watch threads for update notifications

-- 1. Create thread_subscriptions table
CREATE TABLE IF NOT EXISTS thread_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  
  -- Notification preferences for this subscription
  notify_comments BOOLEAN DEFAULT TRUE,
  notify_replies BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, thread_id)
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON thread_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_thread ON thread_subscriptions(thread_id);

-- 3. Enable RLS
ALTER TABLE thread_subscriptions ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DROP POLICY IF EXISTS "Users can view own subscriptions" ON thread_subscriptions;
CREATE POLICY "Users can view own subscriptions"
  ON thread_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create subscriptions" ON thread_subscriptions;
CREATE POLICY "Users can create subscriptions"
  ON thread_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own subscriptions" ON thread_subscriptions;
CREATE POLICY "Users can update own subscriptions"
  ON thread_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own subscriptions" ON thread_subscriptions;
CREATE POLICY "Users can delete own subscriptions"
  ON thread_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Function to toggle subscription
CREATE OR REPLACE FUNCTION toggle_thread_subscription(
  p_user_id UUID,
  p_thread_id UUID
)
RETURNS TABLE (
  subscribed BOOLEAN,
  subscription_id UUID
) AS $$
DECLARE
  existing_id UUID;
BEGIN
  SELECT id INTO existing_id
  FROM thread_subscriptions
  WHERE user_id = p_user_id AND thread_id = p_thread_id;
  
  IF existing_id IS NOT NULL THEN
    DELETE FROM thread_subscriptions WHERE id = existing_id;
    RETURN QUERY SELECT FALSE, NULL::UUID;
  ELSE
    INSERT INTO thread_subscriptions (user_id, thread_id)
    VALUES (p_user_id, p_thread_id)
    RETURNING id INTO existing_id;
    RETURN QUERY SELECT TRUE, existing_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to check if user is subscribed
CREATE OR REPLACE FUNCTION is_subscribed_to_thread(p_user_id UUID, p_thread_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM thread_subscriptions
    WHERE user_id = p_user_id AND thread_id = p_thread_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function to get subscriber count
CREATE OR REPLACE FUNCTION get_thread_subscriber_count(p_thread_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (SELECT COUNT(*)::INTEGER FROM thread_subscriptions WHERE thread_id = p_thread_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Function to get user's subscribed threads
CREATE OR REPLACE FUNCTION get_user_subscriptions(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  subscription_id UUID,
  subscribed_at TIMESTAMPTZ,
  thread_id UUID,
  thread_title TEXT,
  thread_created_at TIMESTAMPTZ,
  thread_upvotes INTEGER,
  thread_downvotes INTEGER,
  forum_name TEXT,
  forum_slug TEXT,
  author_username TEXT,
  comment_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as subscription_id,
    s.created_at as subscribed_at,
    t.id as thread_id,
    t.title as thread_title,
    t.created_at as thread_created_at,
    t.upvotes as thread_upvotes,
    t.downvotes as thread_downvotes,
    f.name as forum_name,
    f.slug as forum_slug,
    p.username as author_username,
    (SELECT COUNT(*) FROM comments c WHERE c.thread_id = t.id) as comment_count
  FROM thread_subscriptions s
  JOIN threads t ON s.thread_id = t.id
  JOIN forums f ON t.forum_id = f.id
  LEFT JOIN profiles p ON t.user_id = p.id
  WHERE s.user_id = p_user_id
  ORDER BY s.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Function to get subscribers for notification (when new comment is posted)
CREATE OR REPLACE FUNCTION get_thread_subscribers_for_notification(
  p_thread_id UUID,
  p_exclude_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  notify_comments BOOLEAN,
  notify_replies BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT s.user_id, s.notify_comments, s.notify_replies
  FROM thread_subscriptions s
  WHERE s.thread_id = p_thread_id
    AND (p_exclude_user_id IS NULL OR s.user_id != p_exclude_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Auto-subscribe thread creator
CREATE OR REPLACE FUNCTION auto_subscribe_thread_creator()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO thread_subscriptions (user_id, thread_id)
  VALUES (NEW.user_id, NEW.id)
  ON CONFLICT (user_id, thread_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS auto_subscribe_on_thread_create ON threads;
CREATE TRIGGER auto_subscribe_on_thread_create
  AFTER INSERT ON threads
  FOR EACH ROW
  EXECUTE FUNCTION auto_subscribe_thread_creator();

-- 11. Grant permissions
GRANT EXECUTE ON FUNCTION toggle_thread_subscription(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_subscribed_to_thread(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_thread_subscriber_count(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_subscriptions(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_thread_subscribers_for_notification(UUID, UUID) TO authenticated;
