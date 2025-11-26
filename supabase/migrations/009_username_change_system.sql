-- Migration: Allow one-time username change
-- Users can change their username once after creation
-- Track username change history for security

-- Add column to track if username has been changed
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username_changed_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS can_change_username BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS previous_username TEXT;

-- Create username history table for audit trail
CREATE TABLE IF NOT EXISTS username_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  old_username TEXT,
  new_username TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT, -- For future: 'initial', 'one_time_change', 'karma_purchase', etc.
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES profiles(id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_username_history_user_id ON username_history(user_id);
CREATE INDEX IF NOT EXISTS idx_username_history_changed_at ON username_history(changed_at DESC);

-- Enable RLS
ALTER TABLE username_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for username_history
DROP POLICY IF EXISTS "Users can view their own username history" ON username_history;
CREATE POLICY "Users can view their own username history"
  ON username_history FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all username history" ON username_history;
CREATE POLICY "Admins can view all username history"
  ON username_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Function to handle username change
CREATE OR REPLACE FUNCTION change_username(
  new_username_param TEXT
)
RETURNS JSON AS $$
DECLARE
  current_user_id UUID;
  current_username TEXT;
  can_change BOOLEAN;
  username_changed_at_value TIMESTAMPTZ;
  result JSON;
BEGIN
  -- Get current user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;

  -- Get current profile data
  SELECT username, can_change_username, username_changed_at
  INTO current_username, can_change, username_changed_at_value
  FROM profiles
  WHERE id = current_user_id;

  -- Check if user can change username
  IF NOT can_change THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Username change limit reached. Contact support for assistance.',
      'can_change', false
    );
  END IF;

  -- Validate new username format
  IF new_username_param IS NULL OR 
     length(new_username_param) < 3 OR 
     length(new_username_param) > 30 OR
     new_username_param !~ '^[a-zA-Z0-9_]+$' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid username format'
    );
  END IF;

  -- Check if new username is already taken
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE username = new_username_param 
    AND id != current_user_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Username is already taken'
    );
  END IF;

  -- Update profile
  UPDATE profiles
  SET 
    previous_username = current_username,
    username = new_username_param,
    username_changed_at = NOW(),
    can_change_username = false -- Disable future changes (one-time only)
  WHERE id = current_user_id;

  -- Record in history
  INSERT INTO username_history (user_id, old_username, new_username, reason)
  VALUES (
    current_user_id, 
    current_username, 
    new_username_param,
    CASE 
      WHEN current_username IS NULL THEN 'initial_setup'
      ELSE 'one_time_change'
    END
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Username changed successfully',
    'can_change', false,
    'previous_username', current_username,
    'new_username', new_username_param
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION change_username(TEXT) TO authenticated;

-- Update existing users to allow one-time change
-- Users who set username during onboarding should be able to change it once
UPDATE profiles
SET can_change_username = true
WHERE username IS NOT NULL 
  AND username_changed_at IS NULL
  AND can_change_username IS NULL;

-- Comment for documentation
COMMENT ON COLUMN profiles.can_change_username IS 'Allows one free username change after initial setup. Future changes may require karma or payment.';
COMMENT ON COLUMN profiles.username_changed_at IS 'Timestamp of last username change';
COMMENT ON COLUMN profiles.previous_username IS 'Previous username before last change (for display/recovery)';
COMMENT ON TABLE username_history IS 'Audit trail of all username changes for security and moderation';
