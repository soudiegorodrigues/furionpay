-- Remove overload/duplicated RPCs and recreate single canonical versions

BEGIN;

-- 1) Drop ALL existing overloads
DROP FUNCTION IF EXISTS public.get_platform_revenue_stats(text, text);
DROP FUNCTION IF EXISTS public.get_platform_revenue_stats(text);

DROP FUNCTION IF EXISTS public.get_platform_revenue_chart(text);
DROP FUNCTION IF EXISTS public.get_platform_revenue_chart(text, text);

DROP FUNCTION IF EXISTS public.get_platform_user_profit_ranking(text, integer);

-- 2) Recreate: get_platform_revenue_chart (canonical)
CREATE OR REPLACE FUNCTION public.get_platform_revenue_chart(
  p_filter text DEFAULT '7d'::text,
  p_user_email text DEFAULT NULL::text
)
RETURNS TABLE(period_key text, gross_revenue numeric, acquirer_cost numeric, net_profit numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_start_date timestamptz;
  v_user_id uuid := NULL;
  v_spedpay_rate numeric;
  v_spedpay_fixed numeric;
  v_inter_rate numeric;
  v_inter_fixed numeric;
  v_ativus_rate numeric;
  v_ativus_fixed numeric;
  v_valorion_rate numeric;
  v_valorion_fixed numeric;
BEGIN
  IF NOT public.is_admin_authenticated() THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'spedpay_fee_rate' AND user_id IS NULL LIMIT 1), '')::numeric, 0) INTO v_spedpay_rate;
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'spedpay_fixed_fee' AND user_id IS NULL LIMIT 1), '')::numeric, 0) INTO v_spedpay_fixed;
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'inter_fee_rate' AND user_id IS NULL LIMIT 1), '')::numeric, 0) INTO v_inter_rate;
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'inter_fixed_fee' AND user_id IS NULL LIMIT 1), '')::numeric, 0) INTO v_inter_fixed;
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'ativus_fee_rate' AND user_id IS NULL LIMIT 1), '')::numeric, 0) INTO v_ativus_rate;
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'ativus_fixed_fee' AND user_id IS NULL LIMIT 1), '')::numeric, 0) INTO v_ativus_fixed;
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'valorion_fee_rate' AND user_id IS NULL LIMIT 1), '')::numeric, 0) INTO v_valorion_rate;
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'valorion_fixed_fee' AND user_id IS NULL LIMIT 1), '')::numeric, 0) INTO v_valorion_fixed;

  IF p_user_email IS NOT NULL AND p_user_email <> '' THEN
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_user_email LIMIT 1;
  END IF;

  CASE p_filter
    WHEN 'today' THEN v_start_date := date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
    WHEN '7d' THEN v_start_date := now() - interval '7 days';
    WHEN '30d' THEN v_start_date := now() - interval '30 days';
    WHEN 'month' THEN v_start_date := date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
    WHEN '90d' THEN v_start_date := now() - interval '90 days';
    WHEN 'all' THEN v_start_date := '2020-01-01'::timestamptz;
    ELSE v_start_date := now() - interval '7 days';
  END CASE;

  RETURN QUERY
  SELECT
    to_char(paid_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM') as period_key,
    COALESCE(SUM(amount), 0)::numeric as gross_revenue,
    COALESCE(SUM(
      CASE
        WHEN COALESCE(acquirer, 'spedpay') = 'inter' THEN (amount * v_inter_rate / 100) + v_inter_fixed
        WHEN COALESCE(acquirer, 'spedpay') = 'ativus' THEN (amount * v_ativus_rate / 100) + v_ativus_fixed
        WHEN COALESCE(acquirer, 'spedpay') = 'valorion' THEN (amount * v_valorion_rate / 100) + v_valorion_fixed
        ELSE (amount * v_spedpay_rate / 100) + v_spedpay_fixed
      END
    ), 0)::numeric as acquirer_cost,
    COALESCE(SUM(amount -
      CASE
        WHEN COALESCE(acquirer, 'spedpay') = 'inter' THEN (amount * v_inter_rate / 100) + v_inter_fixed
        WHEN COALESCE(acquirer, 'spedpay') = 'ativus' THEN (amount * v_ativus_rate / 100) + v_ativus_fixed
        WHEN COALESCE(acquirer, 'spedpay') = 'valorion' THEN (amount * v_valorion_rate / 100) + v_valorion_fixed
        ELSE (amount * v_spedpay_rate / 100) + v_spedpay_fixed
      END
    ), 0)::numeric as net_profit
  FROM pix_transactions
  WHERE status = 'paid'
    AND paid_at >= v_start_date
    AND (v_user_id IS NULL OR user_id = v_user_id)
  GROUP BY to_char(paid_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD'), to_char(paid_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM')
  ORDER BY to_char(paid_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD');
END;
$function$;

-- 3) Recreate: get_platform_user_profit_ranking (canonical)
CREATE OR REPLACE FUNCTION public.get_platform_user_profit_ranking(
  p_filter text DEFAULT '30d'::text,
  p_limit integer DEFAULT 20
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result json;
  v_start_date timestamptz;
  v_spedpay_rate numeric;
  v_spedpay_fixed numeric;
  v_inter_rate numeric;
  v_inter_fixed numeric;
  v_ativus_rate numeric;
  v_ativus_fixed numeric;
  v_valorion_rate numeric;
  v_valorion_fixed numeric;
BEGIN
  IF NOT public.is_admin_authenticated() THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'spedpay_fee_rate' AND user_id IS NULL LIMIT 1), '')::numeric, 0) INTO v_spedpay_rate;
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'spedpay_fixed_fee' AND user_id IS NULL LIMIT 1), '')::numeric, 0) INTO v_spedpay_fixed;
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'inter_fee_rate' AND user_id IS NULL LIMIT 1), '')::numeric, 0) INTO v_inter_rate;
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'inter_fixed_fee' AND user_id IS NULL LIMIT 1), '')::numeric, 0) INTO v_inter_fixed;
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'ativus_fee_rate' AND user_id IS NULL LIMIT 1), '')::numeric, 0) INTO v_ativus_rate;
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'ativus_fixed_fee' AND user_id IS NULL LIMIT 1), '')::numeric, 0) INTO v_ativus_fixed;
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'valorion_fee_rate' AND user_id IS NULL LIMIT 1), '')::numeric, 0) INTO v_valorion_rate;
  SELECT COALESCE(NULLIF((SELECT value FROM admin_settings WHERE key = 'valorion_fixed_fee' AND user_id IS NULL LIMIT 1), '')::numeric, 0) INTO v_valorion_fixed;

  CASE p_filter
    WHEN 'today' THEN v_start_date := date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
    WHEN '7d' THEN v_start_date := now() - interval '7 days';
    WHEN '30d' THEN v_start_date := now() - interval '30 days';
    WHEN 'month' THEN v_start_date := date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
    WHEN 'all' THEN v_start_date := '2020-01-01'::timestamptz;
    ELSE v_start_date := now() - interval '30 days';
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
    WHERE p.status = 'paid'
      AND p.paid_at >= v_start_date
      AND p.user_id IS NOT NULL
    GROUP BY p.user_id, u.email
    ORDER BY net_profit DESC
    LIMIT p_limit
  ) t;

  RETURN COALESCE(v_result, '[]'::json);
END;
$function$;

-- 4) Recreate: get_platform_revenue_stats (canonical, includes fortnight + year)
CREATE OR REPLACE FUNCTION public.get_platform_revenue_stats(
  p_user_email text DEFAULT NULL::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result json;
  v_user_id uuid := NULL;

  v_today_start timestamptz;
  v_week_start timestamptz;
  v_fortnight_start timestamptz;
  v_month_start timestamptz;
  v_year_start timestamptz;

  v_spedpay_rate numeric;
  v_spedpay_fixed numeric;
  v_inter_rate numeric;
  v_inter_fixed numeric;
  v_ativus_rate numeric;
  v_ativus_fixed numeric;
  v_valorion_rate numeric;
  v_valorion_fixed numeric;
BEGIN
  IF NOT public.is_admin_authenticated() THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_user_email IS NOT NULL AND p_user_email <> '' THEN
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_user_email LIMIT 1;
  END IF;

  v_today_start := date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
  v_week_start := v_today_start - interval '6 days';
  v_fortnight_start := v_today_start - interval '14 days';
  v_month_start := date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
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
        AND paid_at >= v_today_start
        AND paid_at < (v_today_start + interval '1 day')
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

    -- Keep legacy extras (used for debugging / UI extensions)
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
        WHERE status = 'paid'
          AND paid_at >= v_week_start
          AND (v_user_id IS NULL OR user_id = v_user_id)
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
$function$;

-- 5) Ensure execute privileges (safe because functions enforce admin auth)
GRANT EXECUTE ON FUNCTION public.get_platform_revenue_chart(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_user_profit_ranking(text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_revenue_stats(text) TO anon, authenticated;

COMMIT;