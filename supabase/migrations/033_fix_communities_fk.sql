-- Fix missing relationship between communities and profiles
-- This allows PostgREST to embed profile data for community creators

-- Add foreign key constraint linking communities.created_by to profiles.id
ALTER TABLE communities
ADD CONSTRAINT communities_created_by_profiles_fkey
FOREIGN KEY (created_by)
REFERENCES profiles(id)
ON DELETE CASCADE;
