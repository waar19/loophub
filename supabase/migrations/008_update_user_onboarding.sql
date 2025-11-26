-- Migration: Update user onboarding to allow username selection
-- This modifies the handle_new_user function to NOT automatically set username
-- Users will be prompted to choose their username on first login

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Updated function: Create profile WITHOUT username (user will choose it later)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url, karma)
  VALUES (
    NEW.id,
    NULL, -- Username will be set during onboarding
    NEW.raw_user_meta_data->>'avatar_url',
    0 -- Initialize karma at 0
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, do nothing
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Allow NULL usernames temporarily (will be required after onboarding)
ALTER TABLE profiles ALTER COLUMN username DROP NOT NULL;

-- Create unique index to prevent duplicate usernames (excluding NULL)
DROP INDEX IF EXISTS idx_profiles_username;
CREATE UNIQUE INDEX idx_profiles_username_unique ON profiles(username) WHERE username IS NOT NULL;
CREATE INDEX idx_profiles_username ON profiles(username) WHERE username IS NOT NULL;

-- Add a check constraint to ensure username meets requirements when set
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS username_format;
ALTER TABLE profiles ADD CONSTRAINT username_format 
  CHECK (
    username IS NULL OR (
      length(username) >= 3 AND 
      length(username) <= 30 AND
      username ~ '^[a-zA-Z0-9_]+$'
    )
  );

-- Update RLS policies to allow users to update their own username during onboarding
DROP POLICY IF EXISTS "Users can update own username during onboarding" ON profiles;
CREATE POLICY "Users can update own username during onboarding"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
