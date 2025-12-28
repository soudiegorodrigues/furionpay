
-- Drop and recreate the function to include withdrawal fees
CREATE OR REPLACE FUNCTION public.get_platform_revenue_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSON;
  v_today_start TIMESTAMPTZ;
  v_week_start TIMESTAMPTZ;
  v_month_start TIMESTAMPTZ;
  v_year_start TIMESTAMPTZ;
BEGIN
  -- Calculate time boundaries in Brazil timezone
  v_today_start := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE::TIMESTAMPTZ;
  v_week_start := ((NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE - INTERVAL '6 days')::TIMESTAMPTZ;
  v_month_start := DATE_TRUNC('month', NOW() AT TIME ZONE 'America/Sao_Paulo')::TIMESTAMPTZ;
  v_year_start := DATE_TRUNC('year', NOW() AT TIME ZONE 'America/Sao_Paulo')::TIMESTAMPTZ;

  WITH pix_stats AS (
    SELECT
      -- Gross revenue (total paid)
      COALESCE(SUM(amount) FILTER (WHERE paid_at >= v_today_start), 0) as today_gross,
      COALESCE(SUM(amount) FILTER (WHERE paid_at >= v_week_start), 0) as week_gross,
      COALESCE(SUM(amount) FILTER (WHERE paid_at >= v_month_start), 0) as month_gross,
      COALESCE(SUM(amount) FILTER (WHERE paid_at >= v_year_start), 0) as year_gross,
      COALESCE(SUM(amount), 0) as total_gross,
      
      -- Acquirer costs (PIX fees)
      COALESCE(SUM(
        CASE 
          WHEN acquirer = 'inter' THEN (amount * 0 / 100) + 0
          WHEN acquirer = 'ativus' THEN (amount * 0 / 100) + 0.05
          WHEN acquirer = 'valorion' THEN (amount * 0 / 100) + 0.29
          WHEN acquirer = 'efi' THEN (amount * 0 / 100) + 0
          ELSE 0
        END
      ) FILTER (WHERE paid_at >= v_today_start), 0) as today_pix_cost,
      COALESCE(SUM(
        CASE 
          WHEN acquirer = 'inter' THEN (amount * 0 / 100) + 0
          WHEN acquirer = 'ativus' THEN (amount * 0 / 100) + 0.05
          WHEN acquirer = 'valorion' THEN (amount * 0 / 100) + 0.29
          WHEN acquirer = 'efi' THEN (amount * 0 / 100) + 0
          ELSE 0
        END
      ) FILTER (WHERE paid_at >= v_week_start), 0) as week_pix_cost,
      COALESCE(SUM(
        CASE 
          WHEN acquirer = 'inter' THEN (amount * 0 / 100) + 0
          WHEN acquirer = 'ativus' THEN (amount * 0 / 100) + 0.05
          WHEN acquirer = 'valorion' THEN (amount * 0 / 100) + 0.29
          WHEN acquirer = 'efi' THEN (amount * 0 / 100) + 0
          ELSE 0
        END
      ) FILTER (WHERE paid_at >= v_month_start), 0) as month_pix_cost,
      COALESCE(SUM(
        CASE 
          WHEN acquirer = 'inter' THEN (amount * 0 / 100) + 0
          WHEN acquirer = 'ativus' THEN (amount * 0 / 100) + 0.05
          WHEN acquirer = 'valorion' THEN (amount * 0 / 100) + 0.29
          WHEN acquirer = 'efi' THEN (amount * 0 / 100) + 0
          ELSE 0
        END
      ) FILTER (WHERE paid_at >= v_year_start), 0) as year_pix_cost,
      COALESCE(SUM(
        CASE 
          WHEN acquirer = 'inter' THEN (amount * 0 / 100) + 0
          WHEN acquirer = 'ativus' THEN (amount * 0 / 100) + 0.05
          WHEN acquirer = 'valorion' THEN (amount * 0 / 100) + 0.29
          WHEN acquirer = 'efi' THEN (amount * 0 / 100) + 0
          ELSE 0
        END
      ), 0) as total_pix_cost,
      
      -- Counts
      COUNT(*) FILTER (WHERE paid_at >= v_today_start) as today_count,
      COUNT(*) FILTER (WHERE paid_at >= v_week_start) as week_count,
      COUNT(*) FILTER (WHERE paid_at >= v_month_start) as month_count,
      COUNT(*) FILTER (WHERE paid_at >= v_year_start) as year_count,
      COUNT(*) as total_count
    FROM pix_transactions
    WHERE status = 'paid'
  ),
  withdrawal_stats AS (
    SELECT
      -- Withdrawal fees (R$5.00 fixed per approved withdrawal, or use stored fee values)
      COALESCE(SUM(COALESCE(fee_fixed, 5.00)) FILTER (WHERE processed_at >= v_today_start), 0) as today_withdrawal_cost,
      COALESCE(SUM(COALESCE(fee_fixed, 5.00)) FILTER (WHERE processed_at >= v_week_start), 0) as week_withdrawal_cost,
      COALESCE(SUM(COALESCE(fee_fixed, 5.00)) FILTER (WHERE processed_at >= v_month_start), 0) as month_withdrawal_cost,
      COALESCE(SUM(COALESCE(fee_fixed, 5.00)) FILTER (WHERE processed_at >= v_year_start), 0) as year_withdrawal_cost,
      COALESCE(SUM(COALESCE(fee_fixed, 5.00)), 0) as total_withdrawal_cost,
      
      -- Withdrawal counts
      COUNT(*) FILTER (WHERE processed_at >= v_today_start) as today_withdrawal_count,
      COUNT(*) FILTER (WHERE processed_at >= v_week_start) as week_withdrawal_count,
      COUNT(*) FILTER (WHERE processed_at >= v_month_start) as month_withdrawal_count,
      COUNT(*) FILTER (WHERE processed_at >= v_year_start) as year_withdrawal_count,
      COUNT(*) as total_withdrawal_count
    FROM withdrawal_requests
    WHERE status = 'approved'
      AND processed_at IS NOT NULL
  )
  SELECT json_build_object(
    -- Today
    'today_gross', ROUND(p.today_gross::numeric, 2),
    'today_pix_cost', ROUND(p.today_pix_cost::numeric, 2),
    'today_withdrawal_cost', ROUND(w.today_withdrawal_cost::numeric, 2),
    'today_total_cost', ROUND((p.today_pix_cost + w.today_withdrawal_cost)::numeric, 2),
    'today_net', ROUND((p.today_gross - p.today_pix_cost - w.today_withdrawal_cost)::numeric, 2),
    'today_count', p.today_count,
    'today_withdrawal_count', w.today_withdrawal_count,
    
    -- Week (7 days)
    'week_gross', ROUND(p.week_gross::numeric, 2),
    'week_pix_cost', ROUND(p.week_pix_cost::numeric, 2),
    'week_withdrawal_cost', ROUND(w.week_withdrawal_cost::numeric, 2),
    'week_total_cost', ROUND((p.week_pix_cost + w.week_withdrawal_cost)::numeric, 2),
    'week_net', ROUND((p.week_gross - p.week_pix_cost - w.week_withdrawal_cost)::numeric, 2),
    'week_count', p.week_count,
    'week_withdrawal_count', w.week_withdrawal_count,
    
    -- Month
    'month_gross', ROUND(p.month_gross::numeric, 2),
    'month_pix_cost', ROUND(p.month_pix_cost::numeric, 2),
    'month_withdrawal_cost', ROUND(w.month_withdrawal_cost::numeric, 2),
    'month_total_cost', ROUND((p.month_pix_cost + w.month_withdrawal_cost)::numeric, 2),
    'month_net', ROUND((p.month_gross - p.month_pix_cost - w.month_withdrawal_cost)::numeric, 2),
    'month_count', p.month_count,
    'month_withdrawal_count', w.month_withdrawal_count,
    
    -- Year
    'year_gross', ROUND(p.year_gross::numeric, 2),
    'year_pix_cost', ROUND(p.year_pix_cost::numeric, 2),
    'year_withdrawal_cost', ROUND(w.year_withdrawal_cost::numeric, 2),
    'year_total_cost', ROUND((p.year_pix_cost + w.year_withdrawal_cost)::numeric, 2),
    'year_net', ROUND((p.year_gross - p.year_pix_cost - w.year_withdrawal_cost)::numeric, 2),
    'year_count', p.year_count,
    'year_withdrawal_count', w.year_withdrawal_count,
    
    -- Total (all time)
    'total_gross', ROUND(p.total_gross::numeric, 2),
    'total_pix_cost', ROUND(p.total_pix_cost::numeric, 2),
    'total_withdrawal_cost', ROUND(w.total_withdrawal_cost::numeric, 2),
    'total_total_cost', ROUND((p.total_pix_cost + w.total_withdrawal_cost)::numeric, 2),
    'total_net', ROUND((p.total_gross - p.total_pix_cost - w.total_withdrawal_cost)::numeric, 2),
    'total_count', p.total_count,
    'total_withdrawal_count', w.total_withdrawal_count
  ) INTO v_result
  FROM pix_stats p, withdrawal_stats w;

  RETURN v_result;
END;
$function$;
