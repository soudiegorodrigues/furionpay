-- Atualizar a função get_platform_revenue_stats para separar Taxa Percentual e Valor Fixo
CREATE OR REPLACE FUNCTION public.get_platform_revenue_stats(p_user_email TEXT DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_today_start TIMESTAMPTZ;
  v_week_start TIMESTAMPTZ;
  v_fortnight_start TIMESTAMPTZ;
  v_month_start TIMESTAMPTZ;
  v_last_month_start TIMESTAMPTZ;
  v_last_month_end TIMESTAMPTZ;
  v_year_start TIMESTAMPTZ;
  v_result JSON;
BEGIN
  -- Set timezone context
  SET LOCAL timezone = 'America/Sao_Paulo';
  
  -- If email provided, get user_id
  IF p_user_email IS NOT NULL THEN
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_user_email;
    IF v_user_id IS NULL THEN
      RETURN '{}'::JSON;
    END IF;
  END IF;
  
  -- Calculate period boundaries
  v_today_start := DATE_TRUNC('day', NOW() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
  v_week_start := DATE_TRUNC('day', NOW() AT TIME ZONE 'America/Sao_Paulo' - INTERVAL '6 days') AT TIME ZONE 'America/Sao_Paulo';
  v_fortnight_start := DATE_TRUNC('day', NOW() AT TIME ZONE 'America/Sao_Paulo' - INTERVAL '14 days') AT TIME ZONE 'America/Sao_Paulo';
  v_month_start := DATE_TRUNC('month', NOW() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
  v_last_month_start := DATE_TRUNC('month', NOW() AT TIME ZONE 'America/Sao_Paulo' - INTERVAL '1 month') AT TIME ZONE 'America/Sao_Paulo';
  v_last_month_end := DATE_TRUNC('month', NOW() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
  v_year_start := DATE_TRUNC('year', NOW() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
  
  WITH calcs AS (
    SELECT
      pt.id,
      pt.paid_at,
      pt.amount,
      pt.acquirer,
      -- SEPARAÇÃO: Taxa Percentual
      (pt.amount * COALESCE(pt.fee_percentage, 4.99) / 100) as percentage_revenue,
      -- SEPARAÇÃO: Valor Fixo
      COALESCE(pt.fee_fixed, 0.00) as fixed_revenue,
      -- Platform revenue total (para manter compatibilidade)
      (pt.amount * COALESCE(pt.fee_percentage, 4.99) / 100) + COALESCE(pt.fee_fixed, 0.00) as platform_revenue,
      -- Acquirer cost
      CASE pt.acquirer
        WHEN 'inter' THEN 0.00
        WHEN 'ativus' THEN 0.05
        WHEN 'valorion' THEN 0.29
        ELSE 0.00
      END as acquirer_cost
    FROM pix_transactions pt
    WHERE pt.status = 'paid'
      AND pt.paid_at IS NOT NULL
      AND (v_user_id IS NULL OR pt.user_id = v_user_id)
  ),
  period_sums AS (
    SELECT
      -- Today
      COALESCE(SUM(platform_revenue) FILTER (WHERE paid_at >= v_today_start), 0) as today_gross,
      COALESCE(SUM(percentage_revenue) FILTER (WHERE paid_at >= v_today_start), 0) as today_percentage_revenue,
      COALESCE(SUM(fixed_revenue) FILTER (WHERE paid_at >= v_today_start), 0) as today_fixed_revenue,
      COALESCE(SUM(acquirer_cost) FILTER (WHERE paid_at >= v_today_start), 0) as today_pix_cost,
      COUNT(*) FILTER (WHERE paid_at >= v_today_start) as today_count,
      -- Week (7 days)
      COALESCE(SUM(platform_revenue) FILTER (WHERE paid_at >= v_week_start), 0) as week_gross,
      COALESCE(SUM(percentage_revenue) FILTER (WHERE paid_at >= v_week_start), 0) as week_percentage_revenue,
      COALESCE(SUM(fixed_revenue) FILTER (WHERE paid_at >= v_week_start), 0) as week_fixed_revenue,
      COALESCE(SUM(acquirer_cost) FILTER (WHERE paid_at >= v_week_start), 0) as week_pix_cost,
      -- Fortnight (15 days)
      COALESCE(SUM(platform_revenue) FILTER (WHERE paid_at >= v_fortnight_start), 0) as fortnight_gross,
      COALESCE(SUM(percentage_revenue) FILTER (WHERE paid_at >= v_fortnight_start), 0) as fortnight_percentage_revenue,
      COALESCE(SUM(fixed_revenue) FILTER (WHERE paid_at >= v_fortnight_start), 0) as fortnight_fixed_revenue,
      COALESCE(SUM(acquirer_cost) FILTER (WHERE paid_at >= v_fortnight_start), 0) as fortnight_pix_cost,
      -- This month
      COALESCE(SUM(platform_revenue) FILTER (WHERE paid_at >= v_month_start), 0) as month_gross,
      COALESCE(SUM(percentage_revenue) FILTER (WHERE paid_at >= v_month_start), 0) as month_percentage_revenue,
      COALESCE(SUM(fixed_revenue) FILTER (WHERE paid_at >= v_month_start), 0) as month_fixed_revenue,
      COALESCE(SUM(acquirer_cost) FILTER (WHERE paid_at >= v_month_start), 0) as month_pix_cost,
      -- Last month
      COALESCE(SUM(platform_revenue) FILTER (WHERE paid_at >= v_last_month_start AND paid_at < v_last_month_end), 0) as last_month_gross,
      COALESCE(SUM(percentage_revenue) FILTER (WHERE paid_at >= v_last_month_start AND paid_at < v_last_month_end), 0) as last_month_percentage_revenue,
      COALESCE(SUM(fixed_revenue) FILTER (WHERE paid_at >= v_last_month_start AND paid_at < v_last_month_end), 0) as last_month_fixed_revenue,
      COALESCE(SUM(acquirer_cost) FILTER (WHERE paid_at >= v_last_month_start AND paid_at < v_last_month_end), 0) as last_month_pix_cost,
      -- This year
      COALESCE(SUM(platform_revenue) FILTER (WHERE paid_at >= v_year_start), 0) as year_gross,
      COALESCE(SUM(percentage_revenue) FILTER (WHERE paid_at >= v_year_start), 0) as year_percentage_revenue,
      COALESCE(SUM(fixed_revenue) FILTER (WHERE paid_at >= v_year_start), 0) as year_fixed_revenue,
      COALESCE(SUM(acquirer_cost) FILTER (WHERE paid_at >= v_year_start), 0) as year_pix_cost,
      -- All time
      COALESCE(SUM(platform_revenue), 0) as all_time_gross,
      COALESCE(SUM(percentage_revenue), 0) as all_time_percentage_revenue,
      COALESCE(SUM(fixed_revenue), 0) as all_time_fixed_revenue,
      COALESCE(SUM(acquirer_cost), 0) as all_time_pix_cost,
      COUNT(*) as all_time_count
    FROM calcs
  ),
  withdrawal_revenue AS (
    SELECT
      COALESCE(SUM(COALESCE(fee_fixed, 5.00)) FILTER (WHERE processed_at >= v_today_start), 0) as today_withdrawal_fees,
      COALESCE(SUM(COALESCE(fee_fixed, 5.00)) FILTER (WHERE processed_at >= v_week_start), 0) as week_withdrawal_fees,
      COALESCE(SUM(COALESCE(fee_fixed, 5.00)) FILTER (WHERE processed_at >= v_fortnight_start), 0) as fortnight_withdrawal_fees,
      COALESCE(SUM(COALESCE(fee_fixed, 5.00)) FILTER (WHERE processed_at >= v_month_start), 0) as month_withdrawal_fees,
      COALESCE(SUM(COALESCE(fee_fixed, 5.00)) FILTER (WHERE processed_at >= v_last_month_start AND processed_at < v_last_month_end), 0) as last_month_withdrawal_fees,
      COALESCE(SUM(COALESCE(fee_fixed, 5.00)) FILTER (WHERE processed_at >= v_year_start), 0) as year_withdrawal_fees,
      COALESCE(SUM(COALESCE(fee_fixed, 5.00)), 0) as all_time_withdrawal_fees,
      COUNT(*) FILTER (WHERE processed_at >= v_today_start) as today_withdrawal_count,
      COUNT(*) FILTER (WHERE processed_at >= v_month_start) as month_withdrawal_count,
      COUNT(*) as all_time_withdrawal_count
    FROM withdrawal_requests
    WHERE status = 'approved'
      AND processed_at IS NOT NULL
      AND (v_user_id IS NULL OR user_id = v_user_id)
  ),
  acquirer_stats AS (
    SELECT
      acquirer,
      json_build_object(
        'today', json_build_object(
          'count', COUNT(*) FILTER (WHERE paid_at >= v_today_start),
          'cost', COALESCE(SUM(acquirer_cost) FILTER (WHERE paid_at >= v_today_start), 0),
          'volume', COALESCE(SUM(amount) FILTER (WHERE paid_at >= v_today_start), 0)
        ),
        'sevenDays', json_build_object(
          'count', COUNT(*) FILTER (WHERE paid_at >= v_week_start),
          'cost', COALESCE(SUM(acquirer_cost) FILTER (WHERE paid_at >= v_week_start), 0),
          'volume', COALESCE(SUM(amount) FILTER (WHERE paid_at >= v_week_start), 0)
        ),
        'thisMonth', json_build_object(
          'count', COUNT(*) FILTER (WHERE paid_at >= v_month_start),
          'cost', COALESCE(SUM(acquirer_cost) FILTER (WHERE paid_at >= v_month_start), 0),
          'volume', COALESCE(SUM(amount) FILTER (WHERE paid_at >= v_month_start), 0)
        ),
        'total', json_build_object(
          'count', COUNT(*),
          'cost', COALESCE(SUM(acquirer_cost), 0),
          'volume', COALESCE(SUM(amount), 0)
        )
      ) as stats
    FROM calcs
    GROUP BY acquirer
  )
  SELECT json_build_object(
    'today', json_build_object(
      'gross_revenue', p.today_gross,
      'percentage_revenue', p.today_percentage_revenue,
      'fixed_revenue', p.today_fixed_revenue,
      'pix_cost', p.today_pix_cost,
      'withdrawal_fees', w.today_withdrawal_fees,
      'net_profit', p.today_gross + w.today_withdrawal_fees - p.today_pix_cost,
      'transaction_count', p.today_count
    ),
    'week', json_build_object(
      'gross_revenue', p.week_gross,
      'percentage_revenue', p.week_percentage_revenue,
      'fixed_revenue', p.week_fixed_revenue,
      'pix_cost', p.week_pix_cost,
      'withdrawal_fees', w.week_withdrawal_fees,
      'net_profit', p.week_gross + w.week_withdrawal_fees - p.week_pix_cost
    ),
    'fortnight', json_build_object(
      'gross_revenue', p.fortnight_gross,
      'percentage_revenue', p.fortnight_percentage_revenue,
      'fixed_revenue', p.fortnight_fixed_revenue,
      'pix_cost', p.fortnight_pix_cost,
      'withdrawal_fees', w.fortnight_withdrawal_fees,
      'net_profit', p.fortnight_gross + w.fortnight_withdrawal_fees - p.fortnight_pix_cost
    ),
    'month', json_build_object(
      'gross_revenue', p.month_gross,
      'percentage_revenue', p.month_percentage_revenue,
      'fixed_revenue', p.month_fixed_revenue,
      'pix_cost', p.month_pix_cost,
      'withdrawal_fees', w.month_withdrawal_fees,
      'net_profit', p.month_gross + w.month_withdrawal_fees - p.month_pix_cost
    ),
    'last_month', json_build_object(
      'gross_revenue', p.last_month_gross,
      'percentage_revenue', p.last_month_percentage_revenue,
      'fixed_revenue', p.last_month_fixed_revenue,
      'pix_cost', p.last_month_pix_cost,
      'withdrawal_fees', w.last_month_withdrawal_fees,
      'net_profit', p.last_month_gross + w.last_month_withdrawal_fees - p.last_month_pix_cost
    ),
    'year', json_build_object(
      'gross_revenue', p.year_gross,
      'percentage_revenue', p.year_percentage_revenue,
      'fixed_revenue', p.year_fixed_revenue,
      'pix_cost', p.year_pix_cost,
      'withdrawal_fees', w.year_withdrawal_fees,
      'net_profit', p.year_gross + w.year_withdrawal_fees - p.year_pix_cost
    ),
    'all_time', json_build_object(
      'gross_revenue', p.all_time_gross,
      'percentage_revenue', p.all_time_percentage_revenue,
      'fixed_revenue', p.all_time_fixed_revenue,
      'pix_cost', p.all_time_pix_cost,
      'withdrawal_fees', w.all_time_withdrawal_fees,
      'net_profit', p.all_time_gross + w.all_time_withdrawal_fees - p.all_time_pix_cost,
      'transaction_count', p.all_time_count
    ),
    'acquirer_breakdown', (SELECT json_object_agg(acquirer, stats) FROM acquirer_stats)
  )
  INTO v_result
  FROM period_sums p, withdrawal_revenue w;
  
  RETURN v_result;
END;
$$;