-- Find what's causing the "like_count does not exist" error

-- 1. Verify column names in threads and comments
SELECT 
  'threads' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'threads'
  AND column_name IN ('like_count', 'upvote_count', 'downvote_count', 'score')
  AND table_schema = 'public'

UNION ALL

SELECT 
  'comments' as table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'comments'
  AND column_name IN ('like_count', 'upvote_count', 'downvote_count', 'score')
  AND table_schema = 'public'
ORDER BY table_name, column_name;

-- 2. List ALL functions (they might reference like_count)
SELECT 
  routine_name,
  CASE 
    WHEN routine_definition ILIKE '%like_count%' THEN '⚠️ REFERENCES like_count'
    ELSE '✓ OK'
  END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
ORDER BY status DESC, routine_name;

-- 3. List ALL triggers on votes table
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_orientation
FROM information_schema.triggers
WHERE event_object_table = 'votes'
  AND trigger_schema = 'public'
ORDER BY trigger_name;

-- 4. Check if there are any triggers on threads or comments that might reference like_count
SELECT 
  event_object_table as table_name,
  trigger_name,
  event_manipulation
FROM information_schema.triggers
WHERE event_object_table IN ('threads', 'comments')
  AND trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
