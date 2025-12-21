CREATE OR REPLACE FUNCTION public.get_user_chart_data_by_hour(p_date date DEFAULT NULL::date)
RETURNS TABLE(hour_brazil integer, gerados bigint, pagos bigint, valor_pago numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    h.hour_num AS hour_brazil,
    COALESCE(g.gerados, 0)::bigint AS gerados,
    COALESCE(p.pagos, 0)::bigint AS pagos,
    COALESCE(p.valor_pago, 0) AS valor_pago
  FROM generate_series(0, 23) AS h(hour_num)
  LEFT JOIN (
    -- Gerados: baseado em created_at
    SELECT 
      EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Sao_Paulo')::integer AS hora,
      COUNT(*)::bigint AS gerados
    FROM public.pix_transactions
    WHERE created_date_brazil = v_date
      AND user_id = v_effective_owner_id
    GROUP BY 1
  ) g ON g.hora = h.hour_num
  LEFT JOIN (
    -- Pagos: baseado em paid_at (corrigido para usar paid_date_brazil)
    SELECT 
      EXTRACT(HOUR FROM paid_at AT TIME ZONE 'America/Sao_Paulo')::integer AS hora,
      COUNT(*)::bigint AS pagos,
      COALESCE(SUM(amount), 0) AS valor_pago
    FROM public.pix_transactions
    WHERE paid_date_brazil = v_date
      AND status = 'paid'
      AND user_id = v_effective_owner_id
    GROUP BY 1
  ) p ON p.hora = h.hour_num
  ORDER BY hour_brazil;
END;
$function$;