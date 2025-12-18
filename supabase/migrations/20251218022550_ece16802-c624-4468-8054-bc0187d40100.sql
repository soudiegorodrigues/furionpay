-- Drop existing function to avoid ambiguity
DROP FUNCTION IF EXISTS public.get_platform_revenue_stats(TEXT, TEXT);

-- Recreate function with net_profit included
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
        WHEN p_acquirer_cost_filter = 'all' OR p_acquirer_cost_filter IS NULL THEN
          CASE COALESCE(pt.acquirer, 'spedpay')
            WHEN 'spedpay' THEN (v_spedpay_rate / 100 * pt.amount) + v_spedpay_fixed
            WHEN 'inter' THEN (v_inter_rate / 100 * pt.amount) + v_inter_fixed
            WHEN 'ativus' THEN (v_ativus_rate / 100 * pt.amount) + v_ativus_fixed
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
      WHERE (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE >= DATE_TRUNC('month', v_brazil_today)::DATE
    ),
    'year', (
      SELECT json_build_object(
        'gross_revenue', COALESCE(SUM(gross_revenue), 0),
        'acquirer_cost', COALESCE(SUM(acquirer_cost), 0),
        'net_profit', COALESCE(SUM(gross_revenue), 0) - COALESCE(SUM(acquirer_cost), 0),
        'transaction_count', COUNT(*)
      )
      FROM transaction_data
      WHERE (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE >= DATE_TRUNC('year', v_brazil_today)::DATE
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