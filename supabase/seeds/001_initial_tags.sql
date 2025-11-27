-- Seed: Initial tags for the tagging system
-- Run this after 017_tags_system.sql migration

INSERT INTO tags (name, slug, color, description) VALUES
  ('Minimalismo', 'minimalismo', '#3B82F6', 'Discusiones sobre minimalismo digital y en la vida'),
  ('Productividad', 'productividad', '#10B981', 'Tips y herramientas para ser más productivo'),
  ('Apps', 'apps', '#8B5CF6', 'Aplicaciones y software recomendado'),
  ('Hardware', 'hardware', '#F59E0B', 'Dispositivos, gadgets y equipos'),
  ('Organización', 'organizacion', '#EC4899', 'Métodos de organización personal'),
  ('Hábitos', 'habitos', '#06B6D4', 'Creación y mantenimiento de hábitos'),
  ('Lectura', 'lectura', '#84CC16', 'Libros, artículos y recursos de lectura'),
  ('Finanzas', 'finanzas', '#F97316', 'Finanzas personales y minimalismo financiero'),
  ('Salud', 'salud', '#EF4444', 'Bienestar físico y mental'),
  ('Pregunta', 'pregunta', '#6366F1', 'Consultas a la comunidad'),
  ('Tutorial', 'tutorial', '#14B8A6', 'Guías y tutoriales paso a paso'),
  ('Discusión', 'discusion', '#A855F7', 'Debates y conversaciones abiertas'),
  ('Recurso', 'recurso', '#0EA5E9', 'Links y recursos útiles'),
  ('Experiencia', 'experiencia', '#F472B6', 'Experiencias personales y testimonios')
ON CONFLICT (slug) DO NOTHING;
