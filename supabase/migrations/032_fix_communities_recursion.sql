-- Fix infinite recursion in communities RLS policies

-- 1. Create a security definer function to check community visibility and membership without triggering RLS
-- This breaks the cycle: communities -> community_members -> communities
CREATE OR REPLACE FUNCTION can_view_community_content(p_community_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_visibility VARCHAR;
  v_is_member BOOLEAN;
BEGIN
  -- Check visibility directly from communities table (bypassing RLS)
  SELECT visibility INTO v_visibility 
  FROM communities 
  WHERE id = p_community_id;
  
  -- If public, allow access
  IF v_visibility = 'public' THEN
    RETURN TRUE;
  END IF;
  
  -- If no user_id provided (anon), deny if not public
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check membership directly from community_members table (bypassing RLS)
  SELECT EXISTS (
    SELECT 1 
    FROM community_members 
    WHERE community_id = p_community_id 
    AND user_id = p_user_id
  ) INTO v_is_member;
  
  RETURN v_is_member;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update community_members policy to use the new function
DROP POLICY IF EXISTS "Members visible to community members" ON community_members;

CREATE POLICY "Members visible to community members"
  ON community_members FOR SELECT
  USING (
    can_view_community_content(community_id, auth.uid())
  );
