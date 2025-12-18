-- 1. Corrigir valores vazios existentes nas configurações de taxa
UPDATE admin_settings 
SET value = '0', updated_at = now()
WHERE key IN ('valorion_fee_rate', 'valorion_fixed_fee', 'spedpay_fee_rate', 'spedpay_fixed_fee', 'inter_fee_rate', 'inter_fixed_fee', 'ativus_fee_rate', 'ativus_fixed_fee')
AND user_id IS NULL 
AND (value = '' OR value IS NULL);

-- 2. Drop e recriar RPC get_platform_revenue_stats
DROP FUNCTION IF EXISTS get_platform_revenue_stats(TEXT, TEXT);

CREATE FUNCTION get_platform_revenue_stats(p_filter TEXT DEFAULT '7d', p_user_email TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ := now();
  v_today_start TIMESTAMPTZ;
  v_week_start TIMESTAMPTZ;
  v_month_start TIMESTAMPTZ;
  v_last_month_start TIMESTAMPTZ;
  v_last_month_end TIMESTAMPTZ;
  v_user_id UUID := NULL;
  v_spedpay_rate NUMERIC;
  v_spedpay_fixed NUMERIC;
  v_inter_rate NUMERIC;
  v_inter_fixed NUMERIC;
  v_ativus_rate NUMERIC;
  v_ativus_fixed NUMERIC;
  v_valorion_rate NUMERIC;
  v_valorion_fixed NUMERIC;
BEGIN
  -- Get acquirer fee rates with NULLIF protection for empty strings
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'spedpay_fee_rate' AND user_id IS NULL LIMIT 1), '')::NUMERIC, 0) INTO v_spedpay_rate;
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'spedpay_fixed_fee' AND user_id IS NULL LIMIT 1), '')::NUMERIC, 0) INTO v_spedpay_fixed;
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'inter_fee_rate' AND user_id IS NULL LIMIT 1), '')::NUMERIC, 0) INTO v_inter_rate;
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'inter_fixed_fee' AND user_id IS NULL LIMIT 1), '')::NUMERIC, 0) INTO v_inter_fixed;
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'ativus_fee_rate' AND user_id IS NULL LIMIT 1), '')::NUMERIC, 0) INTO v_ativus_rate;
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'ativus_fixed_fee' AND user_id IS NULL LIMIT 1), '')::NUMERIC, 0) INTO v_ativus_fixed;
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'valorion_fee_rate' AND user_id IS NULL LIMIT 1), '')::NUMERIC, 0) INTO v_valorion_rate;
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'valorion_fixed_fee' AND user_id IS NULL LIMIT 1), '')::NUMERIC, 0) INTO v_valorion_fixed;

  IF p_user_email IS NOT NULL AND p_user_email != '' THEN
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_user_email LIMIT 1;
  END IF;

  v_today_start := date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
  v_week_start := date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo' - INTERVAL '7 days') AT TIME ZONE 'America/Sao_Paulo';
  v_month_start := date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
  v_last_month_start := date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo' - INTERVAL '1 month') AT TIME ZONE 'America/Sao_Paulo';
  v_last_month_end := date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';

  CASE p_filter
    WHEN 'today' THEN v_start_date := v_today_start;
    WHEN '7d' THEN v_start_date := v_week_start;
    WHEN '30d' THEN v_start_date := now() - INTERVAL '30 days';
    WHEN 'month' THEN v_start_date := v_month_start;
    WHEN 'all' THEN v_start_date := '2020-01-01'::TIMESTAMPTZ;
    ELSE v_start_date := v_week_start;
  END CASE;

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
      FROM pix_transactions WHERE status = 'paid' AND paid_at >= v_today_start AND (v_user_id IS NULL OR user_id = v_user_id)
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
      FROM pix_transactions WHERE status = 'paid' AND paid_at >= v_week_start AND (v_user_id IS NULL OR user_id = v_user_id)
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
      FROM pix_transactions WHERE status = 'paid' AND paid_at >= v_month_start AND (v_user_id IS NULL OR user_id = v_user_id)
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
      FROM pix_transactions WHERE status = 'paid' AND paid_at >= v_last_month_start AND paid_at < v_last_month_end AND (v_user_id IS NULL OR user_id = v_user_id)
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
      FROM pix_transactions WHERE status = 'paid' AND (v_user_id IS NULL OR user_id = v_user_id)
    ),
    'acquirer_breakdown', (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT 
          COALESCE(acquirer, 'spedpay') as acquirer,
          COUNT(*) as transaction_count,
          SUM(amount) as gross_revenue,
          SUM(
            CASE 
              WHEN COALESCE(acquirer, 'spedpay') = 'inter' THEN (amount * v_inter_rate / 100) + v_inter_fixed
              WHEN COALESCE(acquirer, 'spedpay') = 'ativus' THEN (amount * v_ativus_rate / 100) + v_ativus_fixed
              WHEN COALESCE(acquirer, 'spedpay') = 'valorion' THEN (amount * v_valorion_rate / 100) + v_valorion_fixed
              ELSE (amount * v_spedpay_rate / 100) + v_spedpay_fixed
            END
          ) as acquirer_cost
        FROM pix_transactions
        WHERE status = 'paid' AND paid_at >= v_start_date AND (v_user_id IS NULL OR user_id = v_user_id)
        GROUP BY COALESCE(acquirer, 'spedpay')
        ORDER BY gross_revenue DESC
      ) t
    ),
    'fee_rates', json_build_object(
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
$$;

-- 3. Drop e recriar RPC get_platform_user_profit_ranking
DROP FUNCTION IF EXISTS get_platform_user_profit_ranking(TEXT, INT);

CREATE FUNCTION get_platform_user_profit_ranking(p_filter TEXT DEFAULT '30d', p_limit INT DEFAULT 20)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_start_date TIMESTAMPTZ;
  v_spedpay_rate NUMERIC;
  v_spedpay_fixed NUMERIC;
  v_inter_rate NUMERIC;
  v_inter_fixed NUMERIC;
  v_ativus_rate NUMERIC;
  v_ativus_fixed NUMERIC;
  v_valorion_rate NUMERIC;
  v_valorion_fixed NUMERIC;
BEGIN
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'spedpay_fee_rate' AND user_id IS NULL LIMIT 1), '')::NUMERIC, 0) INTO v_spedpay_rate;
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'spedpay_fixed_fee' AND user_id IS NULL LIMIT 1), '')::NUMERIC, 0) INTO v_spedpay_fixed;
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'inter_fee_rate' AND user_id IS NULL LIMIT 1), '')::NUMERIC, 0) INTO v_inter_rate;
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'inter_fixed_fee' AND user_id IS NULL LIMIT 1), '')::NUMERIC, 0) INTO v_inter_fixed;
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'ativus_fee_rate' AND user_id IS NULL LIMIT 1), '')::NUMERIC, 0) INTO v_ativus_rate;
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'ativus_fixed_fee' AND user_id IS NULL LIMIT 1), '')::NUMERIC, 0) INTO v_ativus_fixed;
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'valorion_fee_rate' AND user_id IS NULL LIMIT 1), '')::NUMERIC, 0) INTO v_valorion_rate;
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'valorion_fixed_fee' AND user_id IS NULL LIMIT 1), '')::NUMERIC, 0) INTO v_valorion_fixed;

  CASE p_filter
    WHEN 'today' THEN v_start_date := date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
    WHEN '7d' THEN v_start_date := now() - INTERVAL '7 days';
    WHEN '30d' THEN v_start_date := now() - INTERVAL '30 days';
    WHEN 'month' THEN v_start_date := date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
    WHEN 'all' THEN v_start_date := '2020-01-01'::TIMESTAMPTZ;
    ELSE v_start_date := now() - INTERVAL '30 days';
  END CASE;

  SELECT json_agg(row_to_json(t))
  INTO v_result
  FROM (
    SELECT 
      p.user_id,
      u.email as user_email,
      COUNT(*) as transaction_count,
      SUM(p.amount) as gross_revenue,
      SUM(
        CASE 
          WHEN COALESCE(p.acquirer, 'spedpay') = 'inter' THEN (p.amount * v_inter_rate / 100) + v_inter_fixed
          WHEN COALESCE(p.acquirer, 'spedpay') = 'ativus' THEN (p.amount * v_ativus_rate / 100) + v_ativus_fixed
          WHEN COALESCE(p.acquirer, 'spedpay') = 'valorion' THEN (p.amount * v_valorion_rate / 100) + v_valorion_fixed
          ELSE (p.amount * v_spedpay_rate / 100) + v_spedpay_fixed
        END
      ) as acquirer_cost,
      SUM(p.amount - 
        CASE 
          WHEN COALESCE(p.acquirer, 'spedpay') = 'inter' THEN (p.amount * v_inter_rate / 100) + v_inter_fixed
          WHEN COALESCE(p.acquirer, 'spedpay') = 'ativus' THEN (p.amount * v_ativus_rate / 100) + v_ativus_fixed
          WHEN COALESCE(p.acquirer, 'spedpay') = 'valorion' THEN (p.amount * v_valorion_rate / 100) + v_valorion_fixed
          ELSE (p.amount * v_spedpay_rate / 100) + v_spedpay_fixed
        END
      ) as net_profit
    FROM pix_transactions p
    LEFT JOIN auth.users u ON p.user_id = u.id
    WHERE p.status = 'paid' AND p.paid_at >= v_start_date AND p.user_id IS NOT NULL
    GROUP BY p.user_id, u.email
    ORDER BY net_profit DESC
    LIMIT p_limit
  ) t;
  
  RETURN COALESCE(v_result, '[]'::JSON);
END;
$$;

-- 4. Drop e recriar RPC get_platform_revenue_chart
DROP FUNCTION IF EXISTS get_platform_revenue_chart(TEXT, TEXT);

CREATE FUNCTION get_platform_revenue_chart(p_filter TEXT DEFAULT '7d', p_user_email TEXT DEFAULT NULL)
RETURNS TABLE(period_key TEXT, gross_revenue NUMERIC, acquirer_cost NUMERIC, net_profit NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date TIMESTAMPTZ;
  v_user_id UUID := NULL;
  v_spedpay_rate NUMERIC;
  v_spedpay_fixed NUMERIC;
  v_inter_rate NUMERIC;
  v_inter_fixed NUMERIC;
  v_ativus_rate NUMERIC;
  v_ativus_fixed NUMERIC;
  v_valorion_rate NUMERIC;
  v_valorion_fixed NUMERIC;
BEGIN
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'spedpay_fee_rate' AND user_id IS NULL LIMIT 1), '')::NUMERIC, 0) INTO v_spedpay_rate;
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'spedpay_fixed_fee' AND user_id IS NULL LIMIT 1), '')::NUMERIC, 0) INTO v_spedpay_fixed;
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'inter_fee_rate' AND user_id IS NULL LIMIT 1), '')::NUMERIC, 0) INTO v_inter_rate;
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'inter_fixed_fee' AND user_id IS NULL LIMIT 1), '')::NUMERIC, 0) INTO v_inter_fixed;
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'ativus_fee_rate' AND user_id IS NULL LIMIT 1), '')::NUMERIC, 0) INTO v_ativus_rate;
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'ativus_fixed_fee' AND user_id IS NULL LIMIT 1), '')::NUMERIC, 0) INTO v_ativus_fixed;
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'valorion_fee_rate' AND user_id IS NULL LIMIT 1), '')::NUMERIC, 0) INTO v_valorion_rate;
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'valorion_fixed_fee' AND user_id IS NULL LIMIT 1), '')::NUMERIC, 0) INTO v_valorion_fixed;

  IF p_user_email IS NOT NULL AND p_user_email != '' THEN
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_user_email LIMIT 1;
  END IF;

  CASE p_filter
    WHEN 'today' THEN v_start_date := date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
    WHEN '7d' THEN v_start_date := now() - INTERVAL '7 days';
    WHEN '30d' THEN v_start_date := now() - INTERVAL '30 days';
    WHEN 'month' THEN v_start_date := date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
    WHEN '90d' THEN v_start_date := now() - INTERVAL '90 days';
    WHEN 'all' THEN v_start_date := '2020-01-01'::TIMESTAMPTZ;
    ELSE v_start_date := now() - INTERVAL '7 days';
  END CASE;

  RETURN QUERY
  SELECT 
    to_char(paid_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM') as period_key,
    COALESCE(SUM(amount), 0)::NUMERIC as gross_revenue,
    COALESCE(SUM(
      CASE 
        WHEN COALESCE(acquirer, 'spedpay') = 'inter' THEN (amount * v_inter_rate / 100) + v_inter_fixed
        WHEN COALESCE(acquirer, 'spedpay') = 'ativus' THEN (amount * v_ativus_rate / 100) + v_ativus_fixed
        WHEN COALESCE(acquirer, 'spedpay') = 'valorion' THEN (amount * v_valorion_rate / 100) + v_valorion_fixed
        ELSE (amount * v_spedpay_rate / 100) + v_spedpay_fixed
      END
    ), 0)::NUMERIC as acquirer_cost,
    COALESCE(SUM(amount - 
      CASE 
        WHEN COALESCE(acquirer, 'spedpay') = 'inter' THEN (amount * v_inter_rate / 100) + v_inter_fixed
        WHEN COALESCE(acquirer, 'spedpay') = 'ativus' THEN (amount * v_ativus_rate / 100) + v_ativus_fixed
        WHEN COALESCE(acquirer, 'spedpay') = 'valorion' THEN (amount * v_valorion_rate / 100) + v_valorion_fixed
        ELSE (amount * v_spedpay_rate / 100) + v_spedpay_fixed
      END
    ), 0)::NUMERIC as net_profit
  FROM pix_transactions
  WHERE status = 'paid' AND paid_at >= v_start_date AND (v_user_id IS NULL OR user_id = v_user_id)
  GROUP BY to_char(paid_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD'), to_char(paid_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM')
  ORDER BY to_char(paid_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD');
END;
$$;