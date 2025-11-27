-- Migration: 019_advanced_search.sql
-- Description: Adds full-text search capabilities and indexes

-- 1. Add tsvector columns for full-text search
ALTER TABLE threads ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2. Create function to update thread search vector
CREATE OR REPLACE FUNCTION update_thread_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('spanish', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('spanish', coalesce(NEW.content, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create function to update comment search vector
CREATE OR REPLACE FUNCTION update_comment_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('spanish', coalesce(NEW.content, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create triggers
DROP TRIGGER IF EXISTS thread_search_vector_update ON threads;
CREATE TRIGGER thread_search_vector_update
  BEFORE INSERT OR UPDATE OF title, content ON threads
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_search_vector();

DROP TRIGGER IF EXISTS comment_search_vector_update ON comments;
CREATE TRIGGER comment_search_vector_update
  BEFORE INSERT OR UPDATE OF content ON comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_search_vector();

-- 5. Update existing records
UPDATE threads SET search_vector = 
  setweight(to_tsvector('spanish', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('spanish', coalesce(content, '')), 'B');

UPDATE comments SET search_vector = 
  to_tsvector('spanish', coalesce(content, ''));

-- 6. Create GIN indexes for fast full-text search
CREATE INDEX IF NOT EXISTS idx_threads_search ON threads USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_comments_search ON comments USING GIN(search_vector);

-- 7. Additional indexes for filtering
CREATE INDEX IF NOT EXISTS idx_threads_created_at ON threads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_upvote_count ON threads(upvote_count DESC);
CREATE INDEX IF NOT EXISTS idx_threads_forum_created ON threads(forum_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_user_created ON threads(user_id, created_at DESC);

-- 8. Function for advanced search
CREATE OR REPLACE FUNCTION search_threads_advanced(
  p_query TEXT DEFAULT NULL,
  p_forum_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_tag_ids UUID[] DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'relevance', -- relevance, newest, oldest, most_voted, most_comments
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  user_id UUID,
  forum_id UUID,
  upvote_count INTEGER,
  downvote_count INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  rank REAL
) AS $$
DECLARE
  search_query tsquery;
BEGIN
  -- Build search query if provided
  IF p_query IS NOT NULL AND p_query != '' THEN
    search_query := plainto_tsquery('spanish', p_query);
  END IF;

  RETURN QUERY
  SELECT 
    t.id,
    t.title,
    t.content,
    t.user_id,
    t.forum_id,
    t.upvote_count,
    t.downvote_count,
    t.created_at,
    t.updated_at,
    CASE 
      WHEN search_query IS NOT NULL THEN ts_rank(t.search_vector, search_query)
      ELSE 1.0
    END as rank
  FROM threads t
  LEFT JOIN thread_tags tt ON t.id = tt.thread_id
  WHERE 
    -- Text search (if query provided)
    (search_query IS NULL OR t.search_vector @@ search_query)
    -- Forum filter
    AND (p_forum_id IS NULL OR t.forum_id = p_forum_id)
    -- User filter
    AND (p_user_id IS NULL OR t.user_id = p_user_id)
    -- Tag filter
    AND (p_tag_ids IS NULL OR tt.tag_id = ANY(p_tag_ids))
    -- Date range filter
    AND (p_date_from IS NULL OR t.created_at >= p_date_from)
    AND (p_date_to IS NULL OR t.created_at <= p_date_to)
  GROUP BY t.id
  ORDER BY
    CASE p_sort_by
      WHEN 'relevance' THEN 
        CASE WHEN search_query IS NOT NULL THEN -ts_rank(t.search_vector, search_query) ELSE 0 END
      ELSE 0
    END,
    CASE p_sort_by
      WHEN 'newest' THEN extract(epoch from t.created_at) * -1
      WHEN 'oldest' THEN extract(epoch from t.created_at)
      WHEN 'most_voted' THEN -(t.upvote_count - t.downvote_count)
      ELSE 0
    END
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Function to count search results
CREATE OR REPLACE FUNCTION count_search_threads(
  p_query TEXT DEFAULT NULL,
  p_forum_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_tag_ids UUID[] DEFAULT NULL,
  p_date_from TIMESTAMPTZ DEFAULT NULL,
  p_date_to TIMESTAMPTZ DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  search_query tsquery;
  result_count INTEGER;
BEGIN
  IF p_query IS NOT NULL AND p_query != '' THEN
    search_query := plainto_tsquery('spanish', p_query);
  END IF;

  SELECT COUNT(DISTINCT t.id)::INTEGER INTO result_count
  FROM threads t
  LEFT JOIN thread_tags tt ON t.id = tt.thread_id
  WHERE 
    (search_query IS NULL OR t.search_vector @@ search_query)
    AND (p_forum_id IS NULL OR t.forum_id = p_forum_id)
    AND (p_user_id IS NULL OR t.user_id = p_user_id)
    AND (p_tag_ids IS NULL OR tt.tag_id = ANY(p_tag_ids))
    AND (p_date_from IS NULL OR t.created_at >= p_date_from)
    AND (p_date_to IS NULL OR t.created_at <= p_date_to);

  RETURN result_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Function to search comments
CREATE OR REPLACE FUNCTION search_comments_advanced(
  p_query TEXT,
  p_thread_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  user_id UUID,
  thread_id UUID,
  parent_id UUID,
  created_at TIMESTAMPTZ,
  thread_title TEXT,
  rank REAL
) AS $$
DECLARE
  search_query tsquery;
BEGIN
  search_query := plainto_tsquery('spanish', p_query);

  RETURN QUERY
  SELECT 
    c.id,
    c.content,
    c.user_id,
    c.thread_id,
    c.parent_id,
    c.created_at,
    t.title as thread_title,
    ts_rank(c.search_vector, search_query) as rank
  FROM comments c
  JOIN threads t ON c.thread_id = t.id
  WHERE 
    c.search_vector @@ search_query
    AND (p_thread_id IS NULL OR c.thread_id = p_thread_id)
    AND (p_user_id IS NULL OR c.user_id = p_user_id)
  ORDER BY ts_rank(c.search_vector, search_query) DESC, c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Grant permissions
GRANT EXECUTE ON FUNCTION search_threads_advanced TO authenticated, anon;
GRANT EXECUTE ON FUNCTION count_search_threads TO authenticated, anon;
GRANT EXECUTE ON FUNCTION search_comments_advanced TO authenticated, anon;
