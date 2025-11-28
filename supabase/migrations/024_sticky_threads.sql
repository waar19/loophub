-- Migration: Sticky/Pinned Threads
-- Allows admins and moderators to pin important threads to the top of forum listings

-- Add is_pinned column to threads
ALTER TABLE threads ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;
ALTER TABLE threads ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ;
ALTER TABLE threads ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES auth.users(id);

-- Create index for efficient querying of pinned threads
CREATE INDEX IF NOT EXISTS idx_threads_pinned ON threads(forum_id, is_pinned, pinned_at DESC) WHERE is_pinned = true;

-- Function to pin a thread (with limit check)
CREATE OR REPLACE FUNCTION pin_thread(
  p_thread_id UUID,
  p_user_id UUID,
  p_max_pins INTEGER DEFAULT 3
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_forum_id UUID;
  v_current_pins INTEGER;
  v_is_admin BOOLEAN;
  v_is_moderator BOOLEAN;
BEGIN
  -- Get thread's forum_id
  SELECT forum_id INTO v_forum_id FROM threads WHERE id = p_thread_id;
  
  IF v_forum_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Thread not found');
  END IF;
  
  -- Check if user is admin
  SELECT is_admin INTO v_is_admin FROM profiles WHERE id = p_user_id;
  
  -- Check if user is moderator for this forum
  SELECT EXISTS(
    SELECT 1 FROM forum_moderators 
    WHERE user_id = p_user_id 
    AND (forum_id = v_forum_id OR forum_id IS NULL)
    AND (permissions->>'can_pin_threads')::boolean = true
  ) INTO v_is_moderator;
  
  IF NOT (v_is_admin OR v_is_moderator) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  
  -- Count current pinned threads in this forum
  SELECT COUNT(*) INTO v_current_pins 
  FROM threads 
  WHERE forum_id = v_forum_id AND is_pinned = true;
  
  -- Check if already at max pins
  IF v_current_pins >= p_max_pins THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'Maximum pinned threads reached for this forum',
      'current_pins', v_current_pins,
      'max_pins', p_max_pins
    );
  END IF;
  
  -- Pin the thread
  UPDATE threads 
  SET 
    is_pinned = true,
    pinned_at = NOW(),
    pinned_by = p_user_id
  WHERE id = p_thread_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Function to unpin a thread
CREATE OR REPLACE FUNCTION unpin_thread(
  p_thread_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_forum_id UUID;
  v_is_admin BOOLEAN;
  v_is_moderator BOOLEAN;
BEGIN
  -- Get thread's forum_id
  SELECT forum_id INTO v_forum_id FROM threads WHERE id = p_thread_id;
  
  IF v_forum_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Thread not found');
  END IF;
  
  -- Check if user is admin
  SELECT is_admin INTO v_is_admin FROM profiles WHERE id = p_user_id;
  
  -- Check if user is moderator for this forum
  SELECT EXISTS(
    SELECT 1 FROM forum_moderators 
    WHERE user_id = p_user_id 
    AND (forum_id = v_forum_id OR forum_id IS NULL)
    AND (permissions->>'can_pin_threads')::boolean = true
  ) INTO v_is_moderator;
  
  IF NOT (v_is_admin OR v_is_moderator) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;
  
  -- Unpin the thread
  UPDATE threads 
  SET 
    is_pinned = false,
    pinned_at = NULL,
    pinned_by = NULL
  WHERE id = p_thread_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION pin_thread TO authenticated;
GRANT EXECUTE ON FUNCTION unpin_thread TO authenticated;

-- Add comment explaining the feature
COMMENT ON COLUMN threads.is_pinned IS 'Whether this thread is pinned/sticky at the top of the forum';
COMMENT ON COLUMN threads.pinned_at IS 'When the thread was pinned';
COMMENT ON COLUMN threads.pinned_by IS 'User who pinned the thread';
