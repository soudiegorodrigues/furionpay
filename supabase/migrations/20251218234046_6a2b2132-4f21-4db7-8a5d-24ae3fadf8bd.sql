
-- Drop and recreate get_platform_revenue_stats to calculate revenue from fees
CREATE OR REPLACE FUNCTION public.get_platform_revenue_stats(p_user_email text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result json;
  user_filter uuid := NULL;
BEGIN
  -- Check if caller is admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  -- If user email provided, get their user_id
  IF p_user_email IS NOT NULL THEN
    SELECT id INTO user_filter
    FROM auth.users
    WHERE email = p_user_email;
  END IF;

  SELECT json_build_object(
    'today', (
      SELECT json_build_object(
        'gross_revenue', COALESCE(SUM((COALESCE(fee_percentage, 0) / 100 * amount) + COALESCE(fee_fixed, 0)), 0),
        'acquirer_cost', COALESCE(SUM(
          CASE 
            WHEN acquirer = 'valorion' THEN amount * 0.0089
            WHEN acquirer = 'ativus' THEN amount * 0.0099
            ELSE amount * 0.0149
          END
        ), 0),
        'net_profit', COALESCE(SUM((COALESCE(fee_percentage, 0) / 100 * amount) + COALESCE(fee_fixed, 0)), 0) - COALESCE(SUM(
          CASE 
            WHEN acquirer = 'valorion' THEN amount * 0.0089
            WHEN acquirer = 'ativus' THEN amount * 0.0099
            ELSE amount * 0.0149
          END
        ), 0),
        'transaction_count', COUNT(*)
      )
      FROM pix_transactions
      WHERE status = 'paid'
        AND paid_date_brazil = CURRENT_DATE
        AND (user_filter IS NULL OR user_id = user_filter)
    ),
    'week', (
      SELECT json_build_object(
        'gross_revenue', COALESCE(SUM((COALESCE(fee_percentage, 0) / 100 * amount) + COALESCE(fee_fixed, 0)), 0),
        'acquirer_cost', COALESCE(SUM(
          CASE 
            WHEN acquirer = 'valorion' THEN amount * 0.0089
            WHEN acquirer = 'ativus' THEN amount * 0.0099
            ELSE amount * 0.0149
          END
        ), 0),
        'net_profit', COALESCE(SUM((COALESCE(fee_percentage, 0) / 100 * amount) + COALESCE(fee_fixed, 0)), 0) - COALESCE(SUM(
          CASE 
            WHEN acquirer = 'valorion' THEN amount * 0.0089
            WHEN acquirer = 'ativus' THEN amount * 0.0099
            ELSE amount * 0.0149
          END
        ), 0),
        'transaction_count', COUNT(*)
      )
      FROM pix_transactions
      WHERE status = 'paid'
        AND paid_date_brazil >= CURRENT_DATE - INTERVAL '7 days'
        AND (user_filter IS NULL OR user_id = user_filter)
    ),
    'fortnight', (
      SELECT json_build_object(
        'gross_revenue', COALESCE(SUM((COALESCE(fee_percentage, 0) / 100 * amount) + COALESCE(fee_fixed, 0)), 0),
        'acquirer_cost', COALESCE(SUM(
          CASE 
            WHEN acquirer = 'valorion' THEN amount * 0.0089
            WHEN acquirer = 'ativus' THEN amount * 0.0099
            ELSE amount * 0.0149
          END
        ), 0),
        'net_profit', COALESCE(SUM((COALESCE(fee_percentage, 0) / 100 * amount) + COALESCE(fee_fixed, 0)), 0) - COALESCE(SUM(
          CASE 
            WHEN acquirer = 'valorion' THEN amount * 0.0089
            WHEN acquirer = 'ativus' THEN amount * 0.0099
            ELSE amount * 0.0149
          END
        ), 0),
        'transaction_count', COUNT(*)
      )
      FROM pix_transactions
      WHERE status = 'paid'
        AND paid_date_brazil >= CURRENT_DATE - INTERVAL '15 days'
        AND (user_filter IS NULL OR user_id = user_filter)
    ),
    'month', (
      SELECT json_build_object(
        'gross_revenue', COALESCE(SUM((COALESCE(fee_percentage, 0) / 100 * amount) + COALESCE(fee_fixed, 0)), 0),
        'acquirer_cost', COALESCE(SUM(
          CASE 
            WHEN acquirer = 'valorion' THEN amount * 0.0089
            WHEN acquirer = 'ativus' THEN amount * 0.0099
            ELSE amount * 0.0149
          END
        ), 0),
        'net_profit', COALESCE(SUM((COALESCE(fee_percentage, 0) / 100 * amount) + COALESCE(fee_fixed, 0)), 0) - COALESCE(SUM(
          CASE 
            WHEN acquirer = 'valorion' THEN amount * 0.0089
            WHEN acquirer = 'ativus' THEN amount * 0.0099
            ELSE amount * 0.0149
          END
        ), 0),
        'transaction_count', COUNT(*)
      )
      FROM pix_transactions
      WHERE status = 'paid'
        AND paid_date_brazil >= DATE_TRUNC('month', CURRENT_DATE)
        AND (user_filter IS NULL OR user_id = user_filter)
    ),
    'last_month', (
      SELECT json_build_object(
        'gross_revenue', COALESCE(SUM((COALESCE(fee_percentage, 0) / 100 * amount) + COALESCE(fee_fixed, 0)), 0),
        'acquirer_cost', COALESCE(SUM(
          CASE 
            WHEN acquirer = 'valorion' THEN amount * 0.0089
            WHEN acquirer = 'ativus' THEN amount * 0.0099
            ELSE amount * 0.0149
          END
        ), 0),
        'net_profit', COALESCE(SUM((COALESCE(fee_percentage, 0) / 100 * amount) + COALESCE(fee_fixed, 0)), 0) - COALESCE(SUM(
          CASE 
            WHEN acquirer = 'valorion' THEN amount * 0.0089
            WHEN acquirer = 'ativus' THEN amount * 0.0099
            ELSE amount * 0.0149
          END
        ), 0),
        'transaction_count', COUNT(*)
      )
      FROM pix_transactions
      WHERE status = 'paid'
        AND paid_date_brazil >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
        AND paid_date_brazil < DATE_TRUNC('month', CURRENT_DATE)
        AND (user_filter IS NULL OR user_id = user_filter)
    ),
    'year', (
      SELECT json_build_object(
        'gross_revenue', COALESCE(SUM((COALESCE(fee_percentage, 0) / 100 * amount) + COALESCE(fee_fixed, 0)), 0),
        'acquirer_cost', COALESCE(SUM(
          CASE 
            WHEN acquirer = 'valorion' THEN amount * 0.0089
            WHEN acquirer = 'ativus' THEN amount * 0.0099
            ELSE amount * 0.0149
          END
        ), 0),
        'net_profit', COALESCE(SUM((COALESCE(fee_percentage, 0) / 100 * amount) + COALESCE(fee_fixed, 0)), 0) - COALESCE(SUM(
          CASE 
            WHEN acquirer = 'valorion' THEN amount * 0.0089
            WHEN acquirer = 'ativus' THEN amount * 0.0099
            ELSE amount * 0.0149
          END
        ), 0),
        'transaction_count', COUNT(*)
      )
      FROM pix_transactions
      WHERE status = 'paid'
        AND paid_date_brazil >= DATE_TRUNC('year', CURRENT_DATE)
        AND (user_filter IS NULL OR user_id = user_filter)
    ),
    'all_time', (
      SELECT json_build_object(
        'gross_revenue', COALESCE(SUM((COALESCE(fee_percentage, 0) / 100 * amount) + COALESCE(fee_fixed, 0)), 0),
        'acquirer_cost', COALESCE(SUM(
          CASE 
            WHEN acquirer = 'valorion' THEN amount * 0.0089
            WHEN acquirer = 'ativus' THEN amount * 0.0099
            ELSE amount * 0.0149
          END
        ), 0),
        'net_profit', COALESCE(SUM((COALESCE(fee_percentage, 0) / 100 * amount) + COALESCE(fee_fixed, 0)), 0) - COALESCE(SUM(
          CASE 
            WHEN acquirer = 'valorion' THEN amount * 0.0089
            WHEN acquirer = 'ativus' THEN amount * 0.0099
            ELSE amount * 0.0149
          END
        ), 0),
        'transaction_count', COUNT(*)
      )
      FROM pix_transactions
      WHERE status = 'paid'
        AND (user_filter IS NULL OR user_id = user_filter)
    )
  ) INTO result;

  RETURN result;
END;
$function$;

-- Drop and recreate get_platform_revenue_chart to calculate revenue from fees
CREATE OR REPLACE FUNCTION public.get_platform_revenue_chart(p_filter text DEFAULT '30d'::text, p_user_email text DEFAULT NULL::text)
 RETURNS TABLE(period_key text, gross_revenue numeric, acquirer_cost numeric, net_profit numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_filter uuid := NULL;
BEGIN
  -- Check if caller is admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  -- If user email provided, get their user_id
  IF p_user_email IS NOT NULL THEN
    SELECT id INTO user_filter
    FROM auth.users
    WHERE email = p_user_email;
  END IF;

  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      CASE 
        WHEN p_filter = '7d' THEN CURRENT_DATE - INTERVAL '6 days'
        WHEN p_filter = '30d' THEN CURRENT_DATE - INTERVAL '29 days'
        WHEN p_filter = '90d' THEN CURRENT_DATE - INTERVAL '89 days'
        ELSE CURRENT_DATE - INTERVAL '29 days'
      END,
      CURRENT_DATE,
      '1 day'::interval
    )::date AS day
  ),
  daily_stats AS (
    SELECT 
      paid_date_brazil as day,
      SUM((COALESCE(fee_percentage, 0) / 100 * amount) + COALESCE(fee_fixed, 0)) as platform_revenue,
      SUM(
        CASE 
          WHEN acquirer = 'valorion' THEN amount * 0.0089
          WHEN acquirer = 'ativus' THEN amount * 0.0099
          ELSE amount * 0.0149
        END
      ) as acq_cost
    FROM pix_transactions
    WHERE status = 'paid'
      AND paid_date_brazil >= CASE 
        WHEN p_filter = '7d' THEN CURRENT_DATE - INTERVAL '6 days'
        WHEN p_filter = '30d' THEN CURRENT_DATE - INTERVAL '29 days'
        WHEN p_filter = '90d' THEN CURRENT_DATE - INTERVAL '89 days'
        ELSE CURRENT_DATE - INTERVAL '29 days'
      END
      AND (user_filter IS NULL OR user_id = user_filter)
    GROUP BY paid_date_brazil
  )
  SELECT 
    TO_CHAR(ds.day, 'DD/MM') as period_key,
    COALESCE(st.platform_revenue, 0)::numeric as gross_revenue,
    COALESCE(st.acq_cost, 0)::numeric as acquirer_cost,
    (COALESCE(st.platform_revenue, 0) - COALESCE(st.acq_cost, 0))::numeric as net_profit
  FROM date_series ds
  LEFT JOIN daily_stats st ON ds.day = st.day
  ORDER BY ds.day;
END;
$function$;
