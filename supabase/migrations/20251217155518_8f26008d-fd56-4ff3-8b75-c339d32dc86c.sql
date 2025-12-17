-- Drop existing functions first (required to change return type)
DROP FUNCTION IF EXISTS public.get_chart_data_by_day(integer);
DROP FUNCTION IF EXISTS public.get_user_chart_data_by_day(integer);

-- Optimized get_chart_data_by_day using daily_global_stats
CREATE FUNCTION public.get_chart_data_by_day(p_days integer DEFAULT 7)
RETURNS TABLE(date_brazil text, gerados bigint, pagos bigint, valor_pago numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date DATE;
BEGIN
  v_start_date := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::DATE - (p_days - 1);
  
  RETURN QUERY
  SELECT 
    stat_date::text as date_brazil,
    COALESCE(generated_count, 0)::bigint as gerados,
    COALESCE(paid_count, 0)::bigint as pagos,
    COALESCE(paid_amount, 0) as valor_pago
  FROM daily_global_stats
  WHERE stat_date >= v_start_date
  ORDER BY stat_date;
END;
$$;

-- Optimized get_user_chart_data_by_day using daily_user_stats
CREATE FUNCTION public.get_user_chart_data_by_day(p_days integer DEFAULT 7)
RETURNS TABLE(date_brazil text, gerados bigint, pagos bigint, valor_pago numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date DATE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  v_start_date := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::DATE - (p_days - 1);
  
  RETURN QUERY
  SELECT 
    stat_date::text as date_brazil,
    COALESCE(generated_count, 0)::bigint as gerados,
    COALESCE(paid_count, 0)::bigint as pagos,
    COALESCE(paid_amount, 0) as valor_pago
  FROM daily_user_stats
  WHERE user_id = auth.uid()
    AND stat_date >= v_start_date
  ORDER BY stat_date;
END;
$$;

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_daily_global_stats_date ON daily_global_stats(stat_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_user_stats_user_date ON daily_user_stats(user_id, stat_date DESC);