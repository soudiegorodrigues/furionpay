-- Drop existing function and recreate with correct parameters
DROP FUNCTION IF EXISTS public.get_platform_revenue_stats(TEXT);

-- Create updated function to calculate acquirer costs dynamically
CREATE OR REPLACE FUNCTION public.get_platform_revenue_stats(
  p_acquirer_cost_filter TEXT DEFAULT 'all'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_today_start TIMESTAMPTZ;
  v_week_start TIMESTAMPTZ;
  v_15days_start TIMESTAMPTZ;
  v_month_start TIMESTAMPTZ;
  v_year_start TIMESTAMPTZ;
  v_prev_month_start TIMESTAMPTZ;
  v_prev_month_end TIMESTAMPTZ;
  -- Acquirer fee rates
  v_spedpay_rate NUMERIC;
  v_spedpay_fixed NUMERIC;
  v_inter_rate NUMERIC;
  v_inter_fixed NUMERIC;
  v_ativus_rate NUMERIC;
  v_ativus_fixed NUMERIC;
BEGIN
  -- Calculate time boundaries using Brazil timezone
  v_today_start := (NOW() AT TIME ZONE 'America/Sao_Paulo')::date::timestamptz;
  v_week_start := v_today_start - INTERVAL '7 days';
  v_15days_start := v_today_start - INTERVAL '15 days';
  v_month_start := date_trunc('month', NOW() AT TIME ZONE 'America/Sao_Paulo')::timestamptz;
  v_year_start := date_trunc('year', NOW() AT TIME ZONE 'America/Sao_Paulo')::timestamptz;
  v_prev_month_start := date_trunc('month', (NOW() AT TIME ZONE 'America/Sao_Paulo') - INTERVAL '1 month')::timestamptz;
  v_prev_month_end := date_trunc('month', NOW() AT TIME ZONE 'America/Sao_Paulo')::timestamptz;

  -- Get acquirer fee configurations from admin_settings (global settings with user_id IS NULL)
  SELECT COALESCE(value::NUMERIC, 0) INTO v_spedpay_rate
  FROM admin_settings WHERE key = 'spedpay_fee_rate' AND user_id IS NULL LIMIT 1;
  v_spedpay_rate := COALESCE(v_spedpay_rate, 0);

  SELECT COALESCE(value::NUMERIC, 0) INTO v_spedpay_fixed
  FROM admin_settings WHERE key = 'spedpay_fixed_fee' AND user_id IS NULL LIMIT 1;
  v_spedpay_fixed := COALESCE(v_spedpay_fixed, 0);

  SELECT COALESCE(value::NUMERIC, 0) INTO v_inter_rate
  FROM admin_settings WHERE key = 'inter_fee_rate' AND user_id IS NULL LIMIT 1;
  v_inter_rate := COALESCE(v_inter_rate, 0);

  SELECT COALESCE(value::NUMERIC, 0) INTO v_inter_fixed
  FROM admin_settings WHERE key = 'inter_fixed_fee' AND user_id IS NULL LIMIT 1;
  v_inter_fixed := COALESCE(v_inter_fixed, 0);

  SELECT COALESCE(value::NUMERIC, 0) INTO v_ativus_rate
  FROM admin_settings WHERE key = 'ativus_fee_rate' AND user_id IS NULL LIMIT 1;
  v_ativus_rate := COALESCE(v_ativus_rate, 0);

  SELECT COALESCE(value::NUMERIC, 0) INTO v_ativus_fixed
  FROM admin_settings WHERE key = 'ativus_fixed_fee' AND user_id IS NULL LIMIT 1;
  v_ativus_fixed := COALESCE(v_ativus_fixed, 0);

  SELECT json_build_object(
    'today', (
      SELECT json_build_object(
        'gross_revenue', COALESCE(SUM((pt.amount * COALESCE(pt.fee_percentage, 0) / 100) + COALESCE(pt.fee_fixed, 0)), 0),
        'acquirer_cost', COALESCE(SUM(
          CASE 
            WHEN LOWER(COALESCE(pt.acquirer, '')) LIKE '%spedpay%' THEN (pt.amount * v_spedpay_rate / 100) + v_spedpay_fixed
            WHEN LOWER(COALESCE(pt.acquirer, '')) LIKE '%inter%' THEN (pt.amount * v_inter_rate / 100) + v_inter_fixed
            WHEN LOWER(COALESCE(pt.acquirer, '')) LIKE '%ativus%' THEN (pt.amount * v_ativus_rate / 100) + v_ativus_fixed
            ELSE 0
          END
        ), 0),
        'transaction_count', COUNT(*)
      )
      FROM pix_transactions pt
      WHERE pt.status = 'paid'
        AND pt.paid_at >= v_today_start
        AND (p_acquirer_cost_filter = 'all' OR LOWER(COALESCE(pt.acquirer, '')) LIKE '%' || LOWER(p_acquirer_cost_filter) || '%')
    ),
    'week', (
      SELECT json_build_object(
        'gross_revenue', COALESCE(SUM((pt.amount * COALESCE(pt.fee_percentage, 0) / 100) + COALESCE(pt.fee_fixed, 0)), 0),
        'acquirer_cost', COALESCE(SUM(
          CASE 
            WHEN LOWER(COALESCE(pt.acquirer, '')) LIKE '%spedpay%' THEN (pt.amount * v_spedpay_rate / 100) + v_spedpay_fixed
            WHEN LOWER(COALESCE(pt.acquirer, '')) LIKE '%inter%' THEN (pt.amount * v_inter_rate / 100) + v_inter_fixed
            WHEN LOWER(COALESCE(pt.acquirer, '')) LIKE '%ativus%' THEN (pt.amount * v_ativus_rate / 100) + v_ativus_fixed
            ELSE 0
          END
        ), 0),
        'transaction_count', COUNT(*)
      )
      FROM pix_transactions pt
      WHERE pt.status = 'paid'
        AND pt.paid_at >= v_week_start
        AND (p_acquirer_cost_filter = 'all' OR LOWER(COALESCE(pt.acquirer, '')) LIKE '%' || LOWER(p_acquirer_cost_filter) || '%')
    ),
    'fifteen_days', (
      SELECT json_build_object(
        'gross_revenue', COALESCE(SUM((pt.amount * COALESCE(pt.fee_percentage, 0) / 100) + COALESCE(pt.fee_fixed, 0)), 0),
        'acquirer_cost', COALESCE(SUM(
          CASE 
            WHEN LOWER(COALESCE(pt.acquirer, '')) LIKE '%spedpay%' THEN (pt.amount * v_spedpay_rate / 100) + v_spedpay_fixed
            WHEN LOWER(COALESCE(pt.acquirer, '')) LIKE '%inter%' THEN (pt.amount * v_inter_rate / 100) + v_inter_fixed
            WHEN LOWER(COALESCE(pt.acquirer, '')) LIKE '%ativus%' THEN (pt.amount * v_ativus_rate / 100) + v_ativus_fixed
            ELSE 0
          END
        ), 0),
        'transaction_count', COUNT(*)
      )
      FROM pix_transactions pt
      WHERE pt.status = 'paid'
        AND pt.paid_at >= v_15days_start
        AND (p_acquirer_cost_filter = 'all' OR LOWER(COALESCE(pt.acquirer, '')) LIKE '%' || LOWER(p_acquirer_cost_filter) || '%')
    ),
    'month', (
      SELECT json_build_object(
        'gross_revenue', COALESCE(SUM((pt.amount * COALESCE(pt.fee_percentage, 0) / 100) + COALESCE(pt.fee_fixed, 0)), 0),
        'acquirer_cost', COALESCE(SUM(
          CASE 
            WHEN LOWER(COALESCE(pt.acquirer, '')) LIKE '%spedpay%' THEN (pt.amount * v_spedpay_rate / 100) + v_spedpay_fixed
            WHEN LOWER(COALESCE(pt.acquirer, '')) LIKE '%inter%' THEN (pt.amount * v_inter_rate / 100) + v_inter_fixed
            WHEN LOWER(COALESCE(pt.acquirer, '')) LIKE '%ativus%' THEN (pt.amount * v_ativus_rate / 100) + v_ativus_fixed
            ELSE 0
          END
        ), 0),
        'transaction_count', COUNT(*)
      )
      FROM pix_transactions pt
      WHERE pt.status = 'paid'
        AND pt.paid_at >= v_month_start
        AND (p_acquirer_cost_filter = 'all' OR LOWER(COALESCE(pt.acquirer, '')) LIKE '%' || LOWER(p_acquirer_cost_filter) || '%')
    ),
    'year', (
      SELECT json_build_object(
        'gross_revenue', COALESCE(SUM((pt.amount * COALESCE(pt.fee_percentage, 0) / 100) + COALESCE(pt.fee_fixed, 0)), 0),
        'acquirer_cost', COALESCE(SUM(
          CASE 
            WHEN LOWER(COALESCE(pt.acquirer, '')) LIKE '%spedpay%' THEN (pt.amount * v_spedpay_rate / 100) + v_spedpay_fixed
            WHEN LOWER(COALESCE(pt.acquirer, '')) LIKE '%inter%' THEN (pt.amount * v_inter_rate / 100) + v_inter_fixed
            WHEN LOWER(COALESCE(pt.acquirer, '')) LIKE '%ativus%' THEN (pt.amount * v_ativus_rate / 100) + v_ativus_fixed
            ELSE 0
          END
        ), 0),
        'transaction_count', COUNT(*)
      )
      FROM pix_transactions pt
      WHERE pt.status = 'paid'
        AND pt.paid_at >= v_year_start
        AND (p_acquirer_cost_filter = 'all' OR LOWER(COALESCE(pt.acquirer, '')) LIKE '%' || LOWER(p_acquirer_cost_filter) || '%')
    ),
    'all_time', (
      SELECT json_build_object(
        'gross_revenue', COALESCE(SUM((pt.amount * COALESCE(pt.fee_percentage, 0) / 100) + COALESCE(pt.fee_fixed, 0)), 0),
        'acquirer_cost', COALESCE(SUM(
          CASE 
            WHEN LOWER(COALESCE(pt.acquirer, '')) LIKE '%spedpay%' THEN (pt.amount * v_spedpay_rate / 100) + v_spedpay_fixed
            WHEN LOWER(COALESCE(pt.acquirer, '')) LIKE '%inter%' THEN (pt.amount * v_inter_rate / 100) + v_inter_fixed
            WHEN LOWER(COALESCE(pt.acquirer, '')) LIKE '%ativus%' THEN (pt.amount * v_ativus_rate / 100) + v_ativus_fixed
            ELSE 0
          END
        ), 0),
        'transaction_count', COUNT(*)
      )
      FROM pix_transactions pt
      WHERE pt.status = 'paid'
        AND (p_acquirer_cost_filter = 'all' OR LOWER(COALESCE(pt.acquirer, '')) LIKE '%' || LOWER(p_acquirer_cost_filter) || '%')
    ),
    'prev_month', (
      SELECT json_build_object(
        'gross_revenue', COALESCE(SUM((pt.amount * COALESCE(pt.fee_percentage, 0) / 100) + COALESCE(pt.fee_fixed, 0)), 0),
        'acquirer_cost', COALESCE(SUM(
          CASE 
            WHEN LOWER(COALESCE(pt.acquirer, '')) LIKE '%spedpay%' THEN (pt.amount * v_spedpay_rate / 100) + v_spedpay_fixed
            WHEN LOWER(COALESCE(pt.acquirer, '')) LIKE '%inter%' THEN (pt.amount * v_inter_rate / 100) + v_inter_fixed
            WHEN LOWER(COALESCE(pt.acquirer, '')) LIKE '%ativus%' THEN (pt.amount * v_ativus_rate / 100) + v_ativus_fixed
            ELSE 0
          END
        ), 0),
        'transaction_count', COUNT(*)
      )
      FROM pix_transactions pt
      WHERE pt.status = 'paid'
        AND pt.paid_at >= v_prev_month_start
        AND pt.paid_at < v_prev_month_end
        AND (p_acquirer_cost_filter = 'all' OR LOWER(COALESCE(pt.acquirer, '')) LIKE '%' || LOWER(p_acquirer_cost_filter) || '%')
    ),
    'acquirer_fees', json_build_object(
      'spedpay', json_build_object('rate', v_spedpay_rate, 'fixed', v_spedpay_fixed),
      'inter', json_build_object('rate', v_inter_rate, 'fixed', v_inter_fixed),
      'ativus', json_build_object('rate', v_ativus_rate, 'fixed', v_ativus_fixed)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;