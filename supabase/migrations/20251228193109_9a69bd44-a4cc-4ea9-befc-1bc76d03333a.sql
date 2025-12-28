-- Create a new RPC function for custom date range stats
CREATE OR REPLACE FUNCTION public.get_platform_revenue_stats_custom_range(
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSON;
BEGIN
  WITH pix_stats AS (
    SELECT
      -- Gross revenue (total paid)
      COALESCE(SUM(amount), 0) as gross_revenue,
      
      -- Acquirer costs (PIX fees)
      COALESCE(SUM(
        CASE 
          WHEN acquirer = 'inter' THEN 0
          WHEN acquirer = 'ativus' THEN 0.05
          WHEN acquirer = 'valorion' THEN 0.29
          WHEN acquirer = 'efi' THEN 0
          ELSE 0
        END
      ), 0) as pix_cost,
      
      -- User fees (fees charged to users)
      COALESCE(SUM(
        (amount * COALESCE(fee_percentage, 0) / 100) + COALESCE(fee_fixed, 0)
      ), 0) as user_fees,
      
      -- Counts
      COUNT(*) as transaction_count
    FROM pix_transactions
    WHERE status = 'paid'
      AND paid_at >= p_start_date
      AND paid_at <= p_end_date
  ),
  withdrawal_stats AS (
    SELECT
      COALESCE(SUM(COALESCE(fee_fixed, 5.00)), 0) as withdrawal_cost,
      COUNT(*) as withdrawal_count
    FROM withdrawal_requests
    WHERE status = 'approved'
      AND processed_at >= p_start_date
      AND processed_at <= p_end_date
  ),
  daily_breakdown AS (
    SELECT 
      (paid_at AT TIME ZONE 'America/Sao_Paulo')::date as day_date,
      COALESCE(SUM(amount), 0) as day_gross,
      COALESCE(SUM(
        CASE 
          WHEN acquirer = 'inter' THEN 0
          WHEN acquirer = 'ativus' THEN 0.05
          WHEN acquirer = 'valorion' THEN 0.29
          WHEN acquirer = 'efi' THEN 0
          ELSE 0
        END
      ), 0) as day_pix_cost,
      COALESCE(SUM(
        (amount * COALESCE(fee_percentage, 0) / 100) + COALESCE(fee_fixed, 0)
      ), 0) as day_user_fees,
      COUNT(*) as day_count
    FROM pix_transactions
    WHERE status = 'paid'
      AND paid_at >= p_start_date
      AND paid_at <= p_end_date
    GROUP BY (paid_at AT TIME ZONE 'America/Sao_Paulo')::date
    ORDER BY day_date
  )
  SELECT json_build_object(
    'period', json_build_object(
      'start_date', p_start_date,
      'end_date', p_end_date
    ),
    'totals', json_build_object(
      'gross_revenue', (SELECT gross_revenue FROM pix_stats),
      'user_fees', (SELECT user_fees FROM pix_stats),
      'pix_cost', (SELECT pix_cost FROM pix_stats),
      'withdrawal_cost', (SELECT withdrawal_cost FROM withdrawal_stats),
      'net_profit', (SELECT user_fees FROM pix_stats) - (SELECT pix_cost FROM pix_stats) - (SELECT withdrawal_cost FROM withdrawal_stats),
      'transaction_count', (SELECT transaction_count FROM pix_stats),
      'withdrawal_count', (SELECT withdrawal_count FROM withdrawal_stats)
    ),
    'daily_breakdown', COALESCE(
      (SELECT json_agg(
        json_build_object(
          'date', day_date,
          'gross', day_gross,
          'pix_cost', day_pix_cost,
          'user_fees', day_user_fees,
          'net', day_user_fees - day_pix_cost,
          'count', day_count
        ) ORDER BY day_date
      ) FROM daily_breakdown),
      '[]'::json
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$function$;