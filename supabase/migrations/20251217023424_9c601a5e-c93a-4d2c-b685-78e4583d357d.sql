
-- Create a dedicated function for chart data that calculates aggregations directly in the database
-- This is more efficient and avoids any response size limits

CREATE OR REPLACE FUNCTION public.get_chart_data_by_hour(p_date date DEFAULT CURRENT_DATE)
RETURNS TABLE(
  hour_brazil integer,
  gerados bigint,
  pagos bigint,
  valor_pago numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if user is admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  WITH hourly_generated AS (
    SELECT 
      EXTRACT(HOUR FROM pt.created_at AT TIME ZONE 'America/Sao_Paulo')::integer as hr,
      COUNT(*) as cnt
    FROM pix_transactions pt
    WHERE (pt.created_at AT TIME ZONE 'America/Sao_Paulo')::date = p_date
    GROUP BY EXTRACT(HOUR FROM pt.created_at AT TIME ZONE 'America/Sao_Paulo')
  ),
  hourly_paid AS (
    SELECT 
      EXTRACT(HOUR FROM pt.paid_at AT TIME ZONE 'America/Sao_Paulo')::integer as hr,
      COUNT(*) as cnt,
      COALESCE(SUM(pt.amount), 0) as total_valor
    FROM pix_transactions pt
    WHERE pt.status = 'paid' 
      AND pt.paid_at IS NOT NULL
      AND (pt.paid_at AT TIME ZONE 'America/Sao_Paulo')::date = p_date
    GROUP BY EXTRACT(HOUR FROM pt.paid_at AT TIME ZONE 'America/Sao_Paulo')
  ),
  all_hours AS (
    SELECT generate_series(0, 23) as hr
  )
  SELECT 
    ah.hr as hour_brazil,
    COALESCE(hg.cnt, 0) as gerados,
    COALESCE(hp.cnt, 0) as pagos,
    COALESCE(hp.total_valor, 0) as valor_pago
  FROM all_hours ah
  LEFT JOIN hourly_generated hg ON hg.hr = ah.hr
  LEFT JOIN hourly_paid hp ON hp.hr = ah.hr
  ORDER BY ah.hr;
END;
$function$;

-- Create function for daily chart data (for 7/14/30 days filters)
CREATE OR REPLACE FUNCTION public.get_chart_data_by_day(p_days integer DEFAULT 7)
RETURNS TABLE(
  date_brazil date,
  gerados bigint,
  pagos bigint,
  valor_pago numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_start_date date;
  v_end_date date;
BEGIN
  -- Check if user is admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  v_end_date := (NOW() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_start_date := v_end_date - (p_days - 1);

  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(v_start_date, v_end_date, '1 day'::interval)::date as dt
  ),
  daily_generated AS (
    SELECT 
      (pt.created_at AT TIME ZONE 'America/Sao_Paulo')::date as dt,
      COUNT(*) as cnt
    FROM pix_transactions pt
    WHERE (pt.created_at AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN v_start_date AND v_end_date
    GROUP BY (pt.created_at AT TIME ZONE 'America/Sao_Paulo')::date
  ),
  daily_paid AS (
    SELECT 
      (pt.paid_at AT TIME ZONE 'America/Sao_Paulo')::date as dt,
      COUNT(*) as cnt,
      COALESCE(SUM(pt.amount), 0) as total_valor
    FROM pix_transactions pt
    WHERE pt.status = 'paid' 
      AND pt.paid_at IS NOT NULL
      AND (pt.paid_at AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN v_start_date AND v_end_date
    GROUP BY (pt.paid_at AT TIME ZONE 'America/Sao_Paulo')::date
  )
  SELECT 
    ds.dt as date_brazil,
    COALESCE(dg.cnt, 0) as gerados,
    COALESCE(dp.cnt, 0) as pagos,
    COALESCE(dp.total_valor, 0) as valor_pago
  FROM date_series ds
  LEFT JOIN daily_generated dg ON dg.dt = ds.dt
  LEFT JOIN daily_paid dp ON dp.dt = ds.dt
  ORDER BY ds.dt;
END;
$function$;
