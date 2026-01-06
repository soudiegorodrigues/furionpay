-- Corrigir função get_global_dashboard_v2 para retornar todos os campos necessários
-- com nomes corretos e tipos corretos (contagens vs valores monetários)

CREATE OR REPLACE FUNCTION public.get_global_dashboard_v2()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_brazil_today DATE;
  v_brazil_month_start DATE;
  -- Contagens de hoje
  v_today_generated BIGINT := 0;
  v_today_paid BIGINT := 0;
  v_today_amount NUMERIC := 0;
  v_today_fees NUMERIC := 0;
  -- Contagens e valores totais (all-time)
  v_total_generated_count BIGINT := 0;
  v_total_paid_count BIGINT := 0;
  v_total_amount_generated NUMERIC := 0;
  v_total_amount_paid NUMERIC := 0;
  v_total_fees NUMERIC := 0;
  -- Contagens e valores do mês
  v_month_generated_count BIGINT := 0;
  v_month_paid_count BIGINT := 0;
  v_month_amount NUMERIC := 0;
BEGIN
  -- Data atual no Brasil
  v_brazil_today := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;
  v_brazil_month_start := DATE_TRUNC('month', v_brazil_today)::DATE;

  -- Buscar dados de HOJE diretamente da pix_transactions (tempo real)
  SELECT 
    COUNT(*) FILTER (WHERE status = 'generated' OR status = 'paid'),
    COUNT(*) FILTER (WHERE status = 'paid'),
    COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0),
    COALESCE(SUM(COALESCE(fee_fixed, 0) + (amount * COALESCE(fee_percentage, 0) / 100)) FILTER (WHERE status = 'paid'), 0)
  INTO v_today_generated, v_today_paid, v_today_amount, v_today_fees
  FROM pix_transactions
  WHERE created_at >= (v_brazil_today::TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')
    AND created_at < ((v_brazil_today + INTERVAL '1 day')::TIMESTAMP AT TIME ZONE 'America/Sao_Paulo');

  -- Totais históricos (all-time) - buscar diretamente de pix_transactions para precisão
  SELECT 
    COUNT(*) FILTER (WHERE status = 'generated' OR status = 'paid'),
    COUNT(*) FILTER (WHERE status = 'paid'),
    COALESCE(SUM(amount) FILTER (WHERE status = 'generated' OR status = 'paid'), 0),
    COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0),
    COALESCE(SUM(COALESCE(fee_fixed, 0) + (amount * COALESCE(fee_percentage, 0) / 100)) FILTER (WHERE status = 'paid'), 0)
  INTO v_total_generated_count, v_total_paid_count, v_total_amount_generated, v_total_amount_paid, v_total_fees
  FROM pix_transactions;

  -- Dados do mês atual - buscar diretamente de pix_transactions
  SELECT 
    COUNT(*) FILTER (WHERE status = 'generated' OR status = 'paid'),
    COUNT(*) FILTER (WHERE status = 'paid'),
    COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0)
  INTO v_month_generated_count, v_month_paid_count, v_month_amount
  FROM pix_transactions
  WHERE created_at >= (v_brazil_month_start::TIMESTAMP AT TIME ZONE 'America/Sao_Paulo');

  RETURN json_build_object(
    -- Dados de hoje
    'today_generated', v_today_generated,
    'today_paid', v_today_paid,
    'today_amount', v_today_amount,
    'today_fees', v_today_fees,
    -- Contagens totais (para exibição como "PIX Gerados" e "PIX Pagos")
    'total_generated', v_total_generated_count,
    'total_paid', v_total_paid_count,
    -- Valores monetários totais (para exibição como "R$ X")
    'total_amount_generated', v_total_amount_generated,
    'total_amount_paid', v_total_amount_paid,
    'total_fees', v_total_fees,
    -- Dados do mês
    'month_generated', v_month_generated_count,
    'month_paid', v_month_paid_count,
    'month_amount', v_month_amount
  );
END;
$$;