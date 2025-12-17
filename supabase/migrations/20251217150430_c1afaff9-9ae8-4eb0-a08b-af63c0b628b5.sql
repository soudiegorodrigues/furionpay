-- =============================================
-- DROP EXISTING FUNCTIONS
-- =============================================

DROP FUNCTION IF EXISTS get_chart_data_by_hour(DATE);
DROP FUNCTION IF EXISTS get_chart_data_by_day(INTEGER);
DROP FUNCTION IF EXISTS get_user_chart_data_by_hour(DATE);
DROP FUNCTION IF EXISTS get_user_chart_data_by_day(INTEGER);
DROP FUNCTION IF EXISTS get_global_transactions_v2(TEXT, TEXT, INTEGER, INTEGER, TEXT);
DROP FUNCTION IF EXISTS get_platform_revenue_stats();
DROP FUNCTION IF EXISTS get_platform_revenue_chart(TEXT);

-- =============================================
-- RECREATE OPTIMIZED FUNCTIONS
-- =============================================

-- Chart data by hour (admin) - usando colunas pré-calculadas
CREATE OR REPLACE FUNCTION get_chart_data_by_hour(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  hour_brazil INTEGER,
  gerados BIGINT,
  pagos BIGINT,
  valor_pago NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Sao_Paulo')::INTEGER as hour_brazil,
    COUNT(*) FILTER (WHERE TRUE) as gerados,
    COUNT(*) FILTER (WHERE status = 'paid') as pagos,
    COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as valor_pago
  FROM pix_transactions
  WHERE created_date_brazil = p_date
  GROUP BY EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Sao_Paulo')
  ORDER BY hour_brazil;
END;
$$;

-- Chart data by day (admin) - usando colunas pré-calculadas
CREATE OR REPLACE FUNCTION get_chart_data_by_day(p_days INTEGER DEFAULT 7)
RETURNS TABLE (
  date_brazil DATE,
  gerados BIGINT,
  pagos BIGINT,
  valor_pago NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date DATE;
BEGIN
  v_start_date := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::DATE - (p_days - 1);
  
  RETURN QUERY
  SELECT 
    created_date_brazil as date_brazil,
    COUNT(*) as gerados,
    COUNT(*) FILTER (WHERE status = 'paid') as pagos,
    COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as valor_pago
  FROM pix_transactions
  WHERE created_date_brazil >= v_start_date
  GROUP BY created_date_brazil
  ORDER BY created_date_brazil;
END;
$$;

-- User chart data by hour - usando colunas pré-calculadas
CREATE OR REPLACE FUNCTION get_user_chart_data_by_hour(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  hour_brazil INTEGER,
  gerados BIGINT,
  pagos BIGINT,
  valor_pago NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Sao_Paulo')::INTEGER as hour_brazil,
    COUNT(*) FILTER (WHERE TRUE) as gerados,
    COUNT(*) FILTER (WHERE status = 'paid') as pagos,
    COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as valor_pago
  FROM pix_transactions
  WHERE created_date_brazil = p_date
    AND user_id = auth.uid()
  GROUP BY EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Sao_Paulo')
  ORDER BY hour_brazil;
END;
$$;

-- User chart data by day - usando colunas pré-calculadas
CREATE OR REPLACE FUNCTION get_user_chart_data_by_day(p_days INTEGER DEFAULT 7)
RETURNS TABLE (
  date_brazil DATE,
  gerados BIGINT,
  pagos BIGINT,
  valor_pago NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date DATE;
BEGIN
  v_start_date := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::DATE - (p_days - 1);
  
  RETURN QUERY
  SELECT 
    created_date_brazil as date_brazil,
    COUNT(*) as gerados,
    COUNT(*) FILTER (WHERE status = 'paid') as pagos,
    COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) as valor_pago
  FROM pix_transactions
  WHERE created_date_brazil >= v_start_date
    AND user_id = auth.uid()
  GROUP BY created_date_brazil
  ORDER BY created_date_brazil;
END;
$$;

-- Global transactions v2 - usando colunas pré-calculadas
CREATE OR REPLACE FUNCTION get_global_transactions_v2(
  p_date_filter TEXT DEFAULT 'all',
  p_email_search TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0,
  p_status TEXT DEFAULT 'all'
)
RETURNS TABLE (
  id UUID,
  txid TEXT,
  amount NUMERIC,
  status pix_status,
  donor_name TEXT,
  product_name TEXT,
  created_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  user_email TEXT,
  utm_data JSONB,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE;
  v_start_date DATE;
  v_total BIGINT;
BEGIN
  v_today := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::DATE;
  
  -- Calculate start date based on filter
  v_start_date := CASE p_date_filter
    WHEN 'today' THEN v_today
    WHEN '7days' THEN v_today - INTERVAL '6 days'
    WHEN '30days' THEN v_today - INTERVAL '29 days'
    ELSE NULL
  END;
  
  -- Get total count first
  SELECT COUNT(*) INTO v_total
  FROM pix_transactions pt
  LEFT JOIN auth.users u ON pt.user_id = u.id
  WHERE (v_start_date IS NULL OR pt.created_date_brazil >= v_start_date)
    AND (p_status = 'all' OR pt.status::TEXT = p_status)
    AND (p_email_search IS NULL OR p_email_search = '' OR u.email ILIKE '%' || p_email_search || '%');
  
  RETURN QUERY
  SELECT 
    pt.id,
    pt.txid,
    pt.amount,
    pt.status,
    pt.donor_name,
    pt.product_name,
    pt.created_at,
    pt.paid_at,
    u.email as user_email,
    pt.utm_data::JSONB,
    v_total as total_count
  FROM pix_transactions pt
  LEFT JOIN auth.users u ON pt.user_id = u.id
  WHERE (v_start_date IS NULL OR pt.created_date_brazil >= v_start_date)
    AND (p_status = 'all' OR pt.status::TEXT = p_status)
    AND (p_email_search IS NULL OR p_email_search = '' OR u.email ILIKE '%' || p_email_search || '%')
  ORDER BY pt.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Platform revenue stats - usando colunas pré-calculadas
CREATE OR REPLACE FUNCTION get_platform_revenue_stats()
RETURNS TABLE (
  period TEXT,
  total_transactions BIGINT,
  total_revenue NUMERIC,
  total_cost NUMERIC,
  net_profit NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE;
BEGIN
  v_today := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::DATE;
  
  RETURN QUERY
  WITH periods AS (
    SELECT 'today' as period_name, v_today as start_date
    UNION ALL SELECT '7days', v_today - INTERVAL '6 days'
    UNION ALL SELECT '15days', v_today - INTERVAL '14 days'
    UNION ALL SELECT 'month', DATE_TRUNC('month', v_today)::DATE
    UNION ALL SELECT 'year', DATE_TRUNC('year', v_today)::DATE
  ),
  stats AS (
    SELECT 
      p.period_name,
      COUNT(*) as txn_count,
      COALESCE(SUM(pt.amount * COALESCE(pt.fee_percentage, 0) / 100 + COALESCE(pt.fee_fixed, 0)), 0) as revenue,
      0::NUMERIC as cost
    FROM periods p
    LEFT JOIN pix_transactions pt ON pt.paid_date_brazil >= p.start_date AND pt.status = 'paid'
    GROUP BY p.period_name
  )
  SELECT 
    s.period_name as period,
    s.txn_count as total_transactions,
    s.revenue as total_revenue,
    s.cost as total_cost,
    s.revenue - s.cost as net_profit
  FROM stats s;
END;
$$;

-- Platform revenue chart - usando colunas pré-calculadas
CREATE OR REPLACE FUNCTION get_platform_revenue_chart(p_period TEXT DEFAULT '7days')
RETURNS TABLE (
  date_label TEXT,
  revenue NUMERIC,
  cost NUMERIC,
  profit NUMERIC,
  transaction_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE;
  v_start_date DATE;
BEGIN
  v_today := (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::DATE;
  
  v_start_date := CASE p_period
    WHEN 'today' THEN v_today
    WHEN '7days' THEN v_today - INTERVAL '6 days'
    WHEN '15days' THEN v_today - INTERVAL '14 days'
    WHEN '30days' THEN v_today - INTERVAL '29 days'
    ELSE v_today - INTERVAL '6 days'
  END;
  
  RETURN QUERY
  SELECT 
    TO_CHAR(pt.paid_date_brazil, 'DD/MM') as date_label,
    COALESCE(SUM(pt.amount * COALESCE(pt.fee_percentage, 0) / 100 + COALESCE(pt.fee_fixed, 0)), 0) as revenue,
    0::NUMERIC as cost,
    COALESCE(SUM(pt.amount * COALESCE(pt.fee_percentage, 0) / 100 + COALESCE(pt.fee_fixed, 0)), 0) as profit,
    COUNT(*) as transaction_count
  FROM pix_transactions pt
  WHERE pt.paid_date_brazil >= v_start_date
    AND pt.status = 'paid'
  GROUP BY pt.paid_date_brazil
  ORDER BY pt.paid_date_brazil;
END;
$$;