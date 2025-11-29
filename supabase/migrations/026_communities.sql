-- =====================================================
-- MIGRATION 026: Communities System
-- =====================================================
-- Allows users (level 3+) to create their own communities
-- =====================================================

-- Community categories
CREATE TABLE IF NOT EXISTS community_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  slug VARCHAR(50) NOT NULL UNIQUE,
  icon VARCHAR(10) DEFAULT '📁',
  description TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories
INSERT INTO community_categories (name, slug, icon, sort_order) VALUES
  ('Technology', 'technology', '💻', 1),
  ('Gaming', 'gaming', '🎮', 2),
  ('Science', 'science', '🔬', 3),
  ('Art & Design', 'art-design', '🎨', 4),
  ('Music', 'music', '🎵', 5),
  ('Sports', 'sports', '⚽', 6),
  ('Entertainment', 'entertainment', '🎬', 7),
  ('Education', 'education', '📚', 8),
  ('Business', 'business', '💼', 9),
  ('Lifestyle', 'lifestyle', '🌟', 10),
  ('News & Politics', 'news-politics', '📰', 11),
  ('Other', 'other', '📁', 99)
ON CONFLICT (slug) DO NOTHING;

-- Communities table
CREATE TABLE IF NOT EXISTS communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  rules TEXT,
  image_url TEXT,
  banner_url TEXT,
  category_id UUID REFERENCES community_categories(id) ON DELETE SET NULL,
  visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'invite_only')),
  member_limit INT DEFAULT NULL, -- NULL = unlimited
  allow_threads BOOLEAN DEFAULT true,
  require_approval BOOLEAN DEFAULT false, -- For private communities
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Community members table
CREATE TABLE IF NOT EXISTS community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'moderator', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(community_id, user_id)
);

-- Community join requests (for private/invite_only communities)
CREATE TABLE IF NOT EXISTS community_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message TEXT, -- Optional message from requester
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(community_id, user_id)
);

-- Community invites
CREATE TABLE IF NOT EXISTS community_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  max_uses INT DEFAULT NULL, -- NULL = unlimited
  uses INT DEFAULT 0,
  expires_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_communities_slug ON communities(slug);
CREATE INDEX IF NOT EXISTS idx_communities_category ON communities(category_id);
CREATE INDEX IF NOT EXISTS idx_communities_visibility ON communities(visibility);
CREATE INDEX IF NOT EXISTS idx_communities_created_by ON communities(created_by);
CREATE INDEX IF NOT EXISTS idx_communities_created_at ON communities(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_members_community ON community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_community_members_user ON community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_community_members_role ON community_members(role);

CREATE INDEX IF NOT EXISTS idx_community_join_requests_community ON community_join_requests(community_id);
CREATE INDEX IF NOT EXISTS idx_community_join_requests_user ON community_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_community_join_requests_status ON community_join_requests(status);

CREATE INDEX IF NOT EXISTS idx_community_invites_code ON community_invites(code);
CREATE INDEX IF NOT EXISTS idx_community_invites_community ON community_invites(community_id);

-- Full text search for communities
ALTER TABLE communities ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_communities_search ON communities USING GIN(search_vector);

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_community_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for search vector
DROP TRIGGER IF EXISTS community_search_vector_trigger ON communities;
CREATE TRIGGER community_search_vector_trigger
  BEFORE INSERT OR UPDATE ON communities
  FOR EACH ROW
  EXECUTE FUNCTION update_community_search_vector();

-- Function to get member count
CREATE OR REPLACE FUNCTION get_community_member_count(p_community_id UUID)
RETURNS INT AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM community_members WHERE community_id = p_community_id);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if user is member
CREATE OR REPLACE FUNCTION is_community_member(p_community_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM community_members 
    WHERE community_id = p_community_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get user's role in community
CREATE OR REPLACE FUNCTION get_community_role(p_community_id UUID, p_user_id UUID)
RETURNS VARCHAR AS $$
BEGIN
  RETURN (
    SELECT role FROM community_members 
    WHERE community_id = p_community_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if user can create communities (level 3+ or admin)
CREATE OR REPLACE FUNCTION can_create_community(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_level INT;
  v_is_admin BOOLEAN;
BEGIN
  SELECT level, is_admin INTO v_level, v_is_admin
  FROM profiles WHERE id = p_user_id;
  
  RETURN v_is_admin OR COALESCE(v_level, 0) >= 3;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to count user's created communities
CREATE OR REPLACE FUNCTION count_user_communities(p_user_id UUID)
RETURNS INT AS $$
BEGIN
  RETURN (SELECT COUNT(*) FROM communities WHERE created_by = p_user_id);
END;
$$ LANGUAGE plpgsql STABLE;

-- RLS Policies
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_categories ENABLE ROW LEVEL SECURITY;

-- Categories: everyone can read
CREATE POLICY "Anyone can view categories"
  ON community_categories FOR SELECT
  USING (true);

-- Communities: public can be seen by all, private/invite_only only by members
CREATE POLICY "Anyone can view public communities"
  ON communities FOR SELECT
  USING (
    visibility = 'public' 
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM community_members 
      WHERE community_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Level 3+ users can create communities"
  ON communities FOR INSERT
  WITH CHECK (
    can_create_community(auth.uid())
    AND count_user_communities(auth.uid()) < 3 -- Max 3 communities per user
  );

CREATE POLICY "Owner can update community"
  ON communities FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Owner can delete community"
  ON communities FOR DELETE
  USING (created_by = auth.uid());

-- Members: visible to community members
CREATE POLICY "Members visible to community members"
  ON community_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM communities c
      WHERE c.id = community_id 
      AND (c.visibility = 'public' OR is_community_member(community_id, auth.uid()))
    )
  );

CREATE POLICY "Users can join public communities"
  ON community_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM communities 
      WHERE id = community_id 
      AND visibility = 'public'
      AND (member_limit IS NULL OR get_community_member_count(community_id) < member_limit)
    )
  );

CREATE POLICY "Users can leave communities"
  ON community_members FOR DELETE
  USING (
    user_id = auth.uid() 
    AND role != 'owner' -- Owner cannot leave, must transfer or delete
  );

CREATE POLICY "Owner/mod can manage members"
  ON community_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM community_members 
      WHERE community_id = community_members.community_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'moderator')
    )
  );

-- Join requests
CREATE POLICY "Users can view own requests"
  ON community_join_requests FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM community_members 
      WHERE community_id = community_join_requests.community_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'moderator')
    )
  );

CREATE POLICY "Users can create join requests"
  ON community_join_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owner/mod can update requests"
  ON community_join_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM community_members 
      WHERE community_id = community_join_requests.community_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'moderator')
    )
  );

-- Invites
CREATE POLICY "Invites visible to owner/mod"
  ON community_invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM community_members 
      WHERE community_id = community_invites.community_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'moderator')
    )
  );

CREATE POLICY "Owner/mod can create invites"
  ON community_invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM community_members 
      WHERE community_id = community_invites.community_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'moderator')
    )
  );

CREATE POLICY "Owner/mod can delete invites"
  ON community_invites FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM community_members 
      WHERE community_id = community_invites.community_id 
      AND user_id = auth.uid() 
      AND role IN ('owner', 'moderator')
    )
  );

-- Add community_id to threads table (optional relationship)
ALTER TABLE threads ADD COLUMN IF NOT EXISTS community_id UUID REFERENCES communities(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_threads_community ON threads(community_id);

-- Update threads RLS to consider community visibility
-- (Threads in private communities only visible to members)

COMMENT ON TABLE communities IS 'User-created communities';
COMMENT ON TABLE community_members IS 'Community membership with roles';
COMMENT ON TABLE community_join_requests IS 'Pending requests to join private communities';
COMMENT ON TABLE community_invites IS 'Invite codes for invite-only communities';
