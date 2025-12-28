-- Remove a versão antiga da função com parâmetros TIMESTAMP WITH TIME ZONE
-- para resolver o conflito de overloading
DROP FUNCTION IF EXISTS public.get_platform_revenue_stats_custom_range(timestamp with time zone, timestamp with time zone);