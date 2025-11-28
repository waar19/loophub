-- =====================================================
-- Migration: Sistema de Digest Semanal por Email
-- Extiende notification_settings y agrega funciones para el digest
-- =====================================================

-- 1. Agregar columnas para el digest semanal
ALTER TABLE notification_settings 
  ADD COLUMN IF NOT EXISTS digest_frequency VARCHAR(20) DEFAULT 'weekly' 
    CHECK (digest_frequency IN ('daily', 'weekly', 'monthly', 'never')),
  ADD COLUMN IF NOT EXISTS digest_day INTEGER DEFAULT 1 CHECK (digest_day BETWEEN 0 AND 6), -- 0=Sunday, 1=Monday...
  ADD COLUMN IF NOT EXISTS last_digest_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS digest_include_trending BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS digest_include_subscriptions BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS digest_include_activity BOOLEAN DEFAULT TRUE;

-- 2. Crear tabla para rastrear los digests enviados
CREATE TABLE IF NOT EXISTS email_digest_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  email_to TEXT NOT NULL,
  digest_type VARCHAR(20) DEFAULT 'weekly',
  threads_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  notifications_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_digest_log_user ON email_digest_log(user_id);
CREATE INDEX IF NOT EXISTS idx_digest_log_sent ON email_digest_log(sent_at);

-- 3. RLS para email_digest_log
ALTER TABLE email_digest_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own digest logs" ON email_digest_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert digest logs" ON email_digest_log
  FOR INSERT WITH CHECK (true);

-- 4. Función para obtener threads trending de la semana
CREATE OR REPLACE FUNCTION get_weekly_trending_threads(p_limit INTEGER DEFAULT 5)
RETURNS TABLE (
  id UUID,
  title TEXT,
  forum_name TEXT,
  forum_slug TEXT,
  author_username TEXT,
  upvote_count INTEGER,
  comment_count BIGINT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.title,
    f.name AS forum_name,
    f.slug AS forum_slug,
    COALESCE(p.username, 'Anónimo') AS author_username,
    COALESCE(t.upvote_count, 0) AS upvote_count,
    COUNT(c.id) AS comment_count,
    t.created_at
  FROM threads t
  JOIN forums f ON t.forum_id = f.id
  LEFT JOIN profiles p ON t.user_id = p.id
  LEFT JOIN comments c ON c.thread_id = t.id
  WHERE t.created_at > NOW() - INTERVAL '7 days'
    AND (t.is_hidden IS NULL OR t.is_hidden = false)
  GROUP BY t.id, t.title, f.name, f.slug, p.username, t.upvote_count, t.created_at
  ORDER BY t.upvote_count DESC, COUNT(c.id) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Función para obtener actividad reciente de un usuario
CREATE OR REPLACE FUNCTION get_user_weekly_activity(p_user_id UUID)
RETURNS TABLE (
  threads_created INTEGER,
  comments_posted INTEGER,
  upvotes_received INTEGER,
  replies_received INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*)::INTEGER FROM threads WHERE user_id = p_user_id AND created_at > NOW() - INTERVAL '7 days'),
    (SELECT COUNT(*)::INTEGER FROM comments WHERE user_id = p_user_id AND created_at > NOW() - INTERVAL '7 days'),
    (SELECT COALESCE(SUM(
      CASE WHEN v.vote_type = 1 THEN 1 ELSE 0 END
    ), 0)::INTEGER
    FROM votes v
    JOIN threads t ON v.thread_id = t.id
    WHERE t.user_id = p_user_id AND v.created_at > NOW() - INTERVAL '7 days'),
    (SELECT COUNT(*)::INTEGER 
    FROM comments c
    JOIN comments parent ON c.parent_id = parent.id
    WHERE parent.user_id = p_user_id AND c.created_at > NOW() - INTERVAL '7 days');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Función para obtener usuarios que necesitan recibir el digest
CREATE OR REPLACE FUNCTION get_users_for_digest(p_digest_type VARCHAR DEFAULT 'weekly')
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  username TEXT,
  language VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ns.user_id,
    u.email,
    COALESCE(p.username, split_part(u.email, '@', 1)) AS username,
    COALESCE(p.language, 'es') AS language
  FROM notification_settings ns
  JOIN auth.users u ON ns.user_id = u.id
  LEFT JOIN profiles p ON ns.user_id = p.id
  WHERE ns.email_digest = true
    AND ns.digest_frequency = p_digest_type
    AND (
      ns.last_digest_sent_at IS NULL 
      OR (
        p_digest_type = 'daily' AND ns.last_digest_sent_at < NOW() - INTERVAL '1 day'
      ) OR (
        p_digest_type = 'weekly' AND ns.last_digest_sent_at < NOW() - INTERVAL '7 days'
      ) OR (
        p_digest_type = 'monthly' AND ns.last_digest_sent_at < NOW() - INTERVAL '30 days'
      )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Función para actualizar el timestamp del último digest
CREATE OR REPLACE FUNCTION update_last_digest_sent(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE notification_settings
  SET last_digest_sent_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Función para obtener threads de suscripciones del usuario
CREATE OR REPLACE FUNCTION get_user_subscription_threads(p_user_id UUID, p_limit INTEGER DEFAULT 5)
RETURNS TABLE (
  id UUID,
  title TEXT,
  forum_name TEXT,
  forum_slug TEXT,
  author_username TEXT,
  upvote_count INTEGER,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.title,
    f.name AS forum_name,
    f.slug AS forum_slug,
    COALESCE(p.username, 'Anónimo') AS author_username,
    COALESCE(t.upvote_count, 0) AS upvote_count,
    t.created_at
  FROM threads t
  JOIN forums f ON t.forum_id = f.id
  LEFT JOIN profiles p ON t.user_id = p.id
  JOIN subscriptions s ON (s.thread_id = t.id OR s.forum_id = t.forum_id)
  WHERE s.user_id = p_user_id
    AND t.created_at > NOW() - INTERVAL '7 days'
    AND t.user_id != p_user_id -- No incluir propios threads
    AND (t.is_hidden IS NULL OR t.is_hidden = false)
  GROUP BY t.id, t.title, f.name, f.slug, p.username, t.upvote_count, t.created_at
  ORDER BY t.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
