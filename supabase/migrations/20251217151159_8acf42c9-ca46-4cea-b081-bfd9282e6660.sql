-- Remove the version WITHOUT parameters that's causing the "function is not unique" conflict
-- This leaves only the version with p_date parameter (which has DEFAULT CURRENT_DATE)
DROP FUNCTION IF EXISTS public.get_user_chart_data_by_hour();