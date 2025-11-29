-- =====================================================
-- MIGRATION 027: Community Customization
-- =====================================================
-- Adds theme colors, custom CSS, and structured rules
-- =====================================================

-- Add customization columns to communities
ALTER TABLE communities 
ADD COLUMN IF NOT EXISTS theme_color VARCHAR(7) DEFAULT '#6366f1',
ADD COLUMN IF NOT EXISTS accent_color VARCHAR(7) DEFAULT '#8b5cf6',
ADD COLUMN IF NOT EXISTS text_color VARCHAR(7) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS custom_css TEXT DEFAULT NULL;

-- Create community_rules table for structured rules
CREATE TABLE IF NOT EXISTS community_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster rule lookups
CREATE INDEX IF NOT EXISTS idx_community_rules_community ON community_rules(community_id);
CREATE INDEX IF NOT EXISTS idx_community_rules_order ON community_rules(community_id, sort_order);

-- RLS policies for community_rules
ALTER TABLE community_rules ENABLE ROW LEVEL SECURITY;

-- Anyone can read rules
CREATE POLICY "Anyone can view community rules"
  ON community_rules FOR SELECT
  USING (true);

-- Only community owner/mods can manage rules
CREATE POLICY "Community admins can insert rules"
  ON community_rules FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = community_rules.community_id
      AND community_members.user_id = auth.uid()
      AND community_members.role IN ('owner', 'moderator')
    )
  );

CREATE POLICY "Community admins can update rules"
  ON community_rules FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = community_rules.community_id
      AND community_members.user_id = auth.uid()
      AND community_members.role IN ('owner', 'moderator')
    )
  );

CREATE POLICY "Community admins can delete rules"
  ON community_rules FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM community_members
      WHERE community_members.community_id = community_rules.community_id
      AND community_members.user_id = auth.uid()
      AND community_members.role IN ('owner', 'moderator')
    )
  );

-- Function to get community with theme
CREATE OR REPLACE FUNCTION get_community_theme(community_slug TEXT)
RETURNS TABLE (
  theme_color VARCHAR(7),
  accent_color VARCHAR(7),
  text_color VARCHAR(7),
  custom_css TEXT,
  banner_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.theme_color,
    c.accent_color,
    c.text_color,
    c.custom_css,
    c.banner_url
  FROM communities c
  WHERE c.slug = community_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
