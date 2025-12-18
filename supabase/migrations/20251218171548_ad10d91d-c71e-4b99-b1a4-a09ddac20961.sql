-- Drop and recreate get_platform_revenue_stats with fortnight and year fields
DROP FUNCTION IF EXISTS public.get_platform_revenue_stats(text);

CREATE OR REPLACE FUNCTION public.get_platform_revenue_stats(p_user_email text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSON;
  v_today DATE;
  v_week_start TIMESTAMPTZ;
  v_fortnight_start TIMESTAMPTZ;
  v_month_start TIMESTAMPTZ;
  v_year_start TIMESTAMPTZ;
  v_user_id UUID := NULL;
  v_spedpay_rate NUMERIC := 0;
  v_spedpay_fixed NUMERIC := 0;
  v_inter_rate NUMERIC := 0;
  v_inter_fixed NUMERIC := 0;
  v_ativus_rate NUMERIC := 0;
  v_ativus_fixed NUMERIC := 0;
  v_valorion_rate NUMERIC := 0;
  v_valorion_fixed NUMERIC := 0;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can view platform revenue';
  END IF;

  -- Get user_id if email provided
  IF p_user_email IS NOT NULL AND p_user_email != '' THEN
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_user_email LIMIT 1;
  END IF;

  -- Calculate date boundaries
  v_today := (now() AT TIME ZONE 'America/Sao_Paulo')::DATE;
  v_week_start := date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo' - INTERVAL '7 days') AT TIME ZONE 'America/Sao_Paulo';
  v_fortnight_start := date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo' - INTERVAL '15 days') AT TIME ZONE 'America/Sao_Paulo';
  v_month_start := date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
  v_year_start := date_trunc('year', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';

  -- Get acquirer fee rates from admin_settings (with NULLIF for empty strings)
  SELECT COALESCE(NULLIF(value, '')::NUMERIC, 0) INTO v_spedpay_rate FROM admin_settings WHERE key = 'acquirer_fee_spedpay_rate' AND user_id IS NULL LIMIT 1;
  SELECT COALESCE(NULLIF(value, '')::NUMERIC, 0) INTO v_spedpay_fixed FROM admin_settings WHERE key = 'acquirer_fee_spedpay_fixed' AND user_id IS NULL LIMIT 1;
  SELECT COALESCE(NULLIF(value, '')::NUMERIC, 0) INTO v_inter_rate FROM admin_settings WHERE key = 'acquirer_fee_inter_rate' AND user_id IS NULL LIMIT 1;
  SELECT COALESCE(NULLIF(value, '')::NUMERIC, 0) INTO v_inter_fixed FROM admin_settings WHERE key = 'acquirer_fee_inter_fixed' AND user_id IS NULL LIMIT 1;
  SELECT COALESCE(NULLIF(value, '')::NUMERIC, 0) INTO v_ativus_rate FROM admin_settings WHERE key = 'acquirer_fee_ativus_rate' AND user_id IS NULL LIMIT 1;
  SELECT COALESCE(NULLIF(value, '')::NUMERIC, 0) INTO v_ativus_fixed FROM admin_settings WHERE key = 'acquirer_fee_ativus_fixed' AND user_id IS NULL LIMIT 1;
  SELECT COALESCE(NULLIF(value, '')::NUMERIC, 0) INTO v_valorion_rate FROM admin_settings WHERE key = 'acquirer_fee_valorion_rate' AND user_id IS NULL LIMIT 1;
  SELECT COALESCE(NULLIF(value, '')::NUMERIC, 0) INTO v_valorion_fixed FROM admin_settings WHERE key = 'acquirer_fee_valorion_fixed' AND user_id IS NULL LIMIT 1;

  SELECT json_build_object(
    'today', (
      SELECT json_build_object(
        'gross_revenue', COALESCE(SUM(amount), 0),
        'acquirer_cost', COALESCE(SUM(
          CASE 
            WHEN COALESCE(acquirer, 'spedpay') = 'inter' THEN (amount * v_inter_rate / 100) + v_inter_fixed
            WHEN COALESCE(acquirer, 'spedpay') = 'ativus' THEN (amount * v_ativus_rate / 100) + v_ativus_fixed
            WHEN COALESCE(acquirer, 'spedpay') = 'valorion' THEN (amount * v_valorion_rate / 100) + v_valorion_fixed
            ELSE (amount * v_spedpay_rate / 100) + v_spedpay_fixed
          END
        ), 0),
        'net_profit', COALESCE(SUM(amount - 
          CASE 
            WHEN COALESCE(acquirer, 'spedpay') = 'inter' THEN (amount * v_inter_rate / 100) + v_inter_fixed
            WHEN COALESCE(acquirer, 'spedpay') = 'ativus' THEN (amount * v_ativus_rate / 100) + v_ativus_fixed
            WHEN COALESCE(acquirer, 'spedpay') = 'valorion' THEN (amount * v_valorion_rate / 100) + v_valorion_fixed
            ELSE (amount * v_spedpay_rate / 100) + v_spedpay_fixed
          END
        ), 0),
        'transaction_count', COUNT(*)
      )
      FROM pix_transactions 
      WHERE status = 'paid' 
      AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE = v_today
      AND (v_user_id IS NULL OR user_id = v_user_id)
    ),
    'week', (
      SELECT json_build_object(
        'gross_revenue', COALESCE(SUM(amount), 0),
        'acquirer_cost', COALESCE(SUM(
          CASE 
            WHEN COALESCE(acquirer, 'spedpay') = 'inter' THEN (amount * v_inter_rate / 100) + v_inter_fixed
            WHEN COALESCE(acquirer, 'spedpay') = 'ativus' THEN (amount * v_ativus_rate / 100) + v_ativus_fixed
            WHEN COALESCE(acquirer, 'spedpay') = 'valorion' THEN (amount * v_valorion_rate / 100) + v_valorion_fixed
            ELSE (amount * v_spedpay_rate / 100) + v_spedpay_fixed
          END
        ), 0),
        'net_profit', COALESCE(SUM(amount - 
          CASE 
            WHEN COALESCE(acquirer, 'spedpay') = 'inter' THEN (amount * v_inter_rate / 100) + v_inter_fixed
            WHEN COALESCE(acquirer, 'spedpay') = 'ativus' THEN (amount * v_ativus_rate / 100) + v_ativus_fixed
            WHEN COALESCE(acquirer, 'spedpay') = 'valorion' THEN (amount * v_valorion_rate / 100) + v_valorion_fixed
            ELSE (amount * v_spedpay_rate / 100) + v_spedpay_fixed
          END
        ), 0),
        'transaction_count', COUNT(*)
      )
      FROM pix_transactions 
      WHERE status = 'paid' 
      AND paid_at >= v_week_start
      AND (v_user_id IS NULL OR user_id = v_user_id)
    ),
    'fortnight', (
      SELECT json_build_object(
        'gross_revenue', COALESCE(SUM(amount), 0),
        'acquirer_cost', COALESCE(SUM(
          CASE 
            WHEN COALESCE(acquirer, 'spedpay') = 'inter' THEN (amount * v_inter_rate / 100) + v_inter_fixed
            WHEN COALESCE(acquirer, 'spedpay') = 'ativus' THEN (amount * v_ativus_rate / 100) + v_ativus_fixed
            WHEN COALESCE(acquirer, 'spedpay') = 'valorion' THEN (amount * v_valorion_rate / 100) + v_valorion_fixed
            ELSE (amount * v_spedpay_rate / 100) + v_spedpay_fixed
          END
        ), 0),
        'net_profit', COALESCE(SUM(amount - 
          CASE 
            WHEN COALESCE(acquirer, 'spedpay') = 'inter' THEN (amount * v_inter_rate / 100) + v_inter_fixed
            WHEN COALESCE(acquirer, 'spedpay') = 'ativus' THEN (amount * v_ativus_rate / 100) + v_ativus_fixed
            WHEN COALESCE(acquirer, 'spedpay') = 'valorion' THEN (amount * v_valorion_rate / 100) + v_valorion_fixed
            ELSE (amount * v_spedpay_rate / 100) + v_spedpay_fixed
          END
        ), 0),
        'transaction_count', COUNT(*)
      )
      FROM pix_transactions 
      WHERE status = 'paid' 
      AND paid_at >= v_fortnight_start
      AND (v_user_id IS NULL OR user_id = v_user_id)
    ),
    'month', (
      SELECT json_build_object(
        'gross_revenue', COALESCE(SUM(amount), 0),
        'acquirer_cost', COALESCE(SUM(
          CASE 
            WHEN COALESCE(acquirer, 'spedpay') = 'inter' THEN (amount * v_inter_rate / 100) + v_inter_fixed
            WHEN COALESCE(acquirer, 'spedpay') = 'ativus' THEN (amount * v_ativus_rate / 100) + v_ativus_fixed
            WHEN COALESCE(acquirer, 'spedpay') = 'valorion' THEN (amount * v_valorion_rate / 100) + v_valorion_fixed
            ELSE (amount * v_spedpay_rate / 100) + v_spedpay_fixed
          END
        ), 0),
        'net_profit', COALESCE(SUM(amount - 
          CASE 
            WHEN COALESCE(acquirer, 'spedpay') = 'inter' THEN (amount * v_inter_rate / 100) + v_inter_fixed
            WHEN COALESCE(acquirer, 'spedpay') = 'ativus' THEN (amount * v_ativus_rate / 100) + v_ativus_fixed
            WHEN COALESCE(acquirer, 'spedpay') = 'valorion' THEN (amount * v_valorion_rate / 100) + v_valorion_fixed
            ELSE (amount * v_spedpay_rate / 100) + v_spedpay_fixed
          END
        ), 0),
        'transaction_count', COUNT(*)
      )
      FROM pix_transactions 
      WHERE status = 'paid' 
      AND paid_at >= v_month_start
      AND (v_user_id IS NULL OR user_id = v_user_id)
    ),
    'year', (
      SELECT json_build_object(
        'gross_revenue', COALESCE(SUM(amount), 0),
        'acquirer_cost', COALESCE(SUM(
          CASE 
            WHEN COALESCE(acquirer, 'spedpay') = 'inter' THEN (amount * v_inter_rate / 100) + v_inter_fixed
            WHEN COALESCE(acquirer, 'spedpay') = 'ativus' THEN (amount * v_ativus_rate / 100) + v_ativus_fixed
            WHEN COALESCE(acquirer, 'spedpay') = 'valorion' THEN (amount * v_valorion_rate / 100) + v_valorion_fixed
            ELSE (amount * v_spedpay_rate / 100) + v_spedpay_fixed
          END
        ), 0),
        'net_profit', COALESCE(SUM(amount - 
          CASE 
            WHEN COALESCE(acquirer, 'spedpay') = 'inter' THEN (amount * v_inter_rate / 100) + v_inter_fixed
            WHEN COALESCE(acquirer, 'spedpay') = 'ativus' THEN (amount * v_ativus_rate / 100) + v_ativus_fixed
            WHEN COALESCE(acquirer, 'spedpay') = 'valorion' THEN (amount * v_valorion_rate / 100) + v_valorion_fixed
            ELSE (amount * v_spedpay_rate / 100) + v_spedpay_fixed
          END
        ), 0),
        'transaction_count', COUNT(*)
      )
      FROM pix_transactions 
      WHERE status = 'paid' 
      AND paid_at >= v_year_start
      AND (v_user_id IS NULL OR user_id = v_user_id)
    ),
    'all_time', (
      SELECT json_build_object(
        'gross_revenue', COALESCE(SUM(amount), 0),
        'acquirer_cost', COALESCE(SUM(
          CASE 
            WHEN COALESCE(acquirer, 'spedpay') = 'inter' THEN (amount * v_inter_rate / 100) + v_inter_fixed
            WHEN COALESCE(acquirer, 'spedpay') = 'ativus' THEN (amount * v_ativus_rate / 100) + v_ativus_fixed
            WHEN COALESCE(acquirer, 'spedpay') = 'valorion' THEN (amount * v_valorion_rate / 100) + v_valorion_fixed
            ELSE (amount * v_spedpay_rate / 100) + v_spedpay_fixed
          END
        ), 0),
        'net_profit', COALESCE(SUM(amount - 
          CASE 
            WHEN COALESCE(acquirer, 'spedpay') = 'inter' THEN (amount * v_inter_rate / 100) + v_inter_fixed
            WHEN COALESCE(acquirer, 'spedpay') = 'ativus' THEN (amount * v_ativus_rate / 100) + v_ativus_fixed
            WHEN COALESCE(acquirer, 'spedpay') = 'valorion' THEN (amount * v_valorion_rate / 100) + v_valorion_fixed
            ELSE (amount * v_spedpay_rate / 100) + v_spedpay_fixed
          END
        ), 0),
        'transaction_count', COUNT(*)
      )
      FROM pix_transactions 
      WHERE status = 'paid'
      AND (v_user_id IS NULL OR user_id = v_user_id)
    ),
    'acquirer_costs', json_build_object(
      'spedpay_rate', v_spedpay_rate,
      'spedpay_fixed', v_spedpay_fixed,
      'inter_rate', v_inter_rate,
      'inter_fixed', v_inter_fixed,
      'ativus_rate', v_ativus_rate,
      'ativus_fixed', v_ativus_fixed,
      'valorion_rate', v_valorion_rate,
      'valorion_fixed', v_valorion_fixed
    )
  ) INTO v_result;

  RETURN v_result;
END;
$function$;