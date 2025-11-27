-- Migration: 017_tags_system.sql
-- Description: Adds tags/labels functionality for threads

-- 1. Create tags table
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#6B7280', -- Default gray color
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 2. Create thread_tags junction table
CREATE TABLE IF NOT EXISTS thread_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(thread_id, tag_id)
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);
CREATE INDEX IF NOT EXISTS idx_tags_usage ON tags(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_thread_tags_thread ON thread_tags(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_tags_tag ON thread_tags(tag_id);

-- 4. Enable RLS
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE thread_tags ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for tags
DROP POLICY IF EXISTS "Anyone can view tags" ON tags;
CREATE POLICY "Anyone can view tags"
  ON tags FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can create tags" ON tags;
CREATE POLICY "Authenticated users can create tags"
  ON tags FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 6. RLS Policies for thread_tags
DROP POLICY IF EXISTS "Anyone can view thread_tags" ON thread_tags;
CREATE POLICY "Anyone can view thread_tags"
  ON thread_tags FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Thread owner can manage tags" ON thread_tags;
CREATE POLICY "Thread owner can manage tags"
  ON thread_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM threads 
      WHERE id = thread_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Thread owner can delete tags" ON thread_tags;
CREATE POLICY "Thread owner can delete tags"
  ON thread_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM threads 
      WHERE id = thread_id AND user_id = auth.uid()
    )
  );

-- 7. Function to create or get tag
CREATE OR REPLACE FUNCTION get_or_create_tag(
  p_name TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_tag_id UUID;
  v_slug TEXT;
BEGIN
  -- Generate slug
  v_slug := LOWER(REGEXP_REPLACE(TRIM(p_name), '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := TRIM(v_slug, '-');
  
  -- Try to get existing tag
  SELECT id INTO v_tag_id
  FROM tags
  WHERE slug = v_slug OR LOWER(name) = LOWER(TRIM(p_name));
  
  IF v_tag_id IS NOT NULL THEN
    RETURN v_tag_id;
  END IF;
  
  -- Create new tag
  INSERT INTO tags (name, slug, created_by)
  VALUES (TRIM(p_name), v_slug, p_user_id)
  RETURNING id INTO v_tag_id;
  
  RETURN v_tag_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Function to add tag to thread
CREATE OR REPLACE FUNCTION add_tag_to_thread(
  p_thread_id UUID,
  p_tag_name TEXT,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_tag_id UUID;
BEGIN
  -- Verify thread ownership
  IF NOT EXISTS (SELECT 1 FROM threads WHERE id = p_thread_id AND user_id = p_user_id) THEN
    RETURN FALSE;
  END IF;
  
  -- Get or create tag
  v_tag_id := get_or_create_tag(p_tag_name, p_user_id);
  
  -- Add to thread (ignore if already exists)
  INSERT INTO thread_tags (thread_id, tag_id)
  VALUES (p_thread_id, v_tag_id)
  ON CONFLICT (thread_id, tag_id) DO NOTHING;
  
  IF FOUND THEN
    -- Update usage count
    UPDATE tags SET usage_count = usage_count + 1 WHERE id = v_tag_id;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Function to remove tag from thread
CREATE OR REPLACE FUNCTION remove_tag_from_thread(
  p_thread_id UUID,
  p_tag_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Verify thread ownership
  IF NOT EXISTS (SELECT 1 FROM threads WHERE id = p_thread_id AND user_id = p_user_id) THEN
    RETURN FALSE;
  END IF;
  
  -- Remove from thread
  DELETE FROM thread_tags
  WHERE thread_id = p_thread_id AND tag_id = p_tag_id;
  
  IF FOUND THEN
    -- Update usage count
    UPDATE tags SET usage_count = GREATEST(0, usage_count - 1) WHERE id = p_tag_id;
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Function to get popular tags
CREATE OR REPLACE FUNCTION get_popular_tags(p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  color TEXT,
  usage_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.name, t.slug, t.color, t.usage_count
  FROM tags t
  WHERE t.usage_count > 0
  ORDER BY t.usage_count DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Function to get tags for a thread
CREATE OR REPLACE FUNCTION get_thread_tags(p_thread_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  color TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.name, t.slug, t.color
  FROM tags t
  JOIN thread_tags tt ON t.id = tt.tag_id
  WHERE tt.thread_id = p_thread_id
  ORDER BY t.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Function to search tags
CREATE OR REPLACE FUNCTION search_tags(
  p_query TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  color TEXT,
  usage_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.name, t.slug, t.color, t.usage_count
  FROM tags t
  WHERE t.name ILIKE p_query || '%' OR t.slug ILIKE p_query || '%'
  ORDER BY t.usage_count DESC, t.name
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Grant permissions
GRANT EXECUTE ON FUNCTION get_or_create_tag(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION add_tag_to_thread(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_tag_from_thread(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_popular_tags(INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_thread_tags(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION search_tags(TEXT, INTEGER) TO authenticated;

-- 14. Insert some default tags
INSERT INTO tags (name, slug, color) VALUES
  ('Pregunta', 'pregunta', '#3B82F6'),
  ('Discusión', 'discusion', '#8B5CF6'),
  ('Tutorial', 'tutorial', '#10B981'),
  ('Noticia', 'noticia', '#F59E0B'),
  ('Ayuda', 'ayuda', '#EF4444'),
  ('Recurso', 'recurso', '#06B6D4'),
  ('Opinión', 'opinion', '#EC4899'),
  ('Off-topic', 'off-topic', '#6B7280')
ON CONFLICT (slug) DO NOTHING;
