-- Fix get_user_stats_by_period to correctly calculate total_amount_generated
-- Currently it sums ALL transactions instead of only 'generated' status

CREATE OR REPLACE FUNCTION public.get_user_stats_by_period(p_user_id uuid, p_period text DEFAULT 'today'::text)
 RETURNS TABLE(total_generated bigint, total_paid bigint, total_expired bigint, total_amount_generated numeric, total_amount_paid numeric, total_fees numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    -- FIX: Only sum transactions with 'generated' status for pending amount
    COALESCE(SUM(amount) FILTER (WHERE status = 'generated'), 0)::NUMERIC as total_amount_generated,
    COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0)::NUMERIC as total_amount_paid,
    COALESCE(SUM(COALESCE(fee_fixed, 0) + (amount * COALESCE(fee_percentage, 0) / 100)) FILTER (WHERE status = 'paid'), 0)::NUMERIC as total_fees
  FROM pix_transactions
  WHERE user_id = p_user_id
    AND created_at >= v_start_date
    AND created_at < v_end_date;
END;
$function$;