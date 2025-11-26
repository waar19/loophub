-- Query to find all references to 'like_count' in the database
-- Run this in Supabase SQL Editor to find what's causing the error

-- 1. Check if like_count columns still exist
SELECT 
  table_name, 
  column_name,
  data_type
FROM information_schema.columns
WHERE column_name = 'like_count'
  AND table_schema = 'public';

-- 2. Check all functions that might reference like_count
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_definition ILIKE '%like_count%'
  AND routine_schema = 'public';

-- 3. Check all triggers
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE action_statement ILIKE '%like_count%'
  AND trigger_schema = 'public';

-- 4. Check all views
SELECT 
  table_name,
  view_definition
FROM information_schema.views
WHERE view_definition ILIKE '%like_count%'
  AND table_schema = 'public';

-- 5. List all triggers on votes, threads, and comments tables
SELECT 
  event_object_table as table_name,
  trigger_name,
  event_manipulation as event,
  action_timing as timing
FROM information_schema.triggers
WHERE event_object_table IN ('votes', 'threads', 'comments')
  AND trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
