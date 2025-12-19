-- =====================================================
-- FASE 1: LIMPEZA - Remover funções obsoletas/duplicadas
-- =====================================================

-- Remover todas as versões de get_users_revenue_ranking (não são usadas)
DROP FUNCTION IF EXISTS public.get_users_revenue_ranking();
DROP FUNCTION IF EXISTS public.get_users_revenue_ranking(text);
DROP FUNCTION IF EXISTS public.get_users_revenue_ranking(p_filter text);

-- Remover versão quebrada de get_platform_revenue_stats (sem parâmetro)
DROP FUNCTION IF EXISTS public.get_platform_revenue_stats();

-- Remover versões conflitantes de get_platform_revenue_chart
DROP FUNCTION IF EXISTS public.get_platform_revenue_chart(text);
DROP FUNCTION IF EXISTS public.get_platform_revenue_chart(p_filter text);
DROP FUNCTION IF EXISTS public.get_platform_revenue_chart(p_filter text, p_user_email text);

-- =====================================================
-- FASE 2: RECRIAR FUNÇÕES CORRETAS
-- =====================================================

-- Função: get_platform_revenue_stats
-- Retorna estatísticas de receita da plataforma com custos calculados via admin_settings
CREATE OR REPLACE FUNCTION public.get_platform_revenue_stats(p_user_email text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSON;
  v_brazil_now TIMESTAMPTZ;
  v_today_start TIMESTAMPTZ;
  v_week_start TIMESTAMPTZ;
  v_fortnight_start TIMESTAMPTZ;
  v_month_start TIMESTAMPTZ;
  v_last_month_start TIMESTAMPTZ;
  v_last_month_end TIMESTAMPTZ;
  v_year_start TIMESTAMPTZ;
  v_user_id UUID;
  -- Taxas dos adquirentes
  v_spedpay_rate NUMERIC;
  v_spedpay_fixed NUMERIC;
  v_inter_rate NUMERIC;
  v_inter_fixed NUMERIC;
  v_ativus_rate NUMERIC;
  v_ativus_fixed NUMERIC;
  v_valorion_rate NUMERIC;
  v_valorion_fixed NUMERIC;
BEGIN
  -- Calcular timestamps Brazil
  v_brazil_now := NOW() AT TIME ZONE 'America/Sao_Paulo';
  v_today_start := DATE_TRUNC('day', v_brazil_now)::TIMESTAMPTZ;
  v_week_start := v_today_start - INTERVAL '6 days';
  v_fortnight_start := v_today_start - INTERVAL '14 days';
  v_month_start := DATE_TRUNC('month', v_brazil_now)::TIMESTAMPTZ;
  v_last_month_start := DATE_TRUNC('month', v_brazil_now - INTERVAL '1 month')::TIMESTAMPTZ;
  v_last_month_end := v_month_start;
  v_year_start := DATE_TRUNC('year', v_brazil_now)::TIMESTAMPTZ;

  -- Buscar user_id se email fornecido
  IF p_user_email IS NOT NULL AND p_user_email != '' THEN
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_user_email LIMIT 1;
  END IF;

  -- Buscar taxas dos adquirentes de admin_settings
  SELECT 
    COALESCE(MAX(CASE WHEN key = 'spedpay_fee_rate' THEN value::NUMERIC END), 4.99),
    COALESCE(MAX(CASE WHEN key = 'spedpay_fixed_fee' THEN value::NUMERIC END), 1.49),
    COALESCE(MAX(CASE WHEN key = 'inter_fee_rate' THEN value::NUMERIC END), 0.00),
    COALESCE(MAX(CASE WHEN key = 'inter_fixed_fee' THEN value::NUMERIC END), 0.00),
    COALESCE(MAX(CASE WHEN key = 'ativus_fee_rate' THEN value::NUMERIC END), 2.99),
    COALESCE(MAX(CASE WHEN key = 'ativus_fixed_fee' THEN value::NUMERIC END), 0.00),
    COALESCE(MAX(CASE WHEN key = 'valorion_fee_rate' THEN value::NUMERIC END), 0.00),
    COALESCE(MAX(CASE WHEN key = 'valorion_fixed_fee' THEN value::NUMERIC END), 0.80)
  INTO v_spedpay_rate, v_spedpay_fixed, v_inter_rate, v_inter_fixed, 
       v_ativus_rate, v_ativus_fixed, v_valorion_rate, v_valorion_fixed
  FROM admin_settings
  WHERE user_id IS NULL;

  -- Construir resultado
  WITH paid_txns AS (
    SELECT 
      id,
      amount::NUMERIC as amount,
      COALESCE(fee_percentage, 0)::NUMERIC as fee_pct,
      COALESCE(fee_fixed, 0)::NUMERIC as fee_fix,
      COALESCE(acquirer, 'spedpay') as acquirer,
      paid_at
    FROM pix_transactions
    WHERE status = 'paid'
      AND paid_at IS NOT NULL
      AND (v_user_id IS NULL OR user_id = v_user_id)
  ),
  calcs AS (
    SELECT
      id,
      amount,
      paid_at,
      acquirer,
      -- Receita da plataforma (taxa cobrada do usuário)
      ((fee_pct / 100) * amount) + fee_fix as platform_revenue,
      -- Custo do adquirente
      CASE acquirer
        WHEN 'inter' THEN ((v_inter_rate / 100) * amount) + v_inter_fixed
        WHEN 'ativus' THEN ((v_ativus_rate / 100) * amount) + v_ativus_fixed
        WHEN 'valorion' THEN ((v_valorion_rate / 100) * amount) + v_valorion_fixed
        ELSE ((v_spedpay_rate / 100) * amount) + v_spedpay_fixed
      END as acquirer_cost
    FROM paid_txns
  ),
  -- Estatísticas por período
  period_stats AS (
    SELECT
      -- Hoje
      COALESCE(SUM(platform_revenue) FILTER (WHERE paid_at >= v_today_start), 0) as today_gross,
      COALESCE(SUM(acquirer_cost) FILTER (WHERE paid_at >= v_today_start), 0) as today_cost,
      COUNT(*) FILTER (WHERE paid_at >= v_today_start) as today_count,
      -- 7 dias
      COALESCE(SUM(platform_revenue) FILTER (WHERE paid_at >= v_week_start), 0) as week_gross,
      COALESCE(SUM(acquirer_cost) FILTER (WHERE paid_at >= v_week_start), 0) as week_cost,
      COUNT(*) FILTER (WHERE paid_at >= v_week_start) as week_count,
      -- 15 dias
      COALESCE(SUM(platform_revenue) FILTER (WHERE paid_at >= v_fortnight_start), 0) as fortnight_gross,
      COALESCE(SUM(acquirer_cost) FILTER (WHERE paid_at >= v_fortnight_start), 0) as fortnight_cost,
      COUNT(*) FILTER (WHERE paid_at >= v_fortnight_start) as fortnight_count,
      -- Este mês
      COALESCE(SUM(platform_revenue) FILTER (WHERE paid_at >= v_month_start), 0) as month_gross,
      COALESCE(SUM(acquirer_cost) FILTER (WHERE paid_at >= v_month_start), 0) as month_cost,
      COUNT(*) FILTER (WHERE paid_at >= v_month_start) as month_count,
      -- Mês passado
      COALESCE(SUM(platform_revenue) FILTER (WHERE paid_at >= v_last_month_start AND paid_at < v_last_month_end), 0) as last_month_gross,
      COALESCE(SUM(acquirer_cost) FILTER (WHERE paid_at >= v_last_month_start AND paid_at < v_last_month_end), 0) as last_month_cost,
      COUNT(*) FILTER (WHERE paid_at >= v_last_month_start AND paid_at < v_last_month_end) as last_month_count,
      -- Este ano
      COALESCE(SUM(platform_revenue) FILTER (WHERE paid_at >= v_year_start), 0) as year_gross,
      COALESCE(SUM(acquirer_cost) FILTER (WHERE paid_at >= v_year_start), 0) as year_cost,
      COUNT(*) FILTER (WHERE paid_at >= v_year_start) as year_count,
      -- Total geral
      COALESCE(SUM(platform_revenue), 0) as total_gross,
      COALESCE(SUM(acquirer_cost), 0) as total_cost,
      COUNT(*) as total_count
    FROM calcs
  ),
  -- Breakdown por adquirente (para card de detalhamento)
  acquirer_breakdown AS (
    SELECT
      acquirer,
      -- Hoje
      COALESCE(SUM(acquirer_cost) FILTER (WHERE paid_at >= v_today_start), 0) as today,
      -- 7 dias
      COALESCE(SUM(acquirer_cost) FILTER (WHERE paid_at >= v_week_start), 0) as seven_days,
      -- Este mês
      COALESCE(SUM(acquirer_cost) FILTER (WHERE paid_at >= v_month_start), 0) as this_month,
      -- Total
      COALESCE(SUM(acquirer_cost), 0) as total
    FROM calcs
    GROUP BY acquirer
  )
  SELECT json_build_object(
    'today', json_build_object(
      'gross_revenue', ROUND((SELECT today_gross FROM period_stats), 2),
      'acquirer_cost', ROUND((SELECT today_cost FROM period_stats), 2),
      'net_profit', ROUND((SELECT today_gross - today_cost FROM period_stats), 2),
      'transaction_count', (SELECT today_count FROM period_stats)
    ),
    'week', json_build_object(
      'gross_revenue', ROUND((SELECT week_gross FROM period_stats), 2),
      'acquirer_cost', ROUND((SELECT week_cost FROM period_stats), 2),
      'net_profit', ROUND((SELECT week_gross - week_cost FROM period_stats), 2),
      'transaction_count', (SELECT week_count FROM period_stats)
    ),
    'fortnight', json_build_object(
      'gross_revenue', ROUND((SELECT fortnight_gross FROM period_stats), 2),
      'acquirer_cost', ROUND((SELECT fortnight_cost FROM period_stats), 2),
      'net_profit', ROUND((SELECT fortnight_gross - fortnight_cost FROM period_stats), 2),
      'transaction_count', (SELECT fortnight_count FROM period_stats)
    ),
    'month', json_build_object(
      'gross_revenue', ROUND((SELECT month_gross FROM period_stats), 2),
      'acquirer_cost', ROUND((SELECT month_cost FROM period_stats), 2),
      'net_profit', ROUND((SELECT month_gross - month_cost FROM period_stats), 2),
      'transaction_count', (SELECT month_count FROM period_stats)
    ),
    'last_month', json_build_object(
      'gross_revenue', ROUND((SELECT last_month_gross FROM period_stats), 2),
      'acquirer_cost', ROUND((SELECT last_month_cost FROM period_stats), 2),
      'net_profit', ROUND((SELECT last_month_gross - last_month_cost FROM period_stats), 2),
      'transaction_count', (SELECT last_month_count FROM period_stats)
    ),
    'year', json_build_object(
      'gross_revenue', ROUND((SELECT year_gross FROM period_stats), 2),
      'acquirer_cost', ROUND((SELECT year_cost FROM period_stats), 2),
      'net_profit', ROUND((SELECT year_gross - year_cost FROM period_stats), 2),
      'transaction_count', (SELECT year_count FROM period_stats)
    ),
    'all_time', json_build_object(
      'gross_revenue', ROUND((SELECT total_gross FROM period_stats), 2),
      'acquirer_cost', ROUND((SELECT total_cost FROM period_stats), 2),
      'net_profit', ROUND((SELECT total_gross - total_cost FROM period_stats), 2),
      'transaction_count', (SELECT total_count FROM period_stats)
    ),
    'acquirer_breakdown', (
      SELECT json_object_agg(
        acquirer,
        json_build_object(
          'today', ROUND(today, 2),
          'sevenDays', ROUND(seven_days, 2),
          'thisMonth', ROUND(this_month, 2),
          'total', ROUND(total, 2)
        )
      )
      FROM acquirer_breakdown
    ),
    'acquirer_rates', json_build_object(
      'spedpay', json_build_object('rate', v_spedpay_rate, 'fixed', v_spedpay_fixed),
      'inter', json_build_object('rate', v_inter_rate, 'fixed', v_inter_fixed),
      'ativus', json_build_object('rate', v_ativus_rate, 'fixed', v_ativus_fixed),
      'valorion', json_build_object('rate', v_valorion_rate, 'fixed', v_valorion_fixed)
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Função: get_platform_revenue_chart
-- Retorna dados para gráfico de evolução de receita
CREATE OR REPLACE FUNCTION public.get_platform_revenue_chart(p_filter text DEFAULT '30days', p_user_email text DEFAULT NULL)
RETURNS TABLE(date text, gross_revenue numeric, acquirer_cost numeric, net_profit numeric, transaction_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_start_date TIMESTAMPTZ;
  v_user_id UUID;
  v_spedpay_rate NUMERIC;
  v_spedpay_fixed NUMERIC;
  v_inter_rate NUMERIC;
  v_inter_fixed NUMERIC;
  v_ativus_rate NUMERIC;
  v_ativus_fixed NUMERIC;
  v_valorion_rate NUMERIC;
  v_valorion_fixed NUMERIC;
BEGIN
  -- Calcular data inicial baseado no filtro
  CASE p_filter
    WHEN 'today' THEN
      v_start_date := DATE_TRUNC('day', NOW() AT TIME ZONE 'America/Sao_Paulo')::TIMESTAMPTZ;
    WHEN '7days' THEN
      v_start_date := DATE_TRUNC('day', NOW() AT TIME ZONE 'America/Sao_Paulo')::TIMESTAMPTZ - INTERVAL '6 days';
    WHEN '14days' THEN
      v_start_date := DATE_TRUNC('day', NOW() AT TIME ZONE 'America/Sao_Paulo')::TIMESTAMPTZ - INTERVAL '13 days';
    WHEN '30days' THEN
      v_start_date := DATE_TRUNC('day', NOW() AT TIME ZONE 'America/Sao_Paulo')::TIMESTAMPTZ - INTERVAL '29 days';
    WHEN 'month' THEN
      v_start_date := DATE_TRUNC('month', NOW() AT TIME ZONE 'America/Sao_Paulo')::TIMESTAMPTZ;
    WHEN 'year' THEN
      v_start_date := DATE_TRUNC('year', NOW() AT TIME ZONE 'America/Sao_Paulo')::TIMESTAMPTZ;
    ELSE
      v_start_date := DATE_TRUNC('day', NOW() AT TIME ZONE 'America/Sao_Paulo')::TIMESTAMPTZ - INTERVAL '29 days';
  END CASE;

  -- Buscar user_id se email fornecido
  IF p_user_email IS NOT NULL AND p_user_email != '' THEN
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_user_email LIMIT 1;
  END IF;

  -- Buscar taxas dos adquirentes
  SELECT 
    COALESCE(MAX(CASE WHEN key = 'spedpay_fee_rate' THEN value::NUMERIC END), 4.99),
    COALESCE(MAX(CASE WHEN key = 'spedpay_fixed_fee' THEN value::NUMERIC END), 1.49),
    COALESCE(MAX(CASE WHEN key = 'inter_fee_rate' THEN value::NUMERIC END), 0.00),
    COALESCE(MAX(CASE WHEN key = 'inter_fixed_fee' THEN value::NUMERIC END), 0.00),
    COALESCE(MAX(CASE WHEN key = 'ativus_fee_rate' THEN value::NUMERIC END), 2.99),
    COALESCE(MAX(CASE WHEN key = 'ativus_fixed_fee' THEN value::NUMERIC END), 0.00),
    COALESCE(MAX(CASE WHEN key = 'valorion_fee_rate' THEN value::NUMERIC END), 0.00),
    COALESCE(MAX(CASE WHEN key = 'valorion_fixed_fee' THEN value::NUMERIC END), 0.80)
  INTO v_spedpay_rate, v_spedpay_fixed, v_inter_rate, v_inter_fixed, 
       v_ativus_rate, v_ativus_fixed, v_valorion_rate, v_valorion_fixed
  FROM admin_settings
  WHERE user_id IS NULL;

  RETURN QUERY
  WITH daily_data AS (
    SELECT
      TO_CHAR((paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE, 'YYYY-MM-DD') as day_date,
      SUM(((COALESCE(fee_percentage, 0)::NUMERIC / 100) * amount::NUMERIC) + COALESCE(fee_fixed, 0)::NUMERIC) as day_gross,
      SUM(
        CASE COALESCE(acquirer, 'spedpay')
          WHEN 'inter' THEN ((v_inter_rate / 100) * amount::NUMERIC) + v_inter_fixed
          WHEN 'ativus' THEN ((v_ativus_rate / 100) * amount::NUMERIC) + v_ativus_fixed
          WHEN 'valorion' THEN ((v_valorion_rate / 100) * amount::NUMERIC) + v_valorion_fixed
          ELSE ((v_spedpay_rate / 100) * amount::NUMERIC) + v_spedpay_fixed
        END
      ) as day_cost,
      COUNT(*) as day_count
    FROM pix_transactions
    WHERE status = 'paid'
      AND paid_at IS NOT NULL
      AND paid_at >= v_start_date
      AND (v_user_id IS NULL OR user_id = v_user_id)
    GROUP BY TO_CHAR((paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE, 'YYYY-MM-DD')
  )
  SELECT
    day_date as date,
    ROUND(day_gross, 2) as gross_revenue,
    ROUND(day_cost, 2) as acquirer_cost,
    ROUND(day_gross - day_cost, 2) as net_profit,
    day_count as transaction_count
  FROM daily_data
  ORDER BY day_date ASC;
END;
$$;