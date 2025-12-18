-- Atualizar função get_platform_revenue_stats para incluir last_month e acquirer_breakdown por período
CREATE OR REPLACE FUNCTION public.get_platform_revenue_stats(p_user_email text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSON;
  v_user_id UUID := NULL;
  v_today_start TIMESTAMPTZ;
  v_week_start TIMESTAMPTZ;
  v_fortnight_start TIMESTAMPTZ;
  v_month_start TIMESTAMPTZ;
  v_last_month_start TIMESTAMPTZ;
  v_last_month_end TIMESTAMPTZ;
  v_year_start TIMESTAMPTZ;
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
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_user_email IS NOT NULL AND p_user_email <> '' THEN
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_user_email LIMIT 1;
  END IF;

  v_today_start := date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
  v_week_start := v_today_start - interval '6 days';
  v_fortnight_start := v_today_start - interval '14 days';
  v_month_start := date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
  v_last_month_start := date_trunc('month', (now() - interval '1 month') AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
  v_last_month_end := v_month_start;
  v_year_start := date_trunc('year', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';

  -- Fee config keys used by the admin UI
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'spedpay_fee_rate' AND user_id IS NULL LIMIT 1), '')::numeric, 0) INTO v_spedpay_rate;
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'spedpay_fixed_fee' AND user_id IS NULL LIMIT 1), '')::numeric, 0) INTO v_spedpay_fixed;
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'inter_fee_rate' AND user_id IS NULL LIMIT 1), '')::numeric, 0) INTO v_inter_rate;
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'inter_fixed_fee' AND user_id IS NULL LIMIT 1), '')::numeric, 0) INTO v_inter_fixed;
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'ativus_fee_rate' AND user_id IS NULL LIMIT 1), '')::numeric, 0) INTO v_ativus_rate;
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'ativus_fixed_fee' AND user_id IS NULL LIMIT 1), '')::numeric, 0) INTO v_ativus_fixed;
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'valorion_fee_rate' AND user_id IS NULL LIMIT 1), '')::numeric, 0) INTO v_valorion_rate;
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'valorion_fixed_fee' AND user_id IS NULL LIMIT 1), '')::numeric, 0) INTO v_valorion_fixed;

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
        'net_profit', COALESCE(SUM(amount), 0) - COALESCE(SUM(
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
        AND paid_at >= v_today_start
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
        'net_profit', COALESCE(SUM(amount), 0) - COALESCE(SUM(
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
        'net_profit', COALESCE(SUM(amount), 0) - COALESCE(SUM(
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
        'net_profit', COALESCE(SUM(amount), 0) - COALESCE(SUM(
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
    'last_month', (
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
        'net_profit', COALESCE(SUM(amount), 0) - COALESCE(SUM(
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
        AND paid_at >= v_last_month_start
        AND paid_at < v_last_month_end
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
        'net_profit', COALESCE(SUM(amount), 0) - COALESCE(SUM(
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
        'net_profit', COALESCE(SUM(amount), 0) - COALESCE(SUM(
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
    'acquirer_breakdown', json_build_object(
      'spedpay', json_build_object(
        'today', (SELECT json_build_object('count', COUNT(*), 'cost', COALESCE(SUM((amount * v_spedpay_rate / 100) + v_spedpay_fixed), 0), 'volume', COALESCE(SUM(amount), 0)) FROM pix_transactions WHERE status = 'paid' AND COALESCE(acquirer, 'spedpay') = 'spedpay' AND paid_at >= v_today_start AND (v_user_id IS NULL OR user_id = v_user_id)),
        'sevenDays', (SELECT json_build_object('count', COUNT(*), 'cost', COALESCE(SUM((amount * v_spedpay_rate / 100) + v_spedpay_fixed), 0), 'volume', COALESCE(SUM(amount), 0)) FROM pix_transactions WHERE status = 'paid' AND COALESCE(acquirer, 'spedpay') = 'spedpay' AND paid_at >= v_week_start AND (v_user_id IS NULL OR user_id = v_user_id)),
        'thisMonth', (SELECT json_build_object('count', COUNT(*), 'cost', COALESCE(SUM((amount * v_spedpay_rate / 100) + v_spedpay_fixed), 0), 'volume', COALESCE(SUM(amount), 0)) FROM pix_transactions WHERE status = 'paid' AND COALESCE(acquirer, 'spedpay') = 'spedpay' AND paid_at >= v_month_start AND (v_user_id IS NULL OR user_id = v_user_id)),
        'total', (SELECT json_build_object('count', COUNT(*), 'cost', COALESCE(SUM((amount * v_spedpay_rate / 100) + v_spedpay_fixed), 0), 'volume', COALESCE(SUM(amount), 0)) FROM pix_transactions WHERE status = 'paid' AND COALESCE(acquirer, 'spedpay') = 'spedpay' AND (v_user_id IS NULL OR user_id = v_user_id))
      ),
      'inter', json_build_object(
        'today', (SELECT json_build_object('count', COUNT(*), 'cost', COALESCE(SUM((amount * v_inter_rate / 100) + v_inter_fixed), 0), 'volume', COALESCE(SUM(amount), 0)) FROM pix_transactions WHERE status = 'paid' AND acquirer = 'inter' AND paid_at >= v_today_start AND (v_user_id IS NULL OR user_id = v_user_id)),
        'sevenDays', (SELECT json_build_object('count', COUNT(*), 'cost', COALESCE(SUM((amount * v_inter_rate / 100) + v_inter_fixed), 0), 'volume', COALESCE(SUM(amount), 0)) FROM pix_transactions WHERE status = 'paid' AND acquirer = 'inter' AND paid_at >= v_week_start AND (v_user_id IS NULL OR user_id = v_user_id)),
        'thisMonth', (SELECT json_build_object('count', COUNT(*), 'cost', COALESCE(SUM((amount * v_inter_rate / 100) + v_inter_fixed), 0), 'volume', COALESCE(SUM(amount), 0)) FROM pix_transactions WHERE status = 'paid' AND acquirer = 'inter' AND paid_at >= v_month_start AND (v_user_id IS NULL OR user_id = v_user_id)),
        'total', (SELECT json_build_object('count', COUNT(*), 'cost', COALESCE(SUM((amount * v_inter_rate / 100) + v_inter_fixed), 0), 'volume', COALESCE(SUM(amount), 0)) FROM pix_transactions WHERE status = 'paid' AND acquirer = 'inter' AND (v_user_id IS NULL OR user_id = v_user_id))
      ),
      'ativus', json_build_object(
        'today', (SELECT json_build_object('count', COUNT(*), 'cost', COALESCE(SUM((amount * v_ativus_rate / 100) + v_ativus_fixed), 0), 'volume', COALESCE(SUM(amount), 0)) FROM pix_transactions WHERE status = 'paid' AND acquirer = 'ativus' AND paid_at >= v_today_start AND (v_user_id IS NULL OR user_id = v_user_id)),
        'sevenDays', (SELECT json_build_object('count', COUNT(*), 'cost', COALESCE(SUM((amount * v_ativus_rate / 100) + v_ativus_fixed), 0), 'volume', COALESCE(SUM(amount), 0)) FROM pix_transactions WHERE status = 'paid' AND acquirer = 'ativus' AND paid_at >= v_week_start AND (v_user_id IS NULL OR user_id = v_user_id)),
        'thisMonth', (SELECT json_build_object('count', COUNT(*), 'cost', COALESCE(SUM((amount * v_ativus_rate / 100) + v_ativus_fixed), 0), 'volume', COALESCE(SUM(amount), 0)) FROM pix_transactions WHERE status = 'paid' AND acquirer = 'ativus' AND paid_at >= v_month_start AND (v_user_id IS NULL OR user_id = v_user_id)),
        'total', (SELECT json_build_object('count', COUNT(*), 'cost', COALESCE(SUM((amount * v_ativus_rate / 100) + v_ativus_fixed), 0), 'volume', COALESCE(SUM(amount), 0)) FROM pix_transactions WHERE status = 'paid' AND acquirer = 'ativus' AND (v_user_id IS NULL OR user_id = v_user_id))
      ),
      'valorion', json_build_object(
        'today', (SELECT json_build_object('count', COUNT(*), 'cost', COALESCE(SUM((amount * v_valorion_rate / 100) + v_valorion_fixed), 0), 'volume', COALESCE(SUM(amount), 0)) FROM pix_transactions WHERE status = 'paid' AND acquirer = 'valorion' AND paid_at >= v_today_start AND (v_user_id IS NULL OR user_id = v_user_id)),
        'sevenDays', (SELECT json_build_object('count', COUNT(*), 'cost', COALESCE(SUM((amount * v_valorion_rate / 100) + v_valorion_fixed), 0), 'volume', COALESCE(SUM(amount), 0)) FROM pix_transactions WHERE status = 'paid' AND acquirer = 'valorion' AND paid_at >= v_week_start AND (v_user_id IS NULL OR user_id = v_user_id)),
        'thisMonth', (SELECT json_build_object('count', COUNT(*), 'cost', COALESCE(SUM((amount * v_valorion_rate / 100) + v_valorion_fixed), 0), 'volume', COALESCE(SUM(amount), 0)) FROM pix_transactions WHERE status = 'paid' AND acquirer = 'valorion' AND paid_at >= v_month_start AND (v_user_id IS NULL OR user_id = v_user_id)),
        'total', (SELECT json_build_object('count', COUNT(*), 'cost', COALESCE(SUM((amount * v_valorion_rate / 100) + v_valorion_fixed), 0), 'volume', COALESCE(SUM(amount), 0)) FROM pix_transactions WHERE status = 'paid' AND acquirer = 'valorion' AND (v_user_id IS NULL OR user_id = v_user_id))
      )
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;