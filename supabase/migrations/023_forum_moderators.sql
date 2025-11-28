-- Forum Moderators System Migration
-- Allows assigning specific moderators per forum

-- Create forum_moderators table
CREATE TABLE IF NOT EXISTS forum_moderators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  forum_id UUID NOT NULL REFERENCES forums(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  appointed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  permissions JSONB DEFAULT '{"can_delete_threads": true, "can_delete_comments": true, "can_hide_content": true, "can_pin_threads": true, "can_lock_threads": true, "can_manage_reports": true}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(forum_id, user_id)
);

-- Add pinned and locked columns to threads if not exists
ALTER TABLE threads ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;
ALTER TABLE threads ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;
ALTER TABLE threads ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ;
ALTER TABLE threads ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;
ALTER TABLE threads ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES auth.users(id);
ALTER TABLE threads ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES auth.users(id);

-- Create moderation_log table for audit trail
CREATE TABLE IF NOT EXISTS moderation_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  moderator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  forum_id UUID REFERENCES forums(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('delete_thread', 'delete_comment', 'hide_thread', 'unhide_thread', 'pin_thread', 'unpin_thread', 'lock_thread', 'unlock_thread', 'resolve_report', 'dismiss_report', 'warn_user')),
  target_type TEXT NOT NULL CHECK (target_type IN ('thread', 'comment', 'user', 'report')),
  target_id UUID NOT NULL,
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_forum_moderators_forum ON forum_moderators(forum_id);
CREATE INDEX IF NOT EXISTS idx_forum_moderators_user ON forum_moderators(user_id);
CREATE INDEX IF NOT EXISTS idx_moderation_log_forum ON moderation_log(forum_id);
CREATE INDEX IF NOT EXISTS idx_moderation_log_moderator ON moderation_log(moderator_id);
CREATE INDEX IF NOT EXISTS idx_moderation_log_created ON moderation_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_pinned ON threads(forum_id, is_pinned) WHERE is_pinned = true;

-- Enable RLS
ALTER TABLE forum_moderators ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_log ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is moderator of a forum
CREATE OR REPLACE FUNCTION is_forum_moderator(check_user_id UUID, check_forum_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM forum_moderators
    WHERE user_id = check_user_id AND forum_id = check_forum_id
  ) OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = check_user_id AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check moderator permission
CREATE OR REPLACE FUNCTION has_mod_permission(check_user_id UUID, check_forum_id UUID, permission_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_permissions JSONB;
BEGIN
  -- Admins have all permissions
  IF EXISTS (SELECT 1 FROM profiles WHERE id = check_user_id AND is_admin = true) THEN
    RETURN true;
  END IF;
  
  -- Check forum-specific moderator permissions
  SELECT permissions INTO user_permissions
  FROM forum_moderators
  WHERE user_id = check_user_id AND forum_id = check_forum_id;
  
  IF user_permissions IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN COALESCE((user_permissions->>permission_name)::boolean, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policies for forum_moderators
CREATE POLICY "Anyone can view forum moderators"
  ON forum_moderators FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage forum moderators"
  ON forum_moderators FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Policies for moderation_log
CREATE POLICY "Moderators can view logs for their forums"
  ON moderation_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
    OR
    EXISTS (
      SELECT 1 FROM forum_moderators
      WHERE forum_moderators.user_id = auth.uid()
      AND forum_moderators.forum_id = moderation_log.forum_id
    )
  );

CREATE POLICY "Moderators can create log entries"
  ON moderation_log FOR INSERT
  WITH CHECK (
    moderator_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true
      )
      OR
      is_forum_moderator(auth.uid(), forum_id)
    )
  );

-- Function to log moderation action
CREATE OR REPLACE FUNCTION log_moderation_action(
  p_forum_id UUID,
  p_action_type TEXT,
  p_target_type TEXT,
  p_target_id UUID,
  p_reason TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO moderation_log (moderator_id, forum_id, action_type, target_type, target_id, reason, metadata)
  VALUES (auth.uid(), p_forum_id, p_action_type, p_target_type, p_target_id, p_reason, p_metadata)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to pin/unpin thread
CREATE OR REPLACE FUNCTION toggle_thread_pin(p_thread_id UUID, p_pin BOOLEAN)
RETURNS BOOLEAN AS $$
DECLARE
  thread_forum_id UUID;
BEGIN
  SELECT forum_id INTO thread_forum_id FROM threads WHERE id = p_thread_id;
  
  IF NOT has_mod_permission(auth.uid(), thread_forum_id, 'can_pin_threads') THEN
    RAISE EXCEPTION 'No permission to pin/unpin threads in this forum';
  END IF;
  
  UPDATE threads
  SET is_pinned = p_pin,
      pinned_at = CASE WHEN p_pin THEN NOW() ELSE NULL END,
      pinned_by = CASE WHEN p_pin THEN auth.uid() ELSE NULL END
  WHERE id = p_thread_id;
  
  -- Log the action
  PERFORM log_moderation_action(
    thread_forum_id,
    CASE WHEN p_pin THEN 'pin_thread' ELSE 'unpin_thread' END,
    'thread',
    p_thread_id
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to lock/unlock thread
CREATE OR REPLACE FUNCTION toggle_thread_lock(p_thread_id UUID, p_lock BOOLEAN, p_reason TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  thread_forum_id UUID;
BEGIN
  SELECT forum_id INTO thread_forum_id FROM threads WHERE id = p_thread_id;
  
  IF NOT has_mod_permission(auth.uid(), thread_forum_id, 'can_lock_threads') THEN
    RAISE EXCEPTION 'No permission to lock/unlock threads in this forum';
  END IF;
  
  UPDATE threads
  SET is_locked = p_lock,
      locked_at = CASE WHEN p_lock THEN NOW() ELSE NULL END,
      locked_by = CASE WHEN p_lock THEN auth.uid() ELSE NULL END
  WHERE id = p_thread_id;
  
  -- Log the action
  PERFORM log_moderation_action(
    thread_forum_id,
    CASE WHEN p_lock THEN 'lock_thread' ELSE 'unlock_thread' END,
    'thread',
    p_thread_id,
    p_reason
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to hide thread (for moderators)
CREATE OR REPLACE FUNCTION moderate_hide_thread(p_thread_id UUID, p_hide BOOLEAN, p_reason TEXT DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  thread_forum_id UUID;
BEGIN
  SELECT forum_id INTO thread_forum_id FROM threads WHERE id = p_thread_id;
  
  IF NOT has_mod_permission(auth.uid(), thread_forum_id, 'can_hide_content') THEN
    RAISE EXCEPTION 'No permission to hide/unhide content in this forum';
  END IF;
  
  UPDATE threads
  SET is_hidden = p_hide,
      hidden_at = CASE WHEN p_hide THEN NOW() ELSE NULL END
  WHERE id = p_thread_id;
  
  -- Log the action
  PERFORM log_moderation_action(
    thread_forum_id,
    CASE WHEN p_hide THEN 'hide_thread' ELSE 'unhide_thread' END,
    'thread',
    p_thread_id,
    p_reason
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update reports table to track which moderator handled it
ALTER TABLE reports ADD COLUMN IF NOT EXISTS handled_by UUID REFERENCES auth.users(id);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS handled_at TIMESTAMPTZ;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS resolution_note TEXT;

-- Function to handle report
CREATE OR REPLACE FUNCTION handle_report(
  p_report_id UUID,
  p_status TEXT,
  p_resolution_note TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  report_record RECORD;
  report_forum_id UUID;
BEGIN
  -- Get report details
  SELECT * INTO report_record FROM reports WHERE id = p_report_id;
  
  IF report_record IS NULL THEN
    RAISE EXCEPTION 'Report not found';
  END IF;
  
  -- Get forum_id based on content type
  IF report_record.content_type = 'thread' THEN
    SELECT forum_id INTO report_forum_id FROM threads WHERE id = report_record.content_id;
  ELSIF report_record.content_type = 'comment' THEN
    SELECT t.forum_id INTO report_forum_id
    FROM comments c
    JOIN threads t ON t.id = c.thread_id
    WHERE c.id = report_record.content_id;
  END IF;
  
  -- Check permission
  IF NOT has_mod_permission(auth.uid(), report_forum_id, 'can_manage_reports') THEN
    RAISE EXCEPTION 'No permission to manage reports in this forum';
  END IF;
  
  -- Update report
  UPDATE reports
  SET status = p_status,
      handled_by = auth.uid(),
      handled_at = NOW(),
      resolution_note = p_resolution_note,
      updated_at = NOW()
  WHERE id = p_report_id;
  
  -- Log the action
  PERFORM log_moderation_action(
    report_forum_id,
    CASE WHEN p_status = 'reviewed' THEN 'resolve_report' ELSE 'dismiss_report' END,
    'report',
    p_report_id,
    p_resolution_note
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_forum_moderator TO authenticated;
GRANT EXECUTE ON FUNCTION has_mod_permission TO authenticated;
GRANT EXECUTE ON FUNCTION log_moderation_action TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_thread_pin TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_thread_lock TO authenticated;
GRANT EXECUTE ON FUNCTION moderate_hide_thread TO authenticated;
GRANT EXECUTE ON FUNCTION handle_report TO authenticated;
