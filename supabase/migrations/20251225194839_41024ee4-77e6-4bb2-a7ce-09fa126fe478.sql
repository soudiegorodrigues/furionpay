-- Atualizar RPC get_platform_revenue_stats: remover Spedpay e usar ativus como padrão
CREATE OR REPLACE FUNCTION public.get_platform_revenue_stats(p_user_email text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  -- Taxas dos adquirentes (sem spedpay)
  v_inter_rate NUMERIC;
  v_inter_fixed NUMERIC;
  v_ativus_rate NUMERIC;
  v_ativus_fixed NUMERIC;
  v_valorion_rate NUMERIC;
  v_valorion_fixed NUMERIC;
  v_efi_rate NUMERIC;
  v_efi_fixed NUMERIC;
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

  -- Buscar taxas dos adquirentes de admin_settings (sem spedpay)
  SELECT 
    COALESCE(MAX(CASE WHEN key = 'inter_fee_rate' THEN value::NUMERIC END), 0.00),
    COALESCE(MAX(CASE WHEN key = 'inter_fixed_fee' THEN value::NUMERIC END), 0.00),
    COALESCE(MAX(CASE WHEN key = 'ativus_fee_rate' THEN value::NUMERIC END), 0.00),
    COALESCE(MAX(CASE WHEN key = 'ativus_fixed_fee' THEN value::NUMERIC END), 0.05),
    COALESCE(MAX(CASE WHEN key = 'valorion_fee_rate' THEN value::NUMERIC END), 0.00),
    COALESCE(MAX(CASE WHEN key = 'valorion_fixed_fee' THEN value::NUMERIC END), 0.29),
    COALESCE(MAX(CASE WHEN key = 'efi_fee_rate' THEN value::NUMERIC END), 0.00),
    COALESCE(MAX(CASE WHEN key = 'efi_fixed_fee' THEN value::NUMERIC END), 0.00)
  INTO v_inter_rate, v_inter_fixed, v_ativus_rate, v_ativus_fixed, 
       v_valorion_rate, v_valorion_fixed, v_efi_rate, v_efi_fixed
  FROM admin_settings
  WHERE user_id IS NULL;

  -- Construir resultado
  WITH paid_txns AS (
    SELECT 
      id,
      amount::NUMERIC as amount,
      COALESCE(fee_percentage, 0)::NUMERIC as fee_pct,
      COALESCE(fee_fixed, 0)::NUMERIC as fee_fix,
      COALESCE(acquirer, 'ativus') as acquirer,
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
      -- Custo do adquirente (sem spedpay, histórico tratado como custo zero)
      CASE acquirer
        WHEN 'inter' THEN ((v_inter_rate / 100) * amount) + v_inter_fixed
        WHEN 'ativus' THEN ((v_ativus_rate / 100) * amount) + v_ativus_fixed
        WHEN 'valorion' THEN ((v_valorion_rate / 100) * amount) + v_valorion_fixed
        WHEN 'efi' THEN ((v_efi_rate / 100) * amount) + v_efi_fixed
        ELSE 0 -- Transações históricas spedpay ou desconhecidas: custo zero
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
      -- All time
      COALESCE(SUM(platform_revenue), 0) as all_time_gross,
      COALESCE(SUM(acquirer_cost), 0) as all_time_cost,
      COUNT(*) as all_time_count
    FROM calcs
  ),
  -- Breakdown por adquirente (sem spedpay)
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
    'today', json_build_object('gross_revenue', p.today_gross, 'acquirer_cost', p.today_cost, 'net_profit', p.today_gross - p.today_cost, 'transaction_count', p.today_count),
    'week', json_build_object('gross_revenue', p.week_gross, 'acquirer_cost', p.week_cost, 'net_profit', p.week_gross - p.week_cost, 'transaction_count', p.week_count),
    'fortnight', json_build_object('gross_revenue', p.fortnight_gross, 'acquirer_cost', p.fortnight_cost, 'net_profit', p.fortnight_gross - p.fortnight_cost, 'transaction_count', p.fortnight_count),
    'month', json_build_object('gross_revenue', p.month_gross, 'acquirer_cost', p.month_cost, 'net_profit', p.month_gross - p.month_cost, 'transaction_count', p.month_count),
    'last_month', json_build_object('gross_revenue', p.last_month_gross, 'acquirer_cost', p.last_month_cost, 'net_profit', p.last_month_gross - p.last_month_cost, 'transaction_count', p.last_month_count),
    'year', json_build_object('gross_revenue', p.year_gross, 'acquirer_cost', p.year_cost, 'net_profit', p.year_gross - p.year_cost, 'transaction_count', p.year_count),
    'all_time', json_build_object('gross_revenue', p.all_time_gross, 'acquirer_cost', p.all_time_cost, 'net_profit', p.all_time_gross - p.all_time_cost, 'transaction_count', p.all_time_count),
    'acquirer_breakdown', json_build_object(
      'inter', json_build_object('gross_revenue', a.inter_gross, 'acquirer_cost', a.inter_cost, 'net_profit', a.inter_gross - a.inter_cost, 'transaction_count', a.inter_count),
      'ativus', json_build_object('gross_revenue', a.ativus_gross, 'acquirer_cost', a.ativus_cost, 'net_profit', a.ativus_gross - a.ativus_cost, 'transaction_count', a.ativus_count),
      'valorion', json_build_object('gross_revenue', a.valorion_gross, 'acquirer_cost', a.valorion_cost, 'net_profit', a.valorion_gross - a.valorion_cost, 'transaction_count', a.valorion_count),
      'efi', json_build_object('gross_revenue', a.efi_gross, 'acquirer_cost', a.efi_cost, 'net_profit', a.efi_gross - a.efi_cost, 'transaction_count', a.efi_count)
    ),
    'acquirer_rates', json_build_object(
      'inter', json_build_object('fee_rate', v_inter_rate, 'fixed_fee', v_inter_fixed),
      'ativus', json_build_object('fee_rate', v_ativus_rate, 'fixed_fee', v_ativus_fixed),
      'valorion', json_build_object('fee_rate', v_valorion_rate, 'fixed_fee', v_valorion_fixed),
      'efi', json_build_object('fee_rate', v_efi_rate, 'fixed_fee', v_efi_fixed)
    )
  ) INTO v_result
  FROM period_stats p, acquirer_breakdown a;

  RETURN v_result;
END;
$function$;

-- Atualizar default do campo acquirer de spedpay para ativus
ALTER TABLE public.pix_transactions ALTER COLUMN acquirer SET DEFAULT 'ativus';

-- Atualizar comentário
COMMENT ON COLUMN public.pix_transactions.acquirer IS 'Payment acquirer that processed the transaction: ativus, inter, valorion, or efi';

-- Limpar spedpay da tabela acquirer_health_status
DELETE FROM public.acquirer_health_status WHERE acquirer = 'spedpay';

-- Atualizar retry_configurations para remover spedpay do array
UPDATE public.retry_configurations 
SET acquirer_order = array_remove(acquirer_order, 'spedpay');

-- Remover steps de retry com spedpay
DELETE FROM public.retry_flow_steps WHERE acquirer = 'spedpay';