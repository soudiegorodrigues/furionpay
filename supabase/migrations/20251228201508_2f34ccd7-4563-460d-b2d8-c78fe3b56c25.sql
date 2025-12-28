-- Atualizar get_platform_revenue_stats_custom_range para tratar taxa de saque como RECEITA
CREATE OR REPLACE FUNCTION public.get_platform_revenue_stats_custom_range(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_inter_rate NUMERIC;
  v_inter_fixed NUMERIC;
  v_ativus_rate NUMERIC;
  v_ativus_fixed NUMERIC;
  v_valorion_rate NUMERIC;
  v_valorion_fixed NUMERIC;
  v_efi_rate NUMERIC;
  v_efi_fixed NUMERIC;
  v_gross_revenue NUMERIC;
  v_user_fees NUMERIC;
  v_pix_cost NUMERIC;
  v_withdrawal_fees NUMERIC;
  v_transaction_count INTEGER;
  v_withdrawal_count INTEGER;
  v_daily_breakdown JSON;
BEGIN
  -- Check if user is admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can view platform revenue stats';
  END IF;

  -- Get acquirer rates from admin_settings
  SELECT 
    COALESCE(MAX(CASE WHEN key = 'inter_fee_rate' THEN value::NUMERIC END), 0.00),
    COALESCE(MAX(CASE WHEN key = 'inter_fixed_fee' THEN value::NUMERIC END), 0.00),
    COALESCE(MAX(CASE WHEN key = 'ativus_fee_rate' THEN value::NUMERIC END), 0.00),
    COALESCE(MAX(CASE WHEN key = 'ativus_fixed_fee' THEN value::NUMERIC END), 0.05),
    COALESCE(MAX(CASE WHEN key = 'valorion_fee_rate' THEN value::NUMERIC END), 0.00),
    COALESCE(MAX(CASE WHEN key = 'valorion_fixed_fee' THEN value::NUMERIC END), 0.29),
    COALESCE(MAX(CASE WHEN key = 'efi_fee_rate' THEN value::NUMERIC END), 0.00),
    COALESCE(MAX(CASE WHEN key = 'efi_fixed_fee' THEN value::NUMERIC END), 0.00)
  INTO v_inter_rate, v_inter_fixed, v_ativus_rate, v_ativus_fixed, v_valorion_rate, v_valorion_fixed, v_efi_rate, v_efi_fixed
  FROM admin_settings
  WHERE user_id IS NULL;

  -- Calculate gross revenue (volume total)
  SELECT COALESCE(SUM(amount), 0), COALESCE(COUNT(*), 0)
  INTO v_gross_revenue, v_transaction_count
  FROM pix_transactions
  WHERE status = 'paid'
    AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE >= p_start_date
    AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE <= p_end_date;

  -- Calculate user fees (taxas cobradas dos usuários nas transações PIX)
  SELECT COALESCE(SUM(
    CASE
      WHEN fee_percentage IS NOT NULL AND fee_fixed IS NOT NULL THEN
        (amount * fee_percentage / 100) + fee_fixed
      ELSE
        (amount * 4.99 / 100) + 0.00
    END
  ), 0)
  INTO v_user_fees
  FROM pix_transactions
  WHERE status = 'paid'
    AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE >= p_start_date
    AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE <= p_end_date;

  -- Calculate PIX cost (custo do adquirente - único custo real)
  SELECT COALESCE(SUM(
    CASE acquirer
      WHEN 'inter' THEN ((v_inter_rate / 100) * amount) + v_inter_fixed
      WHEN 'ativus' THEN ((v_ativus_rate / 100) * amount) + v_ativus_fixed
      WHEN 'valorion' THEN ((v_valorion_rate / 100) * amount) + v_valorion_fixed
      WHEN 'efi' THEN ((v_efi_rate / 100) * amount) + v_efi_fixed
      ELSE 0
    END
  ), 0)
  INTO v_pix_cost
  FROM pix_transactions
  WHERE status = 'paid'
    AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE >= p_start_date
    AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE <= p_end_date;

  -- Calculate withdrawal fees as REVENUE (taxa fixa cobrada por saque - agora é RECEITA, não custo)
  SELECT 
    COALESCE(SUM(COALESCE(fee_fixed, 5.00)), 0),
    COALESCE(COUNT(*), 0)
  INTO v_withdrawal_fees, v_withdrawal_count
  FROM withdrawal_requests
  WHERE status = 'approved'
    AND (processed_at AT TIME ZONE 'America/Sao_Paulo')::DATE >= p_start_date
    AND (processed_at AT TIME ZONE 'America/Sao_Paulo')::DATE <= p_end_date;

  -- Build daily breakdown (lucro = taxas PIX - custo PIX, sem incluir saques por dia)
  SELECT COALESCE(json_agg(daily_data ORDER BY daily_data.date), '[]'::json)
  INTO v_daily_breakdown
  FROM (
    SELECT 
      (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE::TEXT as date,
      SUM(amount) as gross,
      SUM(
        CASE
          WHEN fee_percentage IS NOT NULL AND fee_fixed IS NOT NULL THEN
            (amount * fee_percentage / 100) + fee_fixed
          ELSE
            (amount * 4.99 / 100) + 0.00
        END
      ) - SUM(
        CASE acquirer
          WHEN 'inter' THEN ((v_inter_rate / 100) * amount) + v_inter_fixed
          WHEN 'ativus' THEN ((v_ativus_rate / 100) * amount) + v_ativus_fixed
          WHEN 'valorion' THEN ((v_valorion_rate / 100) * amount) + v_valorion_fixed
          WHEN 'efi' THEN ((v_efi_rate / 100) * amount) + v_efi_fixed
          ELSE 0
        END
      ) as net,
      COUNT(*) as count
    FROM pix_transactions
    WHERE status = 'paid'
      AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE >= p_start_date
      AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE <= p_end_date
    GROUP BY (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE
  ) daily_data;

  -- Build result JSON
  -- Lucro líquido = taxas PIX + receita de saques - custo PIX
  v_result := json_build_object(
    'totals', json_build_object(
      'gross_revenue', v_gross_revenue,
      'user_fees', v_user_fees,
      'pix_cost', v_pix_cost,
      'withdrawal_fees', v_withdrawal_fees,
      'withdrawal_count', v_withdrawal_count,
      'net_profit', v_user_fees + v_withdrawal_fees - v_pix_cost,
      'transaction_count', v_transaction_count
    ),
    'daily_breakdown', v_daily_breakdown
  );

  RETURN v_result;
END;
$$;

-- Atualizar get_platform_revenue_stats para tratar taxa de saque como RECEITA
CREATE OR REPLACE FUNCTION public.get_platform_revenue_stats(
  p_user_email TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_user_id UUID := NULL;
  v_today_start TIMESTAMPTZ;
  v_week_start TIMESTAMPTZ;
  v_fortnight_start TIMESTAMPTZ;
  v_month_start TIMESTAMPTZ;
  v_last_month_start TIMESTAMPTZ;
  v_last_month_end TIMESTAMPTZ;
  v_year_start TIMESTAMPTZ;
  v_inter_rate NUMERIC;
  v_inter_fixed NUMERIC;
  v_ativus_rate NUMERIC;
  v_ativus_fixed NUMERIC;
  v_valorion_rate NUMERIC;
  v_valorion_fixed NUMERIC;
  v_efi_rate NUMERIC;
  v_efi_fixed NUMERIC;
BEGIN
  -- Check if user is admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can view platform revenue stats';
  END IF;

  -- Optional: filter by user email
  IF p_user_email IS NOT NULL THEN
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_user_email;
  END IF;

  -- Calculate time boundaries in Brazil timezone
  v_today_start := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE::TIMESTAMPTZ;
  v_week_start := ((NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE - INTERVAL '6 days')::TIMESTAMPTZ;
  v_fortnight_start := ((NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE - INTERVAL '14 days')::TIMESTAMPTZ;
  v_month_start := date_trunc('month', NOW() AT TIME ZONE 'America/Sao_Paulo')::TIMESTAMPTZ;
  v_last_month_start := date_trunc('month', (NOW() AT TIME ZONE 'America/Sao_Paulo') - INTERVAL '1 month')::TIMESTAMPTZ;
  v_last_month_end := date_trunc('month', NOW() AT TIME ZONE 'America/Sao_Paulo')::TIMESTAMPTZ;
  v_year_start := date_trunc('year', NOW() AT TIME ZONE 'America/Sao_Paulo')::TIMESTAMPTZ;

  -- Get acquirer rates from admin_settings
  SELECT 
    COALESCE(MAX(CASE WHEN key = 'inter_fee_rate' THEN value::NUMERIC END), 0.00),
    COALESCE(MAX(CASE WHEN key = 'inter_fixed_fee' THEN value::NUMERIC END), 0.00),
    COALESCE(MAX(CASE WHEN key = 'ativus_fee_rate' THEN value::NUMERIC END), 0.00),
    COALESCE(MAX(CASE WHEN key = 'ativus_fixed_fee' THEN value::NUMERIC END), 0.05),
    COALESCE(MAX(CASE WHEN key = 'valorion_fee_rate' THEN value::NUMERIC END), 0.00),
    COALESCE(MAX(CASE WHEN key = 'valorion_fixed_fee' THEN value::NUMERIC END), 0.29),
    COALESCE(MAX(CASE WHEN key = 'efi_fee_rate' THEN value::NUMERIC END), 0.00),
    COALESCE(MAX(CASE WHEN key = 'efi_fixed_fee' THEN value::NUMERIC END), 0.00)
  INTO v_inter_rate, v_inter_fixed, v_ativus_rate, v_ativus_fixed, v_valorion_rate, v_valorion_fixed, v_efi_rate, v_efi_fixed
  FROM admin_settings
  WHERE user_id IS NULL;

  WITH calcs AS (
    SELECT 
      pt.paid_at,
      pt.amount,
      pt.acquirer,
      -- Platform revenue = user fees
      CASE
        WHEN pt.fee_percentage IS NOT NULL AND pt.fee_fixed IS NOT NULL THEN
          (pt.amount * pt.fee_percentage / 100) + pt.fee_fixed
        ELSE
          (pt.amount * 4.99 / 100) + 0.00
      END as platform_revenue,
      -- Acquirer cost
      CASE pt.acquirer
        WHEN 'inter' THEN ((v_inter_rate / 100) * pt.amount) + v_inter_fixed
        WHEN 'ativus' THEN ((v_ativus_rate / 100) * pt.amount) + v_ativus_fixed
        WHEN 'valorion' THEN ((v_valorion_rate / 100) * pt.amount) + v_valorion_fixed
        WHEN 'efi' THEN ((v_efi_rate / 100) * pt.amount) + v_efi_fixed
        ELSE 0
      END as acquirer_cost
    FROM pix_transactions pt
    WHERE pt.status = 'paid'
      AND (v_user_id IS NULL OR pt.user_id = v_user_id)
  ),
  period_sums AS (
    SELECT
      COALESCE(SUM(platform_revenue) FILTER (WHERE paid_at >= v_today_start), 0) as today_gross,
      COALESCE(SUM(acquirer_cost) FILTER (WHERE paid_at >= v_today_start), 0) as today_pix_cost,
      COUNT(*) FILTER (WHERE paid_at >= v_today_start) as today_count,
      
      COALESCE(SUM(platform_revenue) FILTER (WHERE paid_at >= v_week_start), 0) as week_gross,
      COALESCE(SUM(acquirer_cost) FILTER (WHERE paid_at >= v_week_start), 0) as week_pix_cost,
      
      COALESCE(SUM(platform_revenue) FILTER (WHERE paid_at >= v_fortnight_start), 0) as fortnight_gross,
      COALESCE(SUM(acquirer_cost) FILTER (WHERE paid_at >= v_fortnight_start), 0) as fortnight_pix_cost,
      
      COALESCE(SUM(platform_revenue) FILTER (WHERE paid_at >= v_month_start), 0) as month_gross,
      COALESCE(SUM(acquirer_cost) FILTER (WHERE paid_at >= v_month_start), 0) as month_pix_cost,
      
      COALESCE(SUM(platform_revenue) FILTER (WHERE paid_at >= v_last_month_start AND paid_at < v_last_month_end), 0) as last_month_gross,
      COALESCE(SUM(acquirer_cost) FILTER (WHERE paid_at >= v_last_month_start AND paid_at < v_last_month_end), 0) as last_month_pix_cost,
      
      COALESCE(SUM(platform_revenue) FILTER (WHERE paid_at >= v_year_start), 0) as year_gross,
      COALESCE(SUM(acquirer_cost) FILTER (WHERE paid_at >= v_year_start), 0) as year_pix_cost,
      
      COALESCE(SUM(platform_revenue), 0) as all_time_gross,
      COALESCE(SUM(acquirer_cost), 0) as all_time_pix_cost,
      COUNT(*) as all_time_count
    FROM calcs
  ),
  -- Taxa de saque agora é RECEITA (não custo)
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
  -- Breakdown por adquirente
  acquirer_breakdown AS (
    SELECT
      COALESCE(SUM(platform_revenue) FILTER (WHERE acquirer = 'inter'), 0) as inter_gross,
      COALESCE(SUM(acquirer_cost) FILTER (WHERE acquirer = 'inter'), 0) as inter_cost,
      COUNT(*) FILTER (WHERE acquirer = 'inter') as inter_count,
      COALESCE(SUM(platform_revenue) FILTER (WHERE acquirer = 'ativus'), 0) as ativus_gross,
      COALESCE(SUM(acquirer_cost) FILTER (WHERE acquirer = 'ativus'), 0) as ativus_cost,
      COUNT(*) FILTER (WHERE acquirer = 'ativus') as ativus_count,
      COALESCE(SUM(platform_revenue) FILTER (WHERE acquirer = 'valorion'), 0) as valorion_gross,
      COALESCE(SUM(acquirer_cost) FILTER (WHERE acquirer = 'valorion'), 0) as valorion_cost,
      COUNT(*) FILTER (WHERE acquirer = 'valorion') as valorion_count,
      COALESCE(SUM(platform_revenue) FILTER (WHERE acquirer = 'efi'), 0) as efi_gross,
      COALESCE(SUM(acquirer_cost) FILTER (WHERE acquirer = 'efi'), 0) as efi_cost,
      COUNT(*) FILTER (WHERE acquirer = 'efi') as efi_count
    FROM calcs
  )
  SELECT json_build_object(
    'today', json_build_object(
      'gross_revenue', p.today_gross, 
      'pix_cost', p.today_pix_cost,
      'withdrawal_fees', w.today_withdrawal_fees,
      'net_profit', p.today_gross + w.today_withdrawal_fees - p.today_pix_cost, 
      'transaction_count', p.today_count,
      'withdrawal_count', w.today_withdrawal_count
    ),
    'week', json_build_object(
      'gross_revenue', p.week_gross, 
      'pix_cost', p.week_pix_cost,
      'withdrawal_fees', w.week_withdrawal_fees,
      'net_profit', p.week_gross + w.week_withdrawal_fees - p.week_pix_cost
    ),
    'fortnight', json_build_object(
      'gross_revenue', p.fortnight_gross, 
      'pix_cost', p.fortnight_pix_cost,
      'withdrawal_fees', w.fortnight_withdrawal_fees,
      'net_profit', p.fortnight_gross + w.fortnight_withdrawal_fees - p.fortnight_pix_cost
    ),
    'month', json_build_object(
      'gross_revenue', p.month_gross, 
      'pix_cost', p.month_pix_cost,
      'withdrawal_fees', w.month_withdrawal_fees,
      'net_profit', p.month_gross + w.month_withdrawal_fees - p.month_pix_cost,
      'withdrawal_count', w.month_withdrawal_count
    ),
    'last_month', json_build_object(
      'gross_revenue', p.last_month_gross, 
      'pix_cost', p.last_month_pix_cost,
      'withdrawal_fees', w.last_month_withdrawal_fees,
      'net_profit', p.last_month_gross + w.last_month_withdrawal_fees - p.last_month_pix_cost
    ),
    'year', json_build_object(
      'gross_revenue', p.year_gross, 
      'pix_cost', p.year_pix_cost,
      'withdrawal_fees', w.year_withdrawal_fees,
      'net_profit', p.year_gross + w.year_withdrawal_fees - p.year_pix_cost
    ),
    'all_time', json_build_object(
      'gross_revenue', p.all_time_gross, 
      'pix_cost', p.all_time_pix_cost,
      'withdrawal_fees', w.all_time_withdrawal_fees,
      'net_profit', p.all_time_gross + w.all_time_withdrawal_fees - p.all_time_pix_cost,
      'transaction_count', p.all_time_count,
      'withdrawal_count', w.all_time_withdrawal_count
    ),
    'acquirer_breakdown', json_build_object(
      'inter', json_build_object('total', json_build_object('count', a.inter_count, 'cost', a.inter_cost, 'volume', a.inter_gross)),
      'ativus', json_build_object('total', json_build_object('count', a.ativus_count, 'cost', a.ativus_cost, 'volume', a.ativus_gross)),
      'valorion', json_build_object('total', json_build_object('count', a.valorion_count, 'cost', a.valorion_cost, 'volume', a.valorion_gross)),
      'efi', json_build_object('total', json_build_object('count', a.efi_count, 'cost', a.efi_cost, 'volume', a.efi_gross))
    )
  )
  INTO v_result
  FROM period_sums p
  CROSS JOIN withdrawal_revenue w
  CROSS JOIN acquirer_breakdown a;

  RETURN v_result;
END;
$$;