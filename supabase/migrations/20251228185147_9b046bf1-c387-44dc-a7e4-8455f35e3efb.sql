-- Atualizar função para aceitar filtros de mês e ano
CREATE OR REPLACE FUNCTION public.get_platform_revenue_stats(
  p_user_id uuid DEFAULT NULL,
  p_month integer DEFAULT NULL,
  p_year integer DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  today_start timestamp with time zone;
  today_end timestamp with time zone;
  month_start timestamp with time zone;
  month_end timestamp with time zone;
  year_start timestamp with time zone;
  year_end timestamp with time zone;
  week7_start timestamp with time zone;
  week15_start timestamp with time zone;
  is_absolute_mode boolean;
BEGIN
  -- Check if we're in absolute mode (specific month/year selected)
  is_absolute_mode := (p_month IS NOT NULL AND p_year IS NOT NULL);
  
  IF is_absolute_mode THEN
    -- Absolute mode: filter by specific month/year
    month_start := make_timestamptz(p_year, p_month, 1, 0, 0, 0, 'America/Sao_Paulo');
    month_end := (month_start + interval '1 month' - interval '1 second');
    
    SELECT json_build_object(
      'month_gross', COALESCE(SUM(amount), 0),
      'month_paid_count', COUNT(*),
      'month_fees', COALESCE(SUM(
        COALESCE(fee_fixed, 0) + (amount * COALESCE(fee_percentage, 0) / 100)
      ), 0),
      'week1_gross', COALESCE(SUM(CASE 
        WHEN paid_at >= month_start AND paid_at < month_start + interval '7 days' 
        THEN amount ELSE 0 END), 0),
      'week1_fees', COALESCE(SUM(CASE 
        WHEN paid_at >= month_start AND paid_at < month_start + interval '7 days' 
        THEN COALESCE(fee_fixed, 0) + (amount * COALESCE(fee_percentage, 0) / 100) ELSE 0 END), 0),
      'week2_gross', COALESCE(SUM(CASE 
        WHEN paid_at >= month_start + interval '7 days' AND paid_at < month_start + interval '14 days' 
        THEN amount ELSE 0 END), 0),
      'week2_fees', COALESCE(SUM(CASE 
        WHEN paid_at >= month_start + interval '7 days' AND paid_at < month_start + interval '14 days' 
        THEN COALESCE(fee_fixed, 0) + (amount * COALESCE(fee_percentage, 0) / 100) ELSE 0 END), 0),
      'week3_gross', COALESCE(SUM(CASE 
        WHEN paid_at >= month_start + interval '14 days' AND paid_at < month_start + interval '21 days' 
        THEN amount ELSE 0 END), 0),
      'week3_fees', COALESCE(SUM(CASE 
        WHEN paid_at >= month_start + interval '14 days' AND paid_at < month_start + interval '21 days' 
        THEN COALESCE(fee_fixed, 0) + (amount * COALESCE(fee_percentage, 0) / 100) ELSE 0 END), 0),
      'week4_gross', COALESCE(SUM(CASE 
        WHEN paid_at >= month_start + interval '21 days' 
        THEN amount ELSE 0 END), 0),
      'week4_fees', COALESCE(SUM(CASE 
        WHEN paid_at >= month_start + interval '21 days' 
        THEN COALESCE(fee_fixed, 0) + (amount * COALESCE(fee_percentage, 0) / 100) ELSE 0 END), 0)
    ) INTO result
    FROM pix_transactions
    WHERE status = 'paid'
      AND paid_at >= month_start
      AND paid_at <= month_end
      AND (p_user_id IS NULL OR user_id = p_user_id);
  ELSE
    -- Relative mode: original logic
    today_start := (CURRENT_DATE AT TIME ZONE 'America/Sao_Paulo');
    today_end := today_start + interval '1 day' - interval '1 second';
    month_start := date_trunc('month', CURRENT_DATE) AT TIME ZONE 'America/Sao_Paulo';
    month_end := (month_start + interval '1 month' - interval '1 second');
    year_start := date_trunc('year', CURRENT_DATE) AT TIME ZONE 'America/Sao_Paulo';
    year_end := (year_start + interval '1 year' - interval '1 second');
    week7_start := (CURRENT_DATE - interval '7 days') AT TIME ZONE 'America/Sao_Paulo';
    week15_start := (CURRENT_DATE - interval '15 days') AT TIME ZONE 'America/Sao_Paulo';

    SELECT json_build_object(
      'today_gross', COALESCE(SUM(CASE WHEN paid_at >= today_start AND paid_at <= today_end THEN amount ELSE 0 END), 0),
      'today_fees', COALESCE(SUM(CASE WHEN paid_at >= today_start AND paid_at <= today_end THEN COALESCE(fee_fixed, 0) + (amount * COALESCE(fee_percentage, 0) / 100) ELSE 0 END), 0),
      'week7_gross', COALESCE(SUM(CASE WHEN paid_at >= week7_start THEN amount ELSE 0 END), 0),
      'week7_fees', COALESCE(SUM(CASE WHEN paid_at >= week7_start THEN COALESCE(fee_fixed, 0) + (amount * COALESCE(fee_percentage, 0) / 100) ELSE 0 END), 0),
      'week15_gross', COALESCE(SUM(CASE WHEN paid_at >= week15_start THEN amount ELSE 0 END), 0),
      'week15_fees', COALESCE(SUM(CASE WHEN paid_at >= week15_start THEN COALESCE(fee_fixed, 0) + (amount * COALESCE(fee_percentage, 0) / 100) ELSE 0 END), 0),
      'month_gross', COALESCE(SUM(CASE WHEN paid_at >= month_start AND paid_at <= month_end THEN amount ELSE 0 END), 0),
      'month_fees', COALESCE(SUM(CASE WHEN paid_at >= month_start AND paid_at <= month_end THEN COALESCE(fee_fixed, 0) + (amount * COALESCE(fee_percentage, 0) / 100) ELSE 0 END), 0),
      'year_gross', COALESCE(SUM(CASE WHEN paid_at >= year_start AND paid_at <= year_end THEN amount ELSE 0 END), 0),
      'year_fees', COALESCE(SUM(CASE WHEN paid_at >= year_start AND paid_at <= year_end THEN COALESCE(fee_fixed, 0) + (amount * COALESCE(fee_percentage, 0) / 100) ELSE 0 END), 0)
    ) INTO result
    FROM pix_transactions
    WHERE status = 'paid'
      AND (p_user_id IS NULL OR user_id = p_user_id);
  END IF;

  RETURN result;
END;
$$;

-- Função para obter anos disponíveis nas transações
CREATE OR REPLACE FUNCTION public.get_available_transaction_years()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_agg(DISTINCT EXTRACT(YEAR FROM paid_at)::integer ORDER BY EXTRACT(YEAR FROM paid_at)::integer DESC)
  INTO result
  FROM pix_transactions
  WHERE status = 'paid' AND paid_at IS NOT NULL;
  
  RETURN COALESCE(result, '[]'::json);
END;
$$;