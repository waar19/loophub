-- Seed Minimalist Digital & Personal Organization Forums
-- Run this in your Supabase SQL Editor after migrations 001, 002, 003

-- Add description column if it doesn't exist
ALTER TABLE forums
ADD COLUMN IF NOT EXISTS description TEXT;

-- Delete old forums (optional - comment out if you want to keep them)
-- DELETE FROM forums WHERE slug IN ('general', 'technology', 'random');

-- Insert new forums focused on Minimalism Digital & Personal Organization
INSERT INTO forums (name, slug, description, created_at) VALUES
  (
    'Minimalismo Digital',
    'minimalismo-digital',
    'Limpieza de vida digital, archivos, hábitos tecnológicos.',
    NOW() - INTERVAL '5 days'
  ),
  (
    'Organización Personal',
    'organizacion-personal',
    'Métodos, rutinas, sistemas de organización realistas.',
    NOW() - INTERVAL '4 days'
  ),
  (
    'Productividad Inteligente',
    'productividad-inteligente',
    'Sin fanatismo, sin gurús; técnicas aterrizadas.',
    NOW() - INTERVAL '3 days'
  ),
  (
    'Apps y Herramientas',
    'apps-herramientas',
    'Notion, Obsidian, Todoist, Google Workspace, Apple Notes.',
    NOW() - INTERVAL '2 days'
  ),
  (
    'Workflows & Setup',
    'workflows-setup',
    'Rutinas, automatizaciones, dispositivos, ambientes de trabajo.',
    NOW() - INTERVAL '1 day'
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- Note: Threads and comments will be created via a separate script
-- or through the application interface after user registration

