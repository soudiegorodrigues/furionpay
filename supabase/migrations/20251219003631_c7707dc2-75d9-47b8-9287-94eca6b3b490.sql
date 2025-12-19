
-- Corrigir get_platform_revenue_chart para mostrar dados por hora quando filtro for 'today'
DROP FUNCTION IF EXISTS get_platform_revenue_chart(text, text);

CREATE OR REPLACE FUNCTION public.get_platform_revenue_chart(
  p_filter text DEFAULT '30days',
  p_user_email text DEFAULT NULL
)
RETURNS TABLE(date text, gross_revenue numeric, acquirer_cost numeric, net_profit numeric, transaction_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  v_brazil_now TIMESTAMPTZ;
  v_is_today BOOLEAN := FALSE;
BEGIN
  -- Obter hora atual no Brasil
  v_brazil_now := NOW() AT TIME ZONE 'America/Sao_Paulo';
  
  -- Calcular data inicial baseado no filtro
  CASE p_filter
    WHEN 'today' THEN
      v_start_date := DATE_TRUNC('day', v_brazil_now);
      v_is_today := TRUE;
    WHEN '7days' THEN
      v_start_date := DATE_TRUNC('day', v_brazil_now) - INTERVAL '6 days';
    WHEN '14days' THEN
      v_start_date := DATE_TRUNC('day', v_brazil_now) - INTERVAL '13 days';
    WHEN '30days' THEN
      v_start_date := DATE_TRUNC('day', v_brazil_now) - INTERVAL '29 days';
    WHEN 'month' THEN
      v_start_date := DATE_TRUNC('month', v_brazil_now);
    WHEN 'year' THEN
      v_start_date := DATE_TRUNC('year', v_brazil_now);
    ELSE
      v_start_date := DATE_TRUNC('day', v_brazil_now) - INTERVAL '29 days';
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

  -- Retornar dados por hora para 'today', por dia para outros filtros
  IF v_is_today THEN
    RETURN QUERY
    WITH hourly_data AS (
      SELECT
        TO_CHAR((paid_at AT TIME ZONE 'America/Sao_Paulo'), 'HH24') || 'h' as period,
        EXTRACT(HOUR FROM (paid_at AT TIME ZONE 'America/Sao_Paulo')) as hour_num,
        SUM(((COALESCE(fee_percentage, 0)::NUMERIC / 100) * amount::NUMERIC) + COALESCE(fee_fixed, 0)::NUMERIC) as period_gross,
        SUM(
          CASE COALESCE(acquirer, 'spedpay')
            WHEN 'inter' THEN ((v_inter_rate / 100) * amount::NUMERIC) + v_inter_fixed
            WHEN 'ativus' THEN ((v_ativus_rate / 100) * amount::NUMERIC) + v_ativus_fixed
            WHEN 'valorion' THEN ((v_valorion_rate / 100) * amount::NUMERIC) + v_valorion_fixed
            ELSE ((v_spedpay_rate / 100) * amount::NUMERIC) + v_spedpay_fixed
          END
        ) as period_cost,
        COUNT(*) as period_count
      FROM pix_transactions
      WHERE status = 'paid'
        AND paid_at IS NOT NULL
        AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE = v_brazil_now::DATE
        AND (v_user_id IS NULL OR user_id = v_user_id)
      GROUP BY TO_CHAR((paid_at AT TIME ZONE 'America/Sao_Paulo'), 'HH24'), 
               EXTRACT(HOUR FROM (paid_at AT TIME ZONE 'America/Sao_Paulo'))
    )
    SELECT
      period as date,
      ROUND(period_gross, 2) as gross_revenue,
      ROUND(period_cost, 2) as acquirer_cost,
      ROUND(period_gross - period_cost, 2) as net_profit,
      period_count as transaction_count
    FROM hourly_data
    ORDER BY hour_num ASC;
  ELSE
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
        AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE >= v_start_date::DATE
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
  END IF;
END;
$$;
