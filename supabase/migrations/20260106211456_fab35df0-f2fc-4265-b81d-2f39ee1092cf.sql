-- Atualizar função get_global_dashboard_v2 para buscar dados de "Hoje" em tempo real
-- com timezone Brasil (America/Sao_Paulo) ao invés da tabela agregada desatualizada

CREATE OR REPLACE FUNCTION public.get_global_dashboard_v2()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_brazil_today DATE;
  v_today_generated BIGINT := 0;
  v_today_paid BIGINT := 0;
  v_today_amount NUMERIC := 0;
  v_today_fees NUMERIC := 0;
  v_total_generated NUMERIC := 0;
  v_total_paid NUMERIC := 0;
  v_total_fees NUMERIC := 0;
  v_month_generated NUMERIC := 0;
  v_month_paid NUMERIC := 0;
BEGIN
  -- Data atual no Brasil
  v_brazil_today := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;

  -- Buscar dados de HOJE diretamente da pix_transactions (tempo real)
  SELECT 
    COUNT(*) FILTER (WHERE status = 'generated'),
    COUNT(*) FILTER (WHERE status = 'paid'),
    COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0),
    COALESCE(SUM(COALESCE(fee_fixed, 0) + (amount * COALESCE(fee_percentage, 0) / 100)) FILTER (WHERE status = 'paid'), 0)
  INTO v_today_generated, v_today_paid, v_today_amount, v_today_fees
  FROM pix_transactions
  WHERE created_at >= (v_brazil_today::TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')
    AND created_at < ((v_brazil_today + INTERVAL '1 day')::TIMESTAMP AT TIME ZONE 'America/Sao_Paulo');

  -- Totais históricos (all-time) - buscar da tabela agregada para performance
  SELECT 
    COALESCE(SUM(generated_amount), 0),
    COALESCE(SUM(paid_amount), 0),
    COALESCE(SUM(total_fees), 0)
  INTO v_total_generated, v_total_paid, v_total_fees
  FROM daily_global_stats;

  -- Dados do mês atual - buscar da tabela agregada
  SELECT 
    COALESCE(SUM(generated_amount), 0),
    COALESCE(SUM(paid_amount), 0)
  INTO v_month_generated, v_month_paid
  FROM daily_global_stats
  WHERE stat_date >= DATE_TRUNC('month', v_brazil_today);

  RETURN json_build_object(
    'today_generated', v_today_generated,
    'today_paid', v_today_paid,
    'today_amount', v_today_amount,
    'today_fees', v_today_fees,
    'total_generated', v_total_generated,
    'total_paid', v_total_paid,
    'total_fees', v_total_fees,
    'month_generated', v_month_generated,
    'month_paid', v_month_paid
  );
END;
$$;