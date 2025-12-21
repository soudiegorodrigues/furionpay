-- Drop the ambiguous function that only takes p_period
-- This conflicts with the version that has p_period + optional dates
DROP FUNCTION IF EXISTS public.get_user_stats_by_period(text);

-- Keep only:
-- 1. get_user_stats_by_period(p_user_id uuid, p_period text) - for user-specific stats
-- 2. get_user_stats_by_period(p_period text, p_start_date timestamptz, p_end_date timestamptz) - for global stats with optional dates