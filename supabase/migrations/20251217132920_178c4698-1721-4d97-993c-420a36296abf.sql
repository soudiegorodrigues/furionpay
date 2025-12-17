
-- DROP existing functions with exact signatures
DROP FUNCTION IF EXISTS public.get_platform_revenue_stats(text);
DROP FUNCTION IF EXISTS public.get_platform_revenue_chart(text, text);
DROP FUNCTION IF EXISTS public.get_platform_user_profit_ranking(text, integer);
DROP FUNCTION IF EXISTS public.get_platform_unique_users();

-- Recreate get_platform_revenue_stats with correct JOIN
CREATE OR REPLACE FUNCTION public.get_platform_revenue_stats(p_user_email TEXT DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  brazil_now TIMESTAMPTZ := NOW() AT TIME ZONE 'America/Sao_Paulo';
  brazil_today DATE := brazil_now::DATE;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can view platform revenue';
  END IF;

  SELECT json_agg(row_to_json(t)) INTO v_result
  FROM (
    WITH period_definitions AS (
      SELECT 'today'::TEXT AS period, brazil_today AS start_date, brazil_today AS end_date, 1 AS sort_order
      UNION ALL
      SELECT '7days', brazil_today - INTERVAL '6 days', brazil_today, 2
      UNION ALL
      SELECT '15days', brazil_today - INTERVAL '14 days', brazil_today, 3
      UNION ALL
      SELECT 'month', DATE_TRUNC('month', brazil_now)::DATE, brazil_today, 4
      UNION ALL
      SELECT 'year', DATE_TRUNC('year', brazil_now)::DATE, brazil_today, 5
    ),
    filtered_transactions AS (
      SELECT 
        pt.amount,
        pt.fee_percentage,
        pt.fee_fixed,
        (pt.paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE AS paid_date
      FROM public.pix_transactions pt
      LEFT JOIN auth.users u ON pt.user_id = u.id
      WHERE pt.status = 'paid'
        AND pt.paid_at IS NOT NULL
        AND (p_user_email IS NULL OR u.email = p_user_email)
    )
    SELECT 
      pd.period AS period_label,
      COALESCE(SUM(
        (COALESCE(ft.fee_percentage, 0) / 100.0 * ft.amount) + COALESCE(ft.fee_fixed, 0)
      ), 0)::NUMERIC AS gross_revenue,
      0::NUMERIC AS acquirer_cost,
      COALESCE(SUM(
        (COALESCE(ft.fee_percentage, 0) / 100.0 * ft.amount) + COALESCE(ft.fee_fixed, 0)
      ), 0)::NUMERIC AS net_profit,
      COUNT(ft.amount)::BIGINT AS transaction_count
    FROM period_definitions pd
    LEFT JOIN filtered_transactions ft 
      ON ft.paid_date >= pd.start_date AND ft.paid_date <= pd.end_date
    GROUP BY pd.period, pd.sort_order
    ORDER BY pd.sort_order
  ) t;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- Recreate get_platform_revenue_chart with correct JOIN
CREATE OR REPLACE FUNCTION public.get_platform_revenue_chart(
  p_filter TEXT DEFAULT '7days',
  p_user_email TEXT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  brazil_now TIMESTAMPTZ := NOW() AT TIME ZONE 'America/Sao_Paulo';
  brazil_today DATE := brazil_now::DATE;
  start_date DATE;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can view platform revenue';
  END IF;

  start_date := CASE p_filter
    WHEN '7days' THEN brazil_today - INTERVAL '6 days'
    WHEN '15days' THEN brazil_today - INTERVAL '14 days'
    WHEN '30days' THEN brazil_today - INTERVAL '29 days'
    WHEN 'month' THEN DATE_TRUNC('month', brazil_now)::DATE
    WHEN 'year' THEN DATE_TRUNC('year', brazil_now)::DATE
    ELSE brazil_today - INTERVAL '6 days'
  END;

  SELECT json_agg(row_to_json(t) ORDER BY t.chart_date) INTO v_result
  FROM (
    WITH date_series AS (
      SELECT generate_series(start_date, brazil_today, '1 day'::INTERVAL)::DATE AS chart_date
    ),
    daily_profits AS (
      SELECT 
        (pt.paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE AS paid_date,
        SUM((COALESCE(pt.fee_percentage, 0) / 100.0 * pt.amount) + COALESCE(pt.fee_fixed, 0)) AS daily_gross
      FROM public.pix_transactions pt
      LEFT JOIN auth.users u ON pt.user_id = u.id
      WHERE pt.status = 'paid'
        AND pt.paid_at IS NOT NULL
        AND (pt.paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE >= start_date
        AND (p_user_email IS NULL OR u.email = p_user_email)
      GROUP BY (pt.paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE
    )
    SELECT 
      ds.chart_date,
      TO_CHAR(ds.chart_date, 'DD/MM') AS period_key,
      COALESCE(dp.daily_gross, 0)::NUMERIC AS gross_revenue,
      COALESCE(dp.daily_gross, 0)::NUMERIC AS net_profit
    FROM date_series ds
    LEFT JOIN daily_profits dp ON ds.chart_date = dp.paid_date
  ) t;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- Recreate get_platform_user_profit_ranking with correct JOIN
CREATE OR REPLACE FUNCTION public.get_platform_user_profit_ranking(
  p_filter TEXT DEFAULT '30days',
  p_limit INT DEFAULT 50
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  brazil_now TIMESTAMPTZ := NOW() AT TIME ZONE 'America/Sao_Paulo';
  brazil_today DATE := brazil_now::DATE;
  start_date DATE;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can view platform users';
  END IF;

  start_date := CASE p_filter
    WHEN 'today' THEN brazil_today
    WHEN '7days' THEN brazil_today - INTERVAL '6 days'
    WHEN '30days' THEN brazil_today - INTERVAL '29 days'
    WHEN 'month' THEN DATE_TRUNC('month', brazil_now)::DATE
    ELSE brazil_today - INTERVAL '29 days'
  END;

  SELECT json_agg(row_to_json(t)) INTO v_result
  FROM (
    SELECT 
      u.email AS user_email,
      SUM((COALESCE(pt.fee_percentage, 0) / 100.0 * pt.amount) + COALESCE(pt.fee_fixed, 0))::NUMERIC AS total_profit,
      COUNT(*)::BIGINT AS transaction_count
    FROM public.pix_transactions pt
    JOIN auth.users u ON pt.user_id = u.id
    WHERE pt.status = 'paid'
      AND pt.paid_at IS NOT NULL
      AND (pt.paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE >= start_date
    GROUP BY u.id, u.email
    ORDER BY total_profit DESC
    LIMIT p_limit
  ) t;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- Recreate get_platform_unique_users with correct JOIN
CREATE OR REPLACE FUNCTION public.get_platform_unique_users()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can view platform users';
  END IF;

  SELECT json_agg(row_to_json(t)) INTO v_result
  FROM (
    SELECT DISTINCT u.email AS user_email
    FROM public.pix_transactions pt
    JOIN auth.users u ON pt.user_id = u.id
    WHERE pt.status = 'paid'
      AND pt.paid_at IS NOT NULL
      AND u.email IS NOT NULL
    ORDER BY u.email
  ) t;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;
