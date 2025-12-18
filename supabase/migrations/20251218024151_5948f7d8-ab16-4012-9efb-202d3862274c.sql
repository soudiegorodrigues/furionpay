
-- Drop existing function
DROP FUNCTION IF EXISTS public.get_platform_user_profit_ranking(text, integer);

-- Recreate with correct net profit calculation
CREATE OR REPLACE FUNCTION public.get_platform_user_profit_ranking(
  p_filter TEXT DEFAULT '30days',
  p_limit INT DEFAULT 20
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSON;
  v_start_date DATE;
  brazil_now TIMESTAMPTZ;
  brazil_today DATE;
  v_ativus_rate NUMERIC := 0;
  v_ativus_fixed NUMERIC := 0;
  v_inter_rate NUMERIC := 0;
  v_inter_fixed NUMERIC := 0;
  v_spedpay_rate NUMERIC := 0;
  v_spedpay_fixed NUMERIC := 0;
BEGIN
  -- Get Brazil timezone
  brazil_now := NOW() AT TIME ZONE 'America/Sao_Paulo';
  brazil_today := brazil_now::DATE;

  -- Calculate start date based on filter
  v_start_date := CASE p_filter
    WHEN 'today' THEN brazil_today
    WHEN '7days' THEN brazil_today - INTERVAL '6 days'
    WHEN '30days' THEN brazil_today - INTERVAL '29 days'
    WHEN 'month' THEN DATE_TRUNC('month', brazil_now)::DATE
    WHEN 'all' THEN '1900-01-01'::DATE
    ELSE brazil_today - INTERVAL '29 days'
  END;

  -- Fetch acquirer rates from admin_settings
  SELECT COALESCE(value::NUMERIC, 0) INTO v_ativus_rate
  FROM admin_settings WHERE key = 'ativus_fee_rate' AND user_id IS NULL;
  
  SELECT COALESCE(value::NUMERIC, 0) INTO v_ativus_fixed
  FROM admin_settings WHERE key = 'ativus_fixed_fee' AND user_id IS NULL;
  
  SELECT COALESCE(value::NUMERIC, 0) INTO v_inter_rate
  FROM admin_settings WHERE key = 'inter_fee_rate' AND user_id IS NULL;
  
  SELECT COALESCE(value::NUMERIC, 0) INTO v_inter_fixed
  FROM admin_settings WHERE key = 'inter_fixed_fee' AND user_id IS NULL;
  
  SELECT COALESCE(value::NUMERIC, 0) INTO v_spedpay_rate
  FROM admin_settings WHERE key = 'spedpay_fee_rate' AND user_id IS NULL;
  
  SELECT COALESCE(value::NUMERIC, 0) INTO v_spedpay_fixed
  FROM admin_settings WHERE key = 'spedpay_fixed_fee' AND user_id IS NULL;

  -- Build ranking with net profit calculation
  SELECT json_agg(row_data ORDER BY total_profit DESC)
  INTO v_result
  FROM (
    SELECT 
      u.email AS user_email,
      COUNT(*) AS transaction_count,
      ROUND(SUM(
        (COALESCE(pt.fee_percentage, 0) / 100.0 * pt.amount) + COALESCE(pt.fee_fixed, 0)
      )::NUMERIC, 2) AS gross_revenue,
      ROUND(SUM(
        CASE COALESCE(pt.acquirer, 'spedpay')
          WHEN 'ativus' THEN (pt.amount * v_ativus_rate / 100) + v_ativus_fixed
          WHEN 'inter' THEN (pt.amount * v_inter_rate / 100) + v_inter_fixed
          ELSE (pt.amount * v_spedpay_rate / 100) + v_spedpay_fixed
        END
      )::NUMERIC, 2) AS acquirer_cost,
      ROUND((
        SUM((COALESCE(pt.fee_percentage, 0) / 100.0 * pt.amount) + COALESCE(pt.fee_fixed, 0))
        - SUM(
          CASE COALESCE(pt.acquirer, 'spedpay')
            WHEN 'ativus' THEN (pt.amount * v_ativus_rate / 100) + v_ativus_fixed
            WHEN 'inter' THEN (pt.amount * v_inter_rate / 100) + v_inter_fixed
            ELSE (pt.amount * v_spedpay_rate / 100) + v_spedpay_fixed
          END
        )
      )::NUMERIC, 2) AS total_profit
    FROM pix_transactions pt
    JOIN auth.users u ON u.id = pt.user_id
    WHERE pt.status = 'paid'
      AND pt.paid_at IS NOT NULL
      AND (pt.paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE >= v_start_date
    GROUP BY u.id, u.email
    HAVING SUM((COALESCE(pt.fee_percentage, 0) / 100.0 * pt.amount) + COALESCE(pt.fee_fixed, 0)) > 0
    ORDER BY total_profit DESC
    LIMIT p_limit
  ) AS row_data;

  RETURN COALESCE(v_result, '[]'::JSON);
END;
$$;
