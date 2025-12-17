
-- Drop existing function first
DROP FUNCTION IF EXISTS public.get_platform_revenue_chart(TEXT, TEXT);

-- Recreate with timezone conversion instead of non-existent column
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
  
  RETURN QUERY
  SELECT 
    TO_CHAR((pt.paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE, 'DD/MM') as period_key,
    COALESCE(SUM((pt.amount * COALESCE(pt.fee_percentage, 0) / 100) + COALESCE(pt.fee_fixed, 0)), 0) as gross_revenue,
    0::NUMERIC as acquirer_cost,
    COALESCE(SUM((pt.amount * COALESCE(pt.fee_percentage, 0) / 100) + COALESCE(pt.fee_fixed, 0)), 0) as net_profit
  FROM pix_transactions pt
  LEFT JOIN auth.users u ON u.id = pt.user_id
  WHERE pt.status = 'paid'
    AND (pt.paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE >= start_date
    AND (pt.paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE <= brazil_today
    AND (p_user_email IS NULL OR u.email = p_user_email)
  GROUP BY (pt.paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE
  ORDER BY (pt.paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE ASC;
END;
$$;
