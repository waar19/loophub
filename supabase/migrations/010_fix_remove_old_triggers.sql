-- Fix: Remove old triggers that reference like_count
-- These are the old notification and karma triggers from before migration 010

-- 1. Drop old notification triggers (replaced by new voting system)
DROP TRIGGER IF EXISTS on_like_created ON votes;
DROP TRIGGER IF EXISTS on_like_deleted ON votes;

-- 2. Drop old karma trigger (replaced by update_karma_for_*_vote triggers)
DROP TRIGGER IF EXISTS trigger_handle_like_karma ON votes;

-- 3. Drop the old functions that these triggers used
DROP FUNCTION IF EXISTS handle_like_created() CASCADE;
DROP FUNCTION IF EXISTS handle_like_deleted() CASCADE;
DROP FUNCTION IF EXISTS handle_like_karma() CASCADE;

-- 4. Verify only the correct triggers remain
SELECT 
  trigger_name,
  event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'votes'
  AND trigger_schema = 'public'
ORDER BY trigger_name;

-- You should see exactly these 8 triggers:
-- ✓ update_comment_vote_counts_trigger_delete (DELETE)
-- ✓ update_comment_vote_counts_trigger_insert_update (INSERT, UPDATE)
-- ✓ update_karma_for_comment_vote_trigger_delete (DELETE)
-- ✓ update_karma_for_comment_vote_trigger_insert_update (INSERT, UPDATE)
-- ✓ update_karma_for_thread_vote_trigger_delete (DELETE)
-- ✓ update_karma_for_thread_vote_trigger_insert_update (INSERT, UPDATE)
-- ✓ update_thread_vote_counts_trigger_delete (DELETE)
-- ✓ update_thread_vote_counts_trigger_insert_update (INSERT, UPDATE)
