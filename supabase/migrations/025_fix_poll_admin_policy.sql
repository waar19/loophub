-- =====================================================
-- Migration: Fix poll creation policy to allow admins
-- =====================================================

-- Drop the old policy
DROP POLICY IF EXISTS "Level 3+ users can create polls" ON polls;

-- Create updated policy that allows admins OR level 3+ users
CREATE POLICY "Level 3+ or admins can create polls" ON polls
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND (is_admin = true OR level >= 3)
    )
  );
