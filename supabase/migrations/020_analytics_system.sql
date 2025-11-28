-- Analytics System Migration
-- Tracking de vistas, métricas y estadísticas

-- Tabla para tracking de vistas de threads
CREATE TABLE IF NOT EXISTS thread_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_hash TEXT, -- Hash del IP para usuarios no autenticados
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_thread_views_thread_id ON thread_views(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_views_created_at ON thread_views(created_at);
CREATE INDEX IF NOT EXISTS idx_thread_views_user_id ON thread_views(user_id);

-- Tabla para métricas diarias agregadas
CREATE TABLE IF NOT EXISTS daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  total_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  total_threads INTEGER DEFAULT 0,
  new_threads INTEGER DEFAULT 0,
  total_comments INTEGER DEFAULT 0,
  new_comments INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  total_votes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON daily_metrics(date);

-- Tabla para badges/logros
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT, -- Emoji o nombre de icono
  color TEXT DEFAULT '#6366f1', -- Color del badge
  category TEXT DEFAULT 'achievement', -- achievement, milestone, special
  requirement_type TEXT, -- threads, comments, karma, days, special
  requirement_value INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla para badges de usuarios
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id);

-- Añadir columna view_count a threads si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'threads' AND column_name = 'view_count'
  ) THEN
    ALTER TABLE threads ADD COLUMN view_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Insertar badges predeterminados
INSERT INTO badges (name, slug, description, icon, color, category, requirement_type, requirement_value) VALUES
  -- Badges de threads
  ('First Post', 'first-post', 'Created your first thread', '📝', '#10b981', 'milestone', 'threads', 1),
  ('Storyteller', 'storyteller', 'Created 10 threads', '📚', '#3b82f6', 'achievement', 'threads', 10),
  ('Prolific Writer', 'prolific-writer', 'Created 50 threads', '✍️', '#8b5cf6', 'achievement', 'threads', 50),
  ('Content Creator', 'content-creator', 'Created 100 threads', '🎯', '#f59e0b', 'achievement', 'threads', 100),
  
  -- Badges de comentarios
  ('First Comment', 'first-comment', 'Left your first comment', '💬', '#06b6d4', 'milestone', 'comments', 1),
  ('Conversationalist', 'conversationalist', 'Left 50 comments', '🗣️', '#3b82f6', 'achievement', 'comments', 50),
  ('Discussion Master', 'discussion-master', 'Left 100 comments', '💎', '#8b5cf6', 'achievement', 'comments', 100),
  ('Community Pillar', 'community-pillar', 'Left 500 comments', '🏛️', '#f59e0b', 'achievement', 'comments', 500),
  
  -- Badges de karma/reputación
  ('Rising Star', 'rising-star', 'Earned 100 reputation', '⭐', '#eab308', 'achievement', 'karma', 100),
  ('Popular', 'popular', 'Earned 500 reputation', '🌟', '#f97316', 'achievement', 'karma', 500),
  ('Influential', 'influential', 'Earned 1000 reputation', '💫', '#ef4444', 'achievement', 'karma', 1000),
  ('Legend', 'legend', 'Earned 5000 reputation', '👑', '#dc2626', 'achievement', 'karma', 5000),
  
  -- Badges de tiempo
  ('Newcomer', 'newcomer', 'Member for 1 day', '🌱', '#22c55e', 'milestone', 'days', 1),
  ('Regular', 'regular', 'Member for 30 days', '🌿', '#16a34a', 'achievement', 'days', 30),
  ('Veteran', 'veteran', 'Member for 365 days', '🌳', '#15803d', 'achievement', 'days', 365),
  
  -- Badges especiales
  ('Verified', 'verified', 'Verified account', '✅', '#3b82f6', 'special', 'special', NULL),
  ('Early Adopter', 'early-adopter', 'Joined during beta', '🚀', '#6366f1', 'special', 'special', NULL),
  ('Bug Hunter', 'bug-hunter', 'Reported a critical bug', '🐛', '#ec4899', 'special', 'special', NULL),
  ('Supporter', 'supporter', 'Supported the platform', '❤️', '#ef4444', 'special', 'special', NULL)
ON CONFLICT (slug) DO NOTHING;

-- Función para registrar vista de thread
CREATE OR REPLACE FUNCTION record_thread_view(
  p_thread_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_ip_hash TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_referrer TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  -- Insertar vista
  INSERT INTO thread_views (thread_id, user_id, ip_hash, user_agent, referrer)
  VALUES (p_thread_id, p_user_id, p_ip_hash, p_user_agent, p_referrer);
  
  -- Incrementar contador en thread
  UPDATE threads SET view_count = COALESCE(view_count, 0) + 1 WHERE id = p_thread_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para calcular métricas diarias
CREATE OR REPLACE FUNCTION calculate_daily_metrics(p_date DATE DEFAULT CURRENT_DATE) 
RETURNS VOID AS $$
DECLARE
  v_total_users INTEGER;
  v_new_users INTEGER;
  v_active_users INTEGER;
  v_total_threads INTEGER;
  v_new_threads INTEGER;
  v_total_comments INTEGER;
  v_new_comments INTEGER;
  v_total_views INTEGER;
  v_total_votes INTEGER;
BEGIN
  -- Total usuarios
  SELECT COUNT(*) INTO v_total_users FROM profiles;
  
  -- Nuevos usuarios del día
  SELECT COUNT(*) INTO v_new_users 
  FROM profiles 
  WHERE DATE(created_at) = p_date;
  
  -- Usuarios activos (con actividad en los últimos 7 días)
  SELECT COUNT(DISTINCT user_id) INTO v_active_users
  FROM (
    SELECT user_id FROM threads WHERE DATE(created_at) >= p_date - INTERVAL '7 days'
    UNION
    SELECT user_id FROM comments WHERE DATE(created_at) >= p_date - INTERVAL '7 days'
    UNION
    SELECT user_id FROM votes WHERE DATE(created_at) >= p_date - INTERVAL '7 days'
  ) activity
  WHERE user_id IS NOT NULL;
  
  -- Total threads
  SELECT COUNT(*) INTO v_total_threads FROM threads WHERE is_hidden = false;
  
  -- Nuevos threads del día
  SELECT COUNT(*) INTO v_new_threads 
  FROM threads 
  WHERE DATE(created_at) = p_date AND is_hidden = false;
  
  -- Total comentarios
  SELECT COUNT(*) INTO v_total_comments FROM comments;
  
  -- Nuevos comentarios del día
  SELECT COUNT(*) INTO v_new_comments 
  FROM comments 
  WHERE DATE(created_at) = p_date;
  
  -- Total vistas del día
  SELECT COUNT(*) INTO v_total_views 
  FROM thread_views 
  WHERE DATE(created_at) = p_date;
  
  -- Total votos del día
  SELECT COUNT(*) INTO v_total_votes 
  FROM votes 
  WHERE DATE(created_at) = p_date;
  
  -- Insertar o actualizar métricas
  INSERT INTO daily_metrics (
    date, total_users, new_users, active_users, 
    total_threads, new_threads, total_comments, new_comments,
    total_views, total_votes, updated_at
  ) VALUES (
    p_date, v_total_users, v_new_users, v_active_users,
    v_total_threads, v_new_threads, v_total_comments, v_new_comments,
    v_total_views, v_total_votes, NOW()
  )
  ON CONFLICT (date) DO UPDATE SET
    total_users = EXCLUDED.total_users,
    new_users = EXCLUDED.new_users,
    active_users = EXCLUDED.active_users,
    total_threads = EXCLUDED.total_threads,
    new_threads = EXCLUDED.new_threads,
    total_comments = EXCLUDED.total_comments,
    new_comments = EXCLUDED.new_comments,
    total_views = EXCLUDED.total_views,
    total_votes = EXCLUDED.total_votes,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para otorgar badges automáticamente
CREATE OR REPLACE FUNCTION check_and_award_badges(p_user_id UUID)
RETURNS TABLE(badge_name TEXT, badge_slug TEXT) AS $$
DECLARE
  v_thread_count INTEGER;
  v_comment_count INTEGER;
  v_reputation INTEGER;
  v_days_member INTEGER;
  badge_record RECORD;
BEGIN
  -- Contar threads del usuario
  SELECT COUNT(*) INTO v_thread_count 
  FROM threads WHERE user_id = p_user_id AND is_hidden = false;
  
  -- Contar comentarios del usuario
  SELECT COUNT(*) INTO v_comment_count 
  FROM comments WHERE user_id = p_user_id;
  
  -- Obtener reputación
  SELECT COALESCE(reputation, 0) INTO v_reputation 
  FROM profiles WHERE id = p_user_id;
  
  -- Calcular días como miembro
  SELECT EXTRACT(DAY FROM NOW() - created_at)::INTEGER INTO v_days_member
  FROM profiles WHERE id = p_user_id;
  
  -- Verificar cada badge
  FOR badge_record IN 
    SELECT b.id, b.name, b.slug, b.requirement_type, b.requirement_value
    FROM badges b
    WHERE b.is_active = true 
    AND b.requirement_type IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM user_badges ub 
      WHERE ub.user_id = p_user_id AND ub.badge_id = b.id
    )
  LOOP
    -- Verificar si cumple requisito
    IF (badge_record.requirement_type = 'threads' AND v_thread_count >= badge_record.requirement_value) OR
       (badge_record.requirement_type = 'comments' AND v_comment_count >= badge_record.requirement_value) OR
       (badge_record.requirement_type = 'karma' AND v_reputation >= badge_record.requirement_value) OR
       (badge_record.requirement_type = 'days' AND v_days_member >= badge_record.requirement_value)
    THEN
      -- Otorgar badge
      INSERT INTO user_badges (user_id, badge_id)
      VALUES (p_user_id, badge_record.id)
      ON CONFLICT DO NOTHING;
      
      badge_name := badge_record.name;
      badge_slug := badge_record.slug;
      RETURN NEXT;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE thread_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Políticas para thread_views
CREATE POLICY "Anyone can insert views" ON thread_views
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all views" ON thread_views
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Políticas para daily_metrics
CREATE POLICY "Admins can view metrics" ON daily_metrics
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "System can insert metrics" ON daily_metrics
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update metrics" ON daily_metrics
  FOR UPDATE USING (true);

-- Políticas para badges
CREATE POLICY "Anyone can view badges" ON badges
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage badges" ON badges
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Políticas para user_badges
CREATE POLICY "Anyone can view user badges" ON user_badges
  FOR SELECT USING (true);

CREATE POLICY "System can insert user badges" ON user_badges
  FOR INSERT WITH CHECK (true);
