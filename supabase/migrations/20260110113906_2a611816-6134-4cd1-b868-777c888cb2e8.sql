-- Dropar e recriar função get_chart_data_by_hour com tipos corretos
DROP FUNCTION IF EXISTS public.get_chart_data_by_hour(date);

CREATE FUNCTION public.get_chart_data_by_hour(p_date date)
RETURNS TABLE(
  hour_brazil integer,
  gerados bigint,
  pagos bigint,
  valor_pago numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH hours AS (
    SELECT generate_series(0, 23) AS hora
  ),
  gerados_data AS (
    SELECT 
      EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Sao_Paulo')::int AS hora,
      COUNT(*) AS count
    FROM pix_transactions
    WHERE created_date_brazil = p_date
    GROUP BY 1
  ),
  pagos_data AS (
    SELECT 
      EXTRACT(HOUR FROM paid_at AT TIME ZONE 'America/Sao_Paulo')::int AS hora,
      COUNT(*) AS count,
      SUM(amount) AS valor
    FROM pix_transactions
    WHERE status = 'paid'
      AND paid_date_brazil = p_date
    GROUP BY 1
  )
  SELECT 
    h.hora::integer as hour_brazil,
    COALESCE(g.count, 0)::bigint as gerados,
    COALESCE(p.count, 0)::bigint as pagos,
    COALESCE(p.valor, 0)::numeric as valor_pago
  FROM hours h
  LEFT JOIN gerados_data g ON g.hora = h.hora
  LEFT JOIN pagos_data p ON p.hora = h.hora
  ORDER BY h.hora;
END;
$$;