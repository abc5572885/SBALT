-- ============================================================================
-- Database Verification Script
-- Run this after DATABASE_SETUP.sql to verify everything was created correctly
-- ============================================================================

-- 1. Check all tables exist
SELECT 
  'Tables Check' AS check_type,
  COUNT(*) AS count,
  string_agg(table_name, ', ' ORDER BY table_name) AS details
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
AND table_name IN ('teams', 'players', 'games', 'news', 'events', 'registrations', 'comments', 'likes');

-- 2. Check RLS is enabled on all tables
SELECT 
  'RLS Check' AS check_type,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('teams', 'players', 'games', 'news', 'events', 'registrations', 'comments', 'likes')
ORDER BY tablename;

-- 3. Count RLS policies per table
SELECT 
  'RLS Policies Count' AS check_type,
  tablename,
  COUNT(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- 4. Check indexes exist
SELECT 
  'Indexes Check' AS check_type,
  tablename,
  COUNT(*) AS index_count
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('teams', 'players', 'games', 'news', 'events', 'registrations', 'comments', 'likes')
GROUP BY tablename
ORDER BY tablename;

-- 5. Check triggers exist
SELECT 
  'Triggers Check' AS check_type,
  event_object_table AS table_name,
  trigger_name,
  event_manipulation AS event
FROM information_schema.triggers
WHERE event_object_schema = 'public'
AND event_object_table IN ('teams', 'players', 'games', 'events', 'registrations', 'comments')
ORDER BY event_object_table, trigger_name;

-- 6. Check helper functions exist
SELECT 
  'Functions Check' AS check_type,
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION'
AND routine_name IN ('update_updated_at_column', 'get_like_count', 'has_user_liked', 'get_registration_count')
ORDER BY routine_name;

-- 7. Check views exist
SELECT 
  'Views Check' AS check_type,
  table_name
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- 8. Summary
SELECT 
  'SUMMARY' AS check_type,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name IN ('teams', 'players', 'games', 'news', 'events', 'registrations', 'comments', 'likes')) AS tables_count,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') AS policies_count,
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('teams', 'players', 'games', 'news', 'events', 'registrations', 'comments', 'likes')) AS indexes_count,
  (SELECT COUNT(*) FROM information_schema.triggers WHERE event_object_schema = 'public' AND event_object_table IN ('teams', 'players', 'games', 'events', 'registrations', 'comments')) AS triggers_count,
  (SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION' AND routine_name IN ('update_updated_at_column', 'get_like_count', 'has_user_liked', 'get_registration_count')) AS functions_count,
  (SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public') AS views_count;

