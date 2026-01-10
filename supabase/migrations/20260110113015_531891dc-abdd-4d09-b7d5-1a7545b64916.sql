
-- Dropar e recriar função get_chart_data_by_hour
DROP FUNCTION IF EXISTS public.get_chart_data_by_hour(date);

CREATE FUNCTION public.get_chart_data_by_hour(p_date date)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  WITH hours AS (
    SELECT generate_series(0, 23) AS hora
  ),
  gerados AS (
    SELECT 
      EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Sao_Paulo')::int AS hora,
      COUNT(*) AS count
    FROM pix_transactions
    WHERE created_date_brazil = p_date
    GROUP BY 1
  ),
  pagos AS (
    SELECT 
      EXTRACT(HOUR FROM paid_at AT TIME ZONE 'America/Sao_Paulo')::int AS hora,
      COUNT(*) AS count,
      SUM(amount) AS valor
    FROM pix_transactions
    WHERE status = 'paid'
      AND paid_date_brazil = p_date
    GROUP BY 1
  )
  SELECT json_agg(
    json_build_object(
      'hora', h.hora,
      'gerados', COALESCE(g.count, 0),
      'pagos', COALESCE(p.count, 0),
      'valor_pago', COALESCE(p.valor, 0)
    ) ORDER BY h.hora
  )
  INTO result
  FROM hours h
  LEFT JOIN gerados g ON g.hora = h.hora
  LEFT JOIN pagos p ON p.hora = h.hora;

  RETURN result;
END;
$$;
