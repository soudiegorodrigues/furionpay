-- RPC 1: Estatísticas de receita da plataforma agregadas por período
CREATE OR REPLACE FUNCTION public.get_platform_revenue_stats(p_user_email TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSON;
  v_brazil_today DATE;
  v_seven_days_ago TIMESTAMPTZ;
  v_fifteen_days_ago TIMESTAMPTZ;
  v_thirty_days_ago TIMESTAMPTZ;
  v_this_month_start TIMESTAMPTZ;
  v_last_month_start TIMESTAMPTZ;
  v_last_month_end TIMESTAMPTZ;
  v_this_year_start TIMESTAMPTZ;
  v_acquirer_fees JSON;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can view platform revenue';
  END IF;

  -- Datas de referência (timezone Brasil)
  v_brazil_today := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;
  v_seven_days_ago := NOW() - INTERVAL '7 days';
  v_fifteen_days_ago := NOW() - INTERVAL '15 days';
  v_thirty_days_ago := NOW() - INTERVAL '30 days';
  v_this_month_start := DATE_TRUNC('month', NOW() AT TIME ZONE 'America/Sao_Paulo')::TIMESTAMPTZ;
  v_last_month_start := DATE_TRUNC('month', (NOW() AT TIME ZONE 'America/Sao_Paulo') - INTERVAL '1 month')::TIMESTAMPTZ;
  v_last_month_end := (DATE_TRUNC('month', NOW() AT TIME ZONE 'America/Sao_Paulo') - INTERVAL '1 day')::TIMESTAMPTZ + INTERVAL '23 hours 59 minutes 59 seconds';
  v_this_year_start := DATE_TRUNC('year', NOW() AT TIME ZONE 'America/Sao_Paulo')::TIMESTAMPTZ;

  -- Buscar taxas de adquirentes
  SELECT json_object_agg(key, value) INTO v_acquirer_fees
  FROM admin_settings
  WHERE key IN ('spedpay_fee_rate', 'spedpay_fixed_fee', 'inter_fee_rate', 'inter_fixed_fee', 'ativus_fee_rate', 'ativus_fixed_fee')
    AND user_id IS NULL;

  -- Calcular estatísticas agregadas
  WITH paid_tx AS (
    SELECT 
      pt.amount,
      pt.fee_percentage,
      pt.fee_fixed,
      pt.acquirer,
      pt.paid_at,
      pt.created_at,
      pt.user_email,
      -- Lucro bruto (taxa cobrada do usuário)
      (pt.amount * COALESCE(pt.fee_percentage, 0) / 100) + COALESCE(pt.fee_fixed, 0) AS gross_profit,
      -- Custo do adquirente
      CASE pt.acquirer
        WHEN 'spedpay' THEN (pt.amount * COALESCE((v_acquirer_fees->>'spedpay_fee_rate')::NUMERIC, 0) / 100) + COALESCE((v_acquirer_fees->>'spedpay_fixed_fee')::NUMERIC, 0)
        WHEN 'inter' THEN (pt.amount * COALESCE((v_acquirer_fees->>'inter_fee_rate')::NUMERIC, 0) / 100) + COALESCE((v_acquirer_fees->>'inter_fixed_fee')::NUMERIC, 0)
        WHEN 'ativus' THEN (pt.amount * COALESCE((v_acquirer_fees->>'ativus_fee_rate')::NUMERIC, 0) / 100) + COALESCE((v_acquirer_fees->>'ativus_fixed_fee')::NUMERIC, 0)
        ELSE (pt.amount * COALESCE((v_acquirer_fees->>'spedpay_fee_rate')::NUMERIC, 0) / 100) + COALESCE((v_acquirer_fees->>'spedpay_fixed_fee')::NUMERIC, 0)
      END AS acquirer_cost
    FROM pix_transactions pt
    WHERE pt.status = 'paid'
      AND (p_user_email IS NULL OR pt.user_email = p_user_email)
  ),
  stats AS (
    SELECT
      -- Hoje
      SUM(CASE WHEN (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE = v_brazil_today THEN gross_profit ELSE 0 END) AS today_gross,
      SUM(CASE WHEN (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE = v_brazil_today THEN acquirer_cost ELSE 0 END) AS today_cost,
      COUNT(*) FILTER (WHERE (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE = v_brazil_today) AS today_count,
      -- 7 dias
      SUM(CASE WHEN paid_at >= v_seven_days_ago THEN gross_profit ELSE 0 END) AS seven_days_gross,
      SUM(CASE WHEN paid_at >= v_seven_days_ago THEN acquirer_cost ELSE 0 END) AS seven_days_cost,
      COUNT(*) FILTER (WHERE paid_at >= v_seven_days_ago) AS seven_days_count,
      -- 15 dias
      SUM(CASE WHEN paid_at >= v_fifteen_days_ago THEN gross_profit ELSE 0 END) AS fifteen_days_gross,
      SUM(CASE WHEN paid_at >= v_fifteen_days_ago THEN acquirer_cost ELSE 0 END) AS fifteen_days_cost,
      -- 30 dias
      SUM(CASE WHEN paid_at >= v_thirty_days_ago THEN gross_profit ELSE 0 END) AS thirty_days_gross,
      SUM(CASE WHEN paid_at >= v_thirty_days_ago THEN acquirer_cost ELSE 0 END) AS thirty_days_cost,
      -- Este mês
      SUM(CASE WHEN paid_at >= v_this_month_start THEN gross_profit ELSE 0 END) AS this_month_gross,
      SUM(CASE WHEN paid_at >= v_this_month_start THEN acquirer_cost ELSE 0 END) AS this_month_cost,
      COUNT(*) FILTER (WHERE paid_at >= v_this_month_start) AS this_month_count,
      -- Mês anterior
      SUM(CASE WHEN paid_at >= v_last_month_start AND paid_at <= v_last_month_end THEN gross_profit ELSE 0 END) AS last_month_gross,
      SUM(CASE WHEN paid_at >= v_last_month_start AND paid_at <= v_last_month_end THEN acquirer_cost ELSE 0 END) AS last_month_cost,
      -- Este ano
      SUM(CASE WHEN paid_at >= v_this_year_start THEN gross_profit ELSE 0 END) AS this_year_gross,
      SUM(CASE WHEN paid_at >= v_this_year_start THEN acquirer_cost ELSE 0 END) AS this_year_cost,
      -- Total
      SUM(gross_profit) AS total_gross,
      SUM(acquirer_cost) AS total_cost,
      COUNT(*) AS total_count
    FROM paid_tx
  ),
  acquirer_breakdown AS (
    SELECT
      acquirer,
      -- Hoje
      COUNT(*) FILTER (WHERE (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE = v_brazil_today) AS today_count,
      SUM(CASE WHEN (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE = v_brazil_today THEN acquirer_cost ELSE 0 END) AS today_cost,
      SUM(CASE WHEN (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE = v_brazil_today THEN amount ELSE 0 END) AS today_volume,
      -- 7 dias
      COUNT(*) FILTER (WHERE paid_at >= v_seven_days_ago) AS seven_days_count,
      SUM(CASE WHEN paid_at >= v_seven_days_ago THEN acquirer_cost ELSE 0 END) AS seven_days_cost,
      SUM(CASE WHEN paid_at >= v_seven_days_ago THEN amount ELSE 0 END) AS seven_days_volume,
      -- Este mês
      COUNT(*) FILTER (WHERE paid_at >= v_this_month_start) AS this_month_count,
      SUM(CASE WHEN paid_at >= v_this_month_start THEN acquirer_cost ELSE 0 END) AS this_month_cost,
      SUM(CASE WHEN paid_at >= v_this_month_start THEN amount ELSE 0 END) AS this_month_volume,
      -- Total
      COUNT(*) AS total_count,
      SUM(acquirer_cost) AS total_cost,
      SUM(amount) AS total_volume
    FROM paid_tx
    GROUP BY acquirer
  ),
  daily_profits AS (
    SELECT 
      (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE AS profit_date,
      SUM(gross_profit - acquirer_cost) AS daily_profit
    FROM paid_tx
    WHERE paid_at >= v_seven_days_ago
    GROUP BY (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE
  )
  SELECT json_build_object(
    'today', COALESCE(s.today_gross - s.today_cost, 0),
    'sevenDays', COALESCE(s.seven_days_gross - s.seven_days_cost, 0),
    'fifteenDays', COALESCE(s.fifteen_days_gross - s.fifteen_days_cost, 0),
    'thirtyDays', COALESCE(s.thirty_days_gross - s.thirty_days_cost, 0),
    'thisMonth', COALESCE(s.this_month_gross - s.this_month_cost, 0),
    'lastMonth', COALESCE(s.last_month_gross - s.last_month_cost, 0),
    'thisYear', COALESCE(s.this_year_gross - s.this_year_cost, 0),
    'total', COALESCE(s.total_gross - s.total_cost, 0),
    'gross', json_build_object(
      'today', COALESCE(s.today_gross, 0),
      'sevenDays', COALESCE(s.seven_days_gross, 0),
      'fifteenDays', COALESCE(s.fifteen_days_gross, 0),
      'thirtyDays', COALESCE(s.thirty_days_gross, 0),
      'thisMonth', COALESCE(s.this_month_gross, 0),
      'lastMonth', COALESCE(s.last_month_gross, 0),
      'thisYear', COALESCE(s.this_year_gross, 0),
      'total', COALESCE(s.total_gross, 0)
    ),
    'acquirerCosts', json_build_object(
      'today', COALESCE(s.today_cost, 0),
      'sevenDays', COALESCE(s.seven_days_cost, 0),
      'fifteenDays', COALESCE(s.fifteen_days_cost, 0),
      'thirtyDays', COALESCE(s.thirty_days_cost, 0),
      'thisMonth', COALESCE(s.this_month_cost, 0),
      'lastMonth', COALESCE(s.last_month_cost, 0),
      'thisYear', COALESCE(s.this_year_cost, 0),
      'total', COALESCE(s.total_cost, 0)
    ),
    'acquirerBreakdown', (
      SELECT json_object_agg(
        COALESCE(acquirer, 'spedpay'),
        json_build_object(
          'today', json_build_object('count', today_count, 'cost', today_cost, 'volume', today_volume),
          'sevenDays', json_build_object('count', seven_days_count, 'cost', seven_days_cost, 'volume', seven_days_volume),
          'thisMonth', json_build_object('count', this_month_count, 'cost', this_month_cost, 'volume', this_month_volume),
          'total', json_build_object('count', total_count, 'cost', total_cost, 'volume', total_volume)
        )
      )
      FROM acquirer_breakdown
    ),
    'transactionCount', COALESCE(s.total_count, 0),
    'averageProfit', CASE WHEN s.total_count > 0 THEN (s.total_gross - s.total_cost) / s.total_count ELSE 0 END,
    'averageDailyProfit', COALESCE((SELECT SUM(daily_profit) / 7 FROM daily_profits), 0),
    'monthlyProjection', COALESCE((SELECT SUM(daily_profit) / 7 * 30 FROM daily_profits), 0),
    'daysWithData', (SELECT COUNT(*) FROM daily_profits),
    'monthOverMonthChange', CASE 
      WHEN COALESCE(s.last_month_gross - s.last_month_cost, 0) > 0 
      THEN ((COALESCE(s.this_month_gross - s.this_month_cost, 0) - COALESCE(s.last_month_gross - s.last_month_cost, 0)) / COALESCE(s.last_month_gross - s.last_month_cost, 1)) * 100
      WHEN COALESCE(s.this_month_gross - s.this_month_cost, 0) > 0 THEN 100
      ELSE 0
    END
  ) INTO v_result
  FROM stats s;

  RETURN v_result;
END;
$$;

-- RPC 2: Dados do gráfico de receita agregados
CREATE OR REPLACE FUNCTION public.get_platform_revenue_chart(p_filter TEXT DEFAULT 'today', p_user_email TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSON;
  v_brazil_today DATE;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can view platform revenue';
  END IF;

  v_brazil_today := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;

  IF p_filter = 'today' THEN
    -- Gráfico por hora para hoje
    WITH hours AS (
      SELECT generate_series(0, 23) AS hour
    ),
    hourly_data AS (
      SELECT 
        EXTRACT(HOUR FROM (paid_at AT TIME ZONE 'America/Sao_Paulo')) AS hour,
        SUM((amount * COALESCE(fee_percentage, 0) / 100) + COALESCE(fee_fixed, 0)) AS lucro
      FROM pix_transactions
      WHERE status = 'paid'
        AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE = v_brazil_today
        AND (p_user_email IS NULL OR user_email = p_user_email)
      GROUP BY EXTRACT(HOUR FROM (paid_at AT TIME ZONE 'America/Sao_Paulo'))
    )
    SELECT json_agg(
      json_build_object(
        'date', LPAD(h.hour::TEXT, 2, '0') || ':00',
        'lucro', COALESCE(hd.lucro, 0)
      ) ORDER BY h.hour
    ) INTO v_result
    FROM hours h
    LEFT JOIN hourly_data hd ON h.hour = hd.hour;
  ELSE
    -- Gráfico por dia para outros filtros
    WITH days AS (
      SELECT generate_series(
        CASE p_filter
          WHEN '7days' THEN v_brazil_today - 6
          WHEN '14days' THEN v_brazil_today - 13
          WHEN '30days' THEN v_brazil_today - 29
          ELSE v_brazil_today - 6
        END,
        v_brazil_today,
        '1 day'::INTERVAL
      )::DATE AS day
    ),
    daily_data AS (
      SELECT 
        (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE AS day,
        SUM((amount * COALESCE(fee_percentage, 0) / 100) + COALESCE(fee_fixed, 0)) AS lucro
      FROM pix_transactions
      WHERE status = 'paid'
        AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE >= CASE p_filter
          WHEN '7days' THEN v_brazil_today - 6
          WHEN '14days' THEN v_brazil_today - 13
          WHEN '30days' THEN v_brazil_today - 29
          ELSE v_brazil_today - 6
        END
        AND (p_user_email IS NULL OR user_email = p_user_email)
      GROUP BY (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE
    )
    SELECT json_agg(
      json_build_object(
        'date', TO_CHAR(d.day, 'DD/MM'),
        'lucro', COALESCE(dd.lucro, 0)
      ) ORDER BY d.day
    ) INTO v_result
    FROM days d
    LEFT JOIN daily_data dd ON d.day = dd.day;
  END IF;

  RETURN COALESCE(v_result, '[]'::JSON);
END;
$$;

-- RPC 3: Ranking de usuários por lucro
CREATE OR REPLACE FUNCTION public.get_platform_user_profit_ranking(p_filter TEXT DEFAULT 'all', p_limit INT DEFAULT 10)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSON;
  v_brazil_today DATE;
  v_start_date TIMESTAMPTZ;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can view platform revenue';
  END IF;

  v_brazil_today := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;
  
  -- Calcular data de início baseada no filtro
  v_start_date := CASE p_filter
    WHEN 'today' THEN v_brazil_today::TIMESTAMPTZ
    WHEN '7days' THEN NOW() - INTERVAL '7 days'
    WHEN '30days' THEN NOW() - INTERVAL '30 days'
    WHEN 'thisMonth' THEN DATE_TRUNC('month', NOW() AT TIME ZONE 'America/Sao_Paulo')::TIMESTAMPTZ
    ELSE '1900-01-01'::TIMESTAMPTZ
  END;

  SELECT json_agg(ranking ORDER BY total_profit DESC) INTO v_result
  FROM (
    SELECT 
      COALESCE(user_email, 'Sem usuário') AS email,
      SUM((amount * COALESCE(fee_percentage, 0) / 100) + COALESCE(fee_fixed, 0)) AS total_profit,
      COUNT(*) AS transaction_count,
      CASE WHEN COUNT(*) > 0 
        THEN SUM((amount * COALESCE(fee_percentage, 0) / 100) + COALESCE(fee_fixed, 0)) / COUNT(*)
        ELSE 0 
      END AS average_profit
    FROM pix_transactions
    WHERE status = 'paid'
      AND (p_filter = 'all' OR paid_at >= v_start_date)
    GROUP BY user_email
    ORDER BY total_profit DESC
    LIMIT p_limit
  ) ranking;

  RETURN COALESCE(v_result, '[]'::JSON);
END;
$$;

-- RPC 4: Lista de usuários únicos (para dropdown)
CREATE OR REPLACE FUNCTION public.get_platform_unique_users()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSON;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can view platform users';
  END IF;

  SELECT json_agg(DISTINCT user_email ORDER BY user_email) INTO v_result
  FROM pix_transactions
  WHERE user_email IS NOT NULL
    AND status = 'paid';

  RETURN COALESCE(v_result, '[]'::JSON);
END;
$$;