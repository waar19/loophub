-- Seed Minimalist Digital & Personal Organization Forums
-- Run this in your Supabase SQL Editor after migrations 001, 002, 003

-- Delete old forums (optional - comment out if you want to keep them)
-- DELETE FROM forums WHERE slug IN ('general', 'technology', 'random');

-- Insert new forums focused on Minimalism Digital & Personal Organization
INSERT INTO forums (name, slug, created_at) VALUES
  (
    'Minimalismo Digital',
    'minimalismo-digital',
    NOW() - INTERVAL '5 days'
  ),
  (
    'Organización Personal',
    'organizacion-personal',
    NOW() - INTERVAL '4 days'
  ),
  (
    'Productividad Inteligente',
    'productividad-inteligente',
    NOW() - INTERVAL '3 days'
  ),
  (
    'Apps y Herramientas',
    'apps-herramientas',
    NOW() - INTERVAL '2 days'
  ),
  (
    'Workflows & Setup',
    'workflows-setup',
    NOW() - INTERVAL '1 day'
  )
ON CONFLICT (slug) DO NOTHING;

-- Note: Threads and comments will be created via a separate script
-- or through the application interface after user registration

