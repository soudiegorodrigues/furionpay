-- Drop the old function that only has p_limit parameter
-- This resolves the PGRST203 conflict error
DROP FUNCTION IF EXISTS public.get_user_transactions(integer);