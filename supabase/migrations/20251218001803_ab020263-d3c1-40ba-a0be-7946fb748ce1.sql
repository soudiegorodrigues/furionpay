-- Fix hourly chart aggregation to use Brazil-local date by default (and support collaborators)
CREATE OR REPLACE FUNCTION public.get_user_chart_data_by_hour(p_date date DEFAULT NULL)
RETURNS TABLE(hour_brazil integer, gerados bigint, pagos bigint, valor_pago numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_date date;
  v_effective_owner_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_effective_owner_id := public.get_effective_owner_id(auth.uid());
  v_date := COALESCE(p_date, (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date);

  RETURN QUERY
  SELECT
    EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Sao_Paulo')::integer AS hour_brazil,
    COUNT(*)::bigint AS gerados,
    COUNT(*) FILTER (WHERE status = 'paid')::bigint AS pagos,
    COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) AS valor_pago
  FROM public.pix_transactions
  WHERE created_date_brazil = v_date
    AND user_id = v_effective_owner_id
  GROUP BY 1
  ORDER BY hour_brazil;
END;
$$;