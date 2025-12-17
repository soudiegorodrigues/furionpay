
-- Update get_platform_revenue_stats to calculate real acquirer costs
DROP FUNCTION IF EXISTS public.get_platform_revenue_stats(TEXT);

CREATE OR REPLACE FUNCTION public.get_platform_revenue_stats(
  p_user_email TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSON;
  brazil_now TIMESTAMPTZ;
  brazil_today DATE;
  month_start DATE;
  year_start DATE;
  -- Acquirer fees from admin_settings
  v_spedpay_fee_rate NUMERIC;
  v_spedpay_fixed_fee NUMERIC;
  v_inter_fee_rate NUMERIC;
  v_inter_fixed_fee NUMERIC;
  v_ativus_fee_rate NUMERIC;
  v_ativus_fixed_fee NUMERIC;
BEGIN
  brazil_now := NOW() AT TIME ZONE 'America/Sao_Paulo';
  brazil_today := brazil_now::DATE;
  month_start := DATE_TRUNC('month', brazil_now)::DATE;
  year_start := DATE_TRUNC('year', brazil_now)::DATE;
  
  -- Fetch acquirer fees from admin_settings (global settings with user_id IS NULL)
  SELECT COALESCE(NULLIF(value, '')::NUMERIC, 0) INTO v_spedpay_fee_rate
  FROM admin_settings WHERE key = 'spedpay_fee_rate' AND user_id IS NULL;
  v_spedpay_fee_rate := COALESCE(v_spedpay_fee_rate, 0);
  
  SELECT COALESCE(NULLIF(value, '')::NUMERIC, 0) INTO v_spedpay_fixed_fee
  FROM admin_settings WHERE key = 'spedpay_fixed_fee' AND user_id IS NULL;
  v_spedpay_fixed_fee := COALESCE(v_spedpay_fixed_fee, 0);
  
  SELECT COALESCE(NULLIF(value, '')::NUMERIC, 0) INTO v_inter_fee_rate
  FROM admin_settings WHERE key = 'inter_fee_rate' AND user_id IS NULL;
  v_inter_fee_rate := COALESCE(v_inter_fee_rate, 0);
  
  SELECT COALESCE(NULLIF(value, '')::NUMERIC, 0) INTO v_inter_fixed_fee
  FROM admin_settings WHERE key = 'inter_fixed_fee' AND user_id IS NULL;
  v_inter_fixed_fee := COALESCE(v_inter_fixed_fee, 0);
  
  SELECT COALESCE(NULLIF(value, '')::NUMERIC, 0) INTO v_ativus_fee_rate
  FROM admin_settings WHERE key = 'ativus_fee_rate' AND user_id IS NULL;
  v_ativus_fee_rate := COALESCE(v_ativus_fee_rate, 0);
  
  SELECT COALESCE(NULLIF(value, '')::NUMERIC, 0) INTO v_ativus_fixed_fee
  FROM admin_settings WHERE key = 'ativus_fixed_fee' AND user_id IS NULL;
  v_ativus_fixed_fee := COALESCE(v_ativus_fixed_fee, 0);

  WITH base_data AS (
    SELECT 
      pt.amount,
      pt.fee_percentage,
      pt.fee_fixed,
      pt.acquirer,
      (pt.paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE as paid_date,
      u.email as user_email
    FROM pix_transactions pt
    LEFT JOIN auth.users u ON u.id = pt.user_id
    WHERE pt.status = 'paid'
      AND (p_user_email IS NULL OR u.email = p_user_email)
  ),
  calculated AS (
    SELECT 
      amount,
      paid_date,
      -- Platform revenue (fees charged to users)
      (amount * COALESCE(fee_percentage, 0) / 100) + COALESCE(fee_fixed, 0) as platform_fee,
      -- Acquirer cost based on acquirer type
      CASE COALESCE(acquirer, 'spedpay')
        WHEN 'spedpay' THEN (amount * v_spedpay_fee_rate / 100) + v_spedpay_fixed_fee
        WHEN 'inter' THEN (amount * v_inter_fee_rate / 100) + v_inter_fixed_fee
        WHEN 'ativus' THEN (amount * v_ativus_fee_rate / 100) + v_ativus_fixed_fee
        ELSE 0
      END as acquirer_cost
    FROM base_data
  )
  SELECT json_build_object(
    'today', (
      SELECT json_build_object(
        'gross_revenue', COALESCE(SUM(platform_fee), 0),
        'acquirer_cost', COALESCE(SUM(acquirer_cost), 0),
        'net_profit', COALESCE(SUM(platform_fee), 0) - COALESCE(SUM(acquirer_cost), 0),
        'transaction_count', COUNT(*)
      )
      FROM calculated WHERE paid_date = brazil_today
    ),
    'week', (
      SELECT json_build_object(
        'gross_revenue', COALESCE(SUM(platform_fee), 0),
        'acquirer_cost', COALESCE(SUM(acquirer_cost), 0),
        'net_profit', COALESCE(SUM(platform_fee), 0) - COALESCE(SUM(acquirer_cost), 0),
        'transaction_count', COUNT(*)
      )
      FROM calculated WHERE paid_date >= brazil_today - INTERVAL '6 days'
    ),
    'fortnight', (
      SELECT json_build_object(
        'gross_revenue', COALESCE(SUM(platform_fee), 0),
        'acquirer_cost', COALESCE(SUM(acquirer_cost), 0),
        'net_profit', COALESCE(SUM(platform_fee), 0) - COALESCE(SUM(acquirer_cost), 0),
        'transaction_count', COUNT(*)
      )
      FROM calculated WHERE paid_date >= brazil_today - INTERVAL '14 days'
    ),
    'month', (
      SELECT json_build_object(
        'gross_revenue', COALESCE(SUM(platform_fee), 0),
        'acquirer_cost', COALESCE(SUM(acquirer_cost), 0),
        'net_profit', COALESCE(SUM(platform_fee), 0) - COALESCE(SUM(acquirer_cost), 0),
        'transaction_count', COUNT(*)
      )
      FROM calculated WHERE paid_date >= month_start
    ),
    'year', (
      SELECT json_build_object(
        'gross_revenue', COALESCE(SUM(platform_fee), 0),
        'acquirer_cost', COALESCE(SUM(acquirer_cost), 0),
        'net_profit', COALESCE(SUM(platform_fee), 0) - COALESCE(SUM(acquirer_cost), 0),
        'transaction_count', COUNT(*)
      )
      FROM calculated WHERE paid_date >= year_start
    ),
    'all_time', (
      SELECT json_build_object(
        'gross_revenue', COALESCE(SUM(platform_fee), 0),
        'acquirer_cost', COALESCE(SUM(acquirer_cost), 0),
        'net_profit', COALESCE(SUM(platform_fee), 0) - COALESCE(SUM(acquirer_cost), 0),
        'transaction_count', COUNT(*)
      )
      FROM calculated
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Update get_platform_revenue_chart to calculate real acquirer costs
DROP FUNCTION IF EXISTS public.get_platform_revenue_chart(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.get_platform_revenue_chart(
  p_filter TEXT DEFAULT '7days',
  p_user_email TEXT DEFAULT NULL
)
RETURNS TABLE (
  period_key TEXT,
  gross_revenue NUMERIC,
  acquirer_cost NUMERIC,
  net_profit NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  brazil_now TIMESTAMPTZ;
  brazil_today DATE;
  start_date DATE;
  -- Acquirer fees
  v_spedpay_fee_rate NUMERIC;
  v_spedpay_fixed_fee NUMERIC;
  v_inter_fee_rate NUMERIC;
  v_inter_fixed_fee NUMERIC;
  v_ativus_fee_rate NUMERIC;
  v_ativus_fixed_fee NUMERIC;
BEGIN
  brazil_now := NOW() AT TIME ZONE 'America/Sao_Paulo';
  brazil_today := brazil_now::DATE;
  
  start_date := CASE p_filter
    WHEN 'today' THEN brazil_today
    WHEN '7days' THEN brazil_today - INTERVAL '6 days'
    WHEN '14days' THEN brazil_today - INTERVAL '13 days'
    WHEN '30days' THEN brazil_today - INTERVAL '29 days'
    WHEN 'month' THEN DATE_TRUNC('month', brazil_now)::DATE
    WHEN 'year' THEN DATE_TRUNC('year', brazil_now)::DATE
    ELSE brazil_today
  END;
  
  -- Fetch acquirer fees
  SELECT COALESCE(NULLIF(value, '')::NUMERIC, 0) INTO v_spedpay_fee_rate
  FROM admin_settings WHERE key = 'spedpay_fee_rate' AND user_id IS NULL;
  v_spedpay_fee_rate := COALESCE(v_spedpay_fee_rate, 0);
  
  SELECT COALESCE(NULLIF(value, '')::NUMERIC, 0) INTO v_spedpay_fixed_fee
  FROM admin_settings WHERE key = 'spedpay_fixed_fee' AND user_id IS NULL;
  v_spedpay_fixed_fee := COALESCE(v_spedpay_fixed_fee, 0);
  
  SELECT COALESCE(NULLIF(value, '')::NUMERIC, 0) INTO v_inter_fee_rate
  FROM admin_settings WHERE key = 'inter_fee_rate' AND user_id IS NULL;
  v_inter_fee_rate := COALESCE(v_inter_fee_rate, 0);
  
  SELECT COALESCE(NULLIF(value, '')::NUMERIC, 0) INTO v_inter_fixed_fee
  FROM admin_settings WHERE key = 'inter_fixed_fee' AND user_id IS NULL;
  v_inter_fixed_fee := COALESCE(v_inter_fixed_fee, 0);
  
  SELECT COALESCE(NULLIF(value, '')::NUMERIC, 0) INTO v_ativus_fee_rate
  FROM admin_settings WHERE key = 'ativus_fee_rate' AND user_id IS NULL;
  v_ativus_fee_rate := COALESCE(v_ativus_fee_rate, 0);
  
  SELECT COALESCE(NULLIF(value, '')::NUMERIC, 0) INTO v_ativus_fixed_fee
  FROM admin_settings WHERE key = 'ativus_fixed_fee' AND user_id IS NULL;
  v_ativus_fixed_fee := COALESCE(v_ativus_fixed_fee, 0);
  
  RETURN QUERY
  WITH base_data AS (
    SELECT 
      pt.amount,
      pt.fee_percentage,
      pt.fee_fixed,
      pt.acquirer,
      (pt.paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE as paid_date
    FROM pix_transactions pt
    LEFT JOIN auth.users u ON u.id = pt.user_id
    WHERE pt.status = 'paid'
      AND (pt.paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE >= start_date
      AND (pt.paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE <= brazil_today
      AND (p_user_email IS NULL OR u.email = p_user_email)
  ),
  calculated AS (
    SELECT 
      paid_date,
      (amount * COALESCE(fee_percentage, 0) / 100) + COALESCE(fee_fixed, 0) as platform_fee,
      CASE COALESCE(acquirer, 'spedpay')
        WHEN 'spedpay' THEN (amount * v_spedpay_fee_rate / 100) + v_spedpay_fixed_fee
        WHEN 'inter' THEN (amount * v_inter_fee_rate / 100) + v_inter_fixed_fee
        WHEN 'ativus' THEN (amount * v_ativus_fee_rate / 100) + v_ativus_fixed_fee
        ELSE 0
      END as acq_cost
    FROM base_data
  )
  SELECT 
    TO_CHAR(paid_date, 'DD/MM') as period_key,
    COALESCE(SUM(platform_fee), 0) as gross_revenue,
    COALESCE(SUM(acq_cost), 0) as acquirer_cost,
    COALESCE(SUM(platform_fee), 0) - COALESCE(SUM(acq_cost), 0) as net_profit
  FROM calculated
  GROUP BY paid_date
  ORDER BY paid_date ASC;
END;
$$;
