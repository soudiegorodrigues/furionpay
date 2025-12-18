-- Update get_platform_revenue_stats to include Valorion acquirer
DROP FUNCTION IF EXISTS public.get_platform_revenue_stats(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.get_platform_revenue_stats(
  p_user_email TEXT DEFAULT NULL,
  p_acquirer_cost_filter TEXT DEFAULT 'all'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSON;
  v_user_id UUID;
  v_brazil_now TIMESTAMPTZ;
  v_brazil_today DATE;
  v_spedpay_rate NUMERIC;
  v_spedpay_fixed NUMERIC;
  v_inter_rate NUMERIC;
  v_inter_fixed NUMERIC;
  v_ativus_rate NUMERIC;
  v_ativus_fixed NUMERIC;
  v_valorion_rate NUMERIC;
  v_valorion_fixed NUMERIC;
BEGIN
  -- Get Brazil current time
  v_brazil_now := NOW() AT TIME ZONE 'America/Sao_Paulo';
  v_brazil_today := v_brazil_now::DATE;
  
  -- Get user_id if email provided
  IF p_user_email IS NOT NULL AND p_user_email != '' THEN
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_user_email LIMIT 1;
  END IF;
  
  -- Get acquirer fee configurations from admin_settings (global settings with user_id IS NULL)
  SELECT COALESCE((SELECT value::NUMERIC FROM admin_settings WHERE key = 'spedpay_fee_rate' AND user_id IS NULL LIMIT 1), 0) INTO v_spedpay_rate;
  SELECT COALESCE((SELECT value::NUMERIC FROM admin_settings WHERE key = 'spedpay_fixed_fee' AND user_id IS NULL LIMIT 1), 0) INTO v_spedpay_fixed;
  SELECT COALESCE((SELECT value::NUMERIC FROM admin_settings WHERE key = 'inter_fee_rate' AND user_id IS NULL LIMIT 1), 0) INTO v_inter_rate;
  SELECT COALESCE((SELECT value::NUMERIC FROM admin_settings WHERE key = 'inter_fixed_fee' AND user_id IS NULL LIMIT 1), 0) INTO v_inter_fixed;
  SELECT COALESCE((SELECT value::NUMERIC FROM admin_settings WHERE key = 'ativus_fee_rate' AND user_id IS NULL LIMIT 1), 0) INTO v_ativus_rate;
  SELECT COALESCE((SELECT value::NUMERIC FROM admin_settings WHERE key = 'ativus_fixed_fee' AND user_id IS NULL LIMIT 1), 0) INTO v_ativus_fixed;
  SELECT COALESCE((SELECT value::NUMERIC FROM admin_settings WHERE key = 'valorion_fee_rate' AND user_id IS NULL LIMIT 1), 0) INTO v_valorion_rate;
  SELECT COALESCE((SELECT value::NUMERIC FROM admin_settings WHERE key = 'valorion_fixed_fee' AND user_id IS NULL LIMIT 1), 0) INTO v_valorion_fixed;

  WITH transaction_data AS (
    SELECT 
      pt.id,
      pt.amount,
      pt.fee_percentage,
      pt.fee_fixed,
      pt.paid_at,
      pt.acquirer,
      -- Calculate platform gross revenue (fees charged to users)
      COALESCE(pt.fee_percentage, 0) / 100 * pt.amount + COALESCE(pt.fee_fixed, 0) AS gross_revenue,
      -- Calculate acquirer cost based on acquirer type and filter
      CASE 
        WHEN p_acquirer_cost_filter = 'spedpay' AND COALESCE(pt.acquirer, 'spedpay') = 'spedpay' THEN
          (v_spedpay_rate / 100 * pt.amount) + v_spedpay_fixed
        WHEN p_acquirer_cost_filter = 'inter' AND pt.acquirer = 'inter' THEN
          (v_inter_rate / 100 * pt.amount) + v_inter_fixed
        WHEN p_acquirer_cost_filter = 'ativus' AND pt.acquirer = 'ativus' THEN
          (v_ativus_rate / 100 * pt.amount) + v_ativus_fixed
        WHEN p_acquirer_cost_filter = 'valorion' AND pt.acquirer = 'valorion' THEN
          (v_valorion_rate / 100 * pt.amount) + v_valorion_fixed
        WHEN p_acquirer_cost_filter = 'all' OR p_acquirer_cost_filter IS NULL THEN
          CASE COALESCE(pt.acquirer, 'spedpay')
            WHEN 'spedpay' THEN (v_spedpay_rate / 100 * pt.amount) + v_spedpay_fixed
            WHEN 'inter' THEN (v_inter_rate / 100 * pt.amount) + v_inter_fixed
            WHEN 'ativus' THEN (v_ativus_rate / 100 * pt.amount) + v_ativus_fixed
            WHEN 'valorion' THEN (v_valorion_rate / 100 * pt.amount) + v_valorion_fixed
            ELSE 0
          END
        ELSE 0
      END AS acquirer_cost
    FROM pix_transactions pt
    WHERE pt.status = 'paid'
      AND (v_user_id IS NULL OR pt.user_id = v_user_id)
  )
  SELECT json_build_object(
    'today', (
      SELECT json_build_object(
        'gross_revenue', COALESCE(SUM(gross_revenue), 0),
        'acquirer_cost', COALESCE(SUM(acquirer_cost), 0),
        'net_profit', COALESCE(SUM(gross_revenue), 0) - COALESCE(SUM(acquirer_cost), 0),
        'transaction_count', COUNT(*)
      )
      FROM transaction_data
      WHERE (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE = v_brazil_today
    ),
    'week', (
      SELECT json_build_object(
        'gross_revenue', COALESCE(SUM(gross_revenue), 0),
        'acquirer_cost', COALESCE(SUM(acquirer_cost), 0),
        'net_profit', COALESCE(SUM(gross_revenue), 0) - COALESCE(SUM(acquirer_cost), 0),
        'transaction_count', COUNT(*)
      )
      FROM transaction_data
      WHERE paid_at >= v_brazil_now - INTERVAL '7 days'
    ),
    'fortnight', (
      SELECT json_build_object(
        'gross_revenue', COALESCE(SUM(gross_revenue), 0),
        'acquirer_cost', COALESCE(SUM(acquirer_cost), 0),
        'net_profit', COALESCE(SUM(gross_revenue), 0) - COALESCE(SUM(acquirer_cost), 0),
        'transaction_count', COUNT(*)
      )
      FROM transaction_data
      WHERE paid_at >= v_brazil_now - INTERVAL '15 days'
    ),
    'month', (
      SELECT json_build_object(
        'gross_revenue', COALESCE(SUM(gross_revenue), 0),
        'acquirer_cost', COALESCE(SUM(acquirer_cost), 0),
        'net_profit', COALESCE(SUM(gross_revenue), 0) - COALESCE(SUM(acquirer_cost), 0),
        'transaction_count', COUNT(*)
      )
      FROM transaction_data
      WHERE (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE >= DATE_TRUNC('month', v_brazil_now)::DATE
    ),
    'year', (
      SELECT json_build_object(
        'gross_revenue', COALESCE(SUM(gross_revenue), 0),
        'acquirer_cost', COALESCE(SUM(acquirer_cost), 0),
        'net_profit', COALESCE(SUM(gross_revenue), 0) - COALESCE(SUM(acquirer_cost), 0),
        'transaction_count', COUNT(*)
      )
      FROM transaction_data
      WHERE (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE >= DATE_TRUNC('year', v_brazil_now)::DATE
    ),
    'all_time', (
      SELECT json_build_object(
        'gross_revenue', COALESCE(SUM(gross_revenue), 0),
        'acquirer_cost', COALESCE(SUM(acquirer_cost), 0),
        'net_profit', COALESCE(SUM(gross_revenue), 0) - COALESCE(SUM(acquirer_cost), 0),
        'transaction_count', COUNT(*)
      )
      FROM transaction_data
    )
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

-- Update get_platform_user_profit_ranking to include Valorion acquirer
DROP FUNCTION IF EXISTS public.get_platform_user_profit_ranking(TEXT, INT);

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
  v_valorion_rate NUMERIC := 0;
  v_valorion_fixed NUMERIC := 0;
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

  SELECT COALESCE(value::NUMERIC, 0) INTO v_valorion_rate
  FROM admin_settings WHERE key = 'valorion_fee_rate' AND user_id IS NULL;
  
  SELECT COALESCE(value::NUMERIC, 0) INTO v_valorion_fixed
  FROM admin_settings WHERE key = 'valorion_fixed_fee' AND user_id IS NULL;

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
          WHEN 'valorion' THEN (pt.amount * v_valorion_rate / 100) + v_valorion_fixed
          ELSE (pt.amount * v_spedpay_rate / 100) + v_spedpay_fixed
        END
      )::NUMERIC, 2) AS acquirer_cost,
      ROUND((
        SUM((COALESCE(pt.fee_percentage, 0) / 100.0 * pt.amount) + COALESCE(pt.fee_fixed, 0))
        - SUM(
          CASE COALESCE(pt.acquirer, 'spedpay')
            WHEN 'ativus' THEN (pt.amount * v_ativus_rate / 100) + v_ativus_fixed
            WHEN 'inter' THEN (pt.amount * v_inter_rate / 100) + v_inter_fixed
            WHEN 'valorion' THEN (pt.amount * v_valorion_rate / 100) + v_valorion_fixed
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