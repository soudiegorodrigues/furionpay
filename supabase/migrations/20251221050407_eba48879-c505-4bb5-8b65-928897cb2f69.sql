
-- Atualizar função get_user_stats_by_period para incluir 'yesterday', '15days' e 'year'
CREATE OR REPLACE FUNCTION get_user_stats_by_period(p_user_id UUID, p_period TEXT DEFAULT 'today')
RETURNS TABLE(
  total_generated BIGINT,
  total_paid BIGINT,
  total_expired BIGINT,
  total_amount_generated NUMERIC,
  total_amount_paid NUMERIC,
  total_fees NUMERIC
) AS $$
DECLARE
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
BEGIN
  -- Definir período baseado no parâmetro
  CASE p_period
    WHEN 'today' THEN
      v_start_date := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE::TIMESTAMPTZ;
      v_end_date := NOW();
    WHEN 'yesterday' THEN
      v_start_date := ((NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE - INTERVAL '1 day')::TIMESTAMPTZ;
      v_end_date := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE::TIMESTAMPTZ;
    WHEN '7days' THEN
      v_start_date := NOW() - INTERVAL '7 days';
      v_end_date := NOW();
    WHEN '15days' THEN
      v_start_date := NOW() - INTERVAL '15 days';
      v_end_date := NOW();
    WHEN '30days' THEN
      v_start_date := NOW() - INTERVAL '30 days';
      v_end_date := NOW();
    WHEN 'month' THEN
      v_start_date := date_trunc('month', NOW() AT TIME ZONE 'America/Sao_Paulo')::TIMESTAMPTZ;
      v_end_date := NOW();
    WHEN 'year' THEN
      v_start_date := date_trunc('year', NOW() AT TIME ZONE 'America/Sao_Paulo')::TIMESTAMPTZ;
      v_end_date := NOW();
    ELSE
      v_start_date := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE::TIMESTAMPTZ;
      v_end_date := NOW();
  END CASE;

  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_generated,
    COUNT(*) FILTER (WHERE status = 'paid')::BIGINT as total_paid,
    COUNT(*) FILTER (WHERE status = 'expired')::BIGINT as total_expired,
    COALESCE(SUM(amount), 0)::NUMERIC as total_amount_generated,
    COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0)::NUMERIC as total_amount_paid,
    COALESCE(SUM(COALESCE(fee_fixed, 0) + (amount * COALESCE(fee_percentage, 0) / 100)) FILTER (WHERE status = 'paid'), 0)::NUMERIC as total_fees
  FROM pix_transactions
  WHERE user_id = p_user_id
    AND created_at >= v_start_date
    AND created_at < v_end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
