-- Migration 010 Cleanup: Remove old triggers and verify schema
-- Run this AFTER migration 010 if you're experiencing "like_count does not exist" errors

-- 1. Drop ALL old triggers related to likes/votes to avoid conflicts
-- Note: 'likes' table no longer exists (renamed to 'votes')
DROP TRIGGER IF EXISTS update_thread_like_count_trigger ON votes;
DROP TRIGGER IF EXISTS update_comment_like_count_trigger ON votes;

-- Drop old karma triggers if they exist
DROP TRIGGER IF EXISTS update_karma_on_like_trigger ON votes;

-- 2. Drop old functions that might reference like_count
DROP FUNCTION IF EXISTS update_thread_like_count() CASCADE;
DROP FUNCTION IF EXISTS update_comment_like_count() CASCADE;
DROP FUNCTION IF EXISTS update_karma_on_like() CASCADE;

-- 3. Verify that like_count columns don't exist (should have been renamed)
-- If these fail, it means the columns were renamed successfully
DO $$
BEGIN
  -- Check threads
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'threads' AND column_name = 'like_count'
  ) THEN
    RAISE NOTICE 'WARNING: threads.like_count still exists! Migration 010 may not have run completely.';
  ELSE
    RAISE NOTICE 'OK: threads.like_count has been renamed to upvote_count';
  END IF;

  -- Check comments
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'comments' AND column_name = 'like_count'
  ) THEN
    RAISE NOTICE 'WARNING: comments.like_count still exists! Migration 010 may not have run completely.';
  ELSE
    RAISE NOTICE 'OK: comments.like_count has been renamed to upvote_count';
  END IF;
END $$;

-- 4. Verify new triggers exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'update_thread_vote_counts_trigger_insert_update'
  ) THEN
    RAISE EXCEPTION 'ERROR: Trigger update_thread_vote_counts_trigger_insert_update does not exist!';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'update_comment_vote_counts_trigger_insert_update'
  ) THEN
    RAISE EXCEPTION 'ERROR: Trigger update_comment_vote_counts_trigger_insert_update does not exist!';
  END IF;

  RAISE NOTICE 'OK: All required triggers are in place';
END $$;

-- 5. List all current triggers on votes table
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'votes'
ORDER BY trigger_name;
