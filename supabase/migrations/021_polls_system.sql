-- =====================================================
-- Migration: Sistema de Encuestas (Polls)
-- Permite a usuarios nivel 3+ crear encuestas en threads
-- =====================================================

-- Primero, asegurar que existe la columna level en profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;

-- Crear índice para level si no existe
CREATE INDEX IF NOT EXISTS idx_profiles_level ON profiles(level);

-- Tabla principal de encuestas
CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES threads(id) ON DELETE CASCADE UNIQUE,
  question TEXT NOT NULL,
  -- Tipo de encuesta
  poll_type VARCHAR(20) DEFAULT 'single' CHECK (poll_type IN ('single', 'multiple')),
  -- Opciones de configuración
  allow_multiple BOOLEAN DEFAULT false,
  max_choices INTEGER DEFAULT 1,
  -- Estado
  is_closed BOOLEAN DEFAULT false,
  closes_at TIMESTAMPTZ,
  -- Quién puede votar (all, level_1, level_2, level_3)
  min_level_to_vote INTEGER DEFAULT 0,
  -- Mostrar resultados
  show_results_before_vote BOOLEAN DEFAULT false,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ,
  -- Creador
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Opciones de la encuesta
CREATE TABLE IF NOT EXISTS poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  option_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Votos de la encuesta
CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  option_id UUID REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Un usuario solo puede votar una vez por opción
  UNIQUE(poll_id, option_id, user_id)
);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_polls_thread_id ON polls(thread_id);
CREATE INDEX IF NOT EXISTS idx_polls_created_by ON polls(created_by);
CREATE INDEX IF NOT EXISTS idx_polls_closes_at ON polls(closes_at) WHERE closes_at IS NOT NULL AND NOT is_closed;
CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON poll_options(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user_id ON poll_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_option_id ON poll_votes(option_id);

-- =====================================================
-- RLS Policies
-- =====================================================

ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

-- Polls: Cualquiera puede ver encuestas de threads públicos
CREATE POLICY "Anyone can view polls" ON polls
  FOR SELECT USING (true);

-- Polls: Usuarios nivel 3+ pueden crear encuestas
CREATE POLICY "Level 3+ users can create polls" ON polls
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND level >= 3
    )
  );

-- Polls: Creador o admin puede actualizar
CREATE POLICY "Creator or admin can update polls" ON polls
  FOR UPDATE USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Polls: Creador o admin puede eliminar
CREATE POLICY "Creator or admin can delete polls" ON polls
  FOR DELETE USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Poll Options: Cualquiera puede ver opciones
CREATE POLICY "Anyone can view poll options" ON poll_options
  FOR SELECT USING (true);

-- Poll Options: Solo creador de poll puede insertar opciones
CREATE POLICY "Poll creator can insert options" ON poll_options
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM polls 
      WHERE id = poll_id AND created_by = auth.uid()
    )
  );

-- Poll Options: Solo creador o admin puede eliminar
CREATE POLICY "Poll creator or admin can delete options" ON poll_options
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM polls 
      WHERE id = poll_id AND (created_by = auth.uid() OR 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
    )
  );

-- Poll Votes: Usuarios autenticados pueden ver votos
CREATE POLICY "Authenticated users can view votes" ON poll_votes
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Poll Votes: Usuarios pueden votar si cumplen nivel mínimo
CREATE POLICY "Users can vote if meeting requirements" ON poll_votes
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM polls p
      JOIN profiles pr ON pr.id = auth.uid()
      WHERE p.id = poll_id 
        AND NOT p.is_closed
        AND (p.closes_at IS NULL OR p.closes_at > NOW())
        AND pr.level >= p.min_level_to_vote
    )
  );

-- Poll Votes: Usuarios pueden eliminar su propio voto
CREATE POLICY "Users can delete own votes" ON poll_votes
  FOR DELETE USING (user_id = auth.uid());

-- =====================================================
-- Funciones Helper
-- =====================================================

-- Función para obtener resultados de encuesta
CREATE OR REPLACE FUNCTION get_poll_results(p_poll_id UUID)
RETURNS TABLE (
  option_id UUID,
  option_text TEXT,
  vote_count BIGINT,
  percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH total_votes AS (
    SELECT COUNT(DISTINCT user_id) as total
    FROM poll_votes
    WHERE poll_id = p_poll_id
  ),
  option_counts AS (
    SELECT 
      po.id,
      po.option_text,
      COUNT(pv.id) as votes
    FROM poll_options po
    LEFT JOIN poll_votes pv ON pv.option_id = po.id
    WHERE po.poll_id = p_poll_id
    GROUP BY po.id, po.option_text, po.option_order
    ORDER BY po.option_order
  )
  SELECT 
    oc.id as option_id,
    oc.option_text,
    oc.votes as vote_count,
    CASE 
      WHEN tv.total > 0 THEN ROUND((oc.votes::NUMERIC / tv.total) * 100, 1)
      ELSE 0
    END as percentage
  FROM option_counts oc
  CROSS JOIN total_votes tv;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si usuario ya votó
CREATE OR REPLACE FUNCTION user_has_voted(p_poll_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM poll_votes
    WHERE poll_id = p_poll_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener votos del usuario en una encuesta
CREATE OR REPLACE FUNCTION get_user_poll_votes(p_poll_id UUID, p_user_id UUID)
RETURNS UUID[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT option_id FROM poll_votes
    WHERE poll_id = p_poll_id AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para cerrar encuestas expiradas (llamar con cron)
CREATE OR REPLACE FUNCTION close_expired_polls()
RETURNS INTEGER AS $$
DECLARE
  closed_count INTEGER;
BEGIN
  UPDATE polls
  SET is_closed = true, closed_at = NOW()
  WHERE closes_at <= NOW() AND NOT is_closed;
  
  GET DIAGNOSTICS closed_count = ROW_COUNT;
  RETURN closed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Trigger para auto-cerrar encuestas
-- =====================================================

-- Verificar al votar si la encuesta está cerrada
CREATE OR REPLACE FUNCTION check_poll_open()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM polls 
    WHERE id = NEW.poll_id 
    AND (is_closed OR (closes_at IS NOT NULL AND closes_at <= NOW()))
  ) THEN
    RAISE EXCEPTION 'Esta encuesta está cerrada';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_poll_open
  BEFORE INSERT ON poll_votes
  FOR EACH ROW
  EXECUTE FUNCTION check_poll_open();

-- Verificar límite de votos para encuestas multiple choice
CREATE OR REPLACE FUNCTION check_vote_limit()
RETURNS TRIGGER AS $$
DECLARE
  poll_record RECORD;
  current_votes INTEGER;
BEGIN
  SELECT * INTO poll_record FROM polls WHERE id = NEW.poll_id;
  
  -- Contar votos actuales del usuario
  SELECT COUNT(*) INTO current_votes
  FROM poll_votes
  WHERE poll_id = NEW.poll_id AND user_id = NEW.user_id;
  
  -- Si es single choice y ya votó, no permitir
  IF poll_record.poll_type = 'single' AND current_votes > 0 THEN
    RAISE EXCEPTION 'Solo puedes elegir una opción en esta encuesta';
  END IF;
  
  -- Si es multiple choice, verificar límite
  IF poll_record.poll_type = 'multiple' AND current_votes >= poll_record.max_choices THEN
    RAISE EXCEPTION 'Has alcanzado el límite de % opciones', poll_record.max_choices;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_vote_limit
  BEFORE INSERT ON poll_votes
  FOR EACH ROW
  EXECUTE FUNCTION check_vote_limit();

-- =====================================================
-- Grants
-- =====================================================

GRANT SELECT ON polls TO authenticated;
GRANT INSERT, UPDATE, DELETE ON polls TO authenticated;
GRANT SELECT ON poll_options TO authenticated;
GRANT INSERT, DELETE ON poll_options TO authenticated;
GRANT SELECT, INSERT, DELETE ON poll_votes TO authenticated;
GRANT EXECUTE ON FUNCTION get_poll_results TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_voted TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_poll_votes TO authenticated;
