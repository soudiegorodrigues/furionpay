-- Function to get user chart data by hour (for "today" filter)
CREATE OR REPLACE FUNCTION public.get_user_chart_data_by_hour()
RETURNS TABLE(hour_brazil integer, gerados bigint, pagos bigint, valor_pago numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_brazil_today DATE;
  v_user_fee_config_id UUID;
  v_fee_percentage NUMERIC;
  v_fee_fixed NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  v_brazil_today := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;
  
  SELECT value::UUID INTO v_user_fee_config_id
  FROM admin_settings
  WHERE user_id = auth.uid() AND key = 'user_fee_config'
  LIMIT 1;

  IF v_user_fee_config_id IS NOT NULL THEN
    SELECT pix_percentage, pix_fixed INTO v_fee_percentage, v_fee_fixed
    FROM fee_configs WHERE id = v_user_fee_config_id LIMIT 1;
  END IF;
  IF v_fee_percentage IS NULL THEN
    SELECT pix_percentage, pix_fixed INTO v_fee_percentage, v_fee_fixed
    FROM fee_configs WHERE is_default = true LIMIT 1;
  END IF;

  RETURN QUERY
  WITH hours AS (
    SELECT generate_series(0, 23) AS h
  ),
  generated_by_hour AS (
    SELECT 
      EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Sao_Paulo')::integer AS h,
      COUNT(*) AS cnt
    FROM pix_transactions
    WHERE user_id = auth.uid()
      AND (created_at AT TIME ZONE 'America/Sao_Paulo')::DATE = v_brazil_today
    GROUP BY 1
  ),
  paid_by_hour AS (
    SELECT 
      EXTRACT(HOUR FROM paid_at AT TIME ZONE 'America/Sao_Paulo')::integer AS h,
      COUNT(*) AS cnt,
      SUM(
        amount - (
          CASE 
            WHEN fee_percentage IS NOT NULL AND fee_fixed IS NOT NULL THEN
              (amount * fee_percentage / 100) + fee_fixed
            ELSE
              (amount * COALESCE(v_fee_percentage, 0) / 100) + COALESCE(v_fee_fixed, 0)
          END
        )
      ) AS valor
    FROM pix_transactions
    WHERE user_id = auth.uid()
      AND status = 'paid'
      AND paid_at IS NOT NULL
      AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE = v_brazil_today
    GROUP BY 1
  )
  SELECT 
    hours.h AS hour_brazil,
    COALESCE(g.cnt, 0) AS gerados,
    COALESCE(p.cnt, 0) AS pagos,
    ROUND(COALESCE(p.valor, 0), 2) AS valor_pago
  FROM hours
  LEFT JOIN generated_by_hour g ON g.h = hours.h
  LEFT JOIN paid_by_hour p ON p.h = hours.h
  ORDER BY hours.h;
END;
$function$;

-- Function to get user chart data by day (for 7/14/30 days filters)
CREATE OR REPLACE FUNCTION public.get_user_chart_data_by_day(p_days integer DEFAULT 7)
RETURNS TABLE(date_brazil text, gerados bigint, pagos bigint, valor_pago numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_brazil_today DATE;
  v_start_date DATE;
  v_user_fee_config_id UUID;
  v_fee_percentage NUMERIC;
  v_fee_fixed NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  v_brazil_today := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;
  v_start_date := v_brazil_today - (p_days - 1);
  
  SELECT value::UUID INTO v_user_fee_config_id
  FROM admin_settings
  WHERE user_id = auth.uid() AND key = 'user_fee_config'
  LIMIT 1;

  IF v_user_fee_config_id IS NOT NULL THEN
    SELECT pix_percentage, pix_fixed INTO v_fee_percentage, v_fee_fixed
    FROM fee_configs WHERE id = v_user_fee_config_id LIMIT 1;
  END IF;
  IF v_fee_percentage IS NULL THEN
    SELECT pix_percentage, pix_fixed INTO v_fee_percentage, v_fee_fixed
    FROM fee_configs WHERE is_default = true LIMIT 1;
  END IF;

  RETURN QUERY
  WITH dates AS (
    SELECT generate_series(v_start_date, v_brazil_today, '1 day'::interval)::DATE AS d
  ),
  generated_by_day AS (
    SELECT 
      (created_at AT TIME ZONE 'America/Sao_Paulo')::DATE AS d,
      COUNT(*) AS cnt
    FROM pix_transactions
    WHERE user_id = auth.uid()
      AND (created_at AT TIME ZONE 'America/Sao_Paulo')::DATE >= v_start_date
      AND (created_at AT TIME ZONE 'America/Sao_Paulo')::DATE <= v_brazil_today
    GROUP BY 1
  ),
  paid_by_day AS (
    SELECT 
      (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE AS d,
      COUNT(*) AS cnt,
      SUM(
        amount - (
          CASE 
            WHEN fee_percentage IS NOT NULL AND fee_fixed IS NOT NULL THEN
              (amount * fee_percentage / 100) + fee_fixed
            ELSE
              (amount * COALESCE(v_fee_percentage, 0) / 100) + COALESCE(v_fee_fixed, 0)
          END
        )
      ) AS valor
    FROM pix_transactions
    WHERE user_id = auth.uid()
      AND status = 'paid'
      AND paid_at IS NOT NULL
      AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE >= v_start_date
      AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE <= v_brazil_today
    GROUP BY 1
  )
  SELECT 
    TO_CHAR(dates.d, 'YYYY-MM-DD') AS date_brazil,
    COALESCE(g.cnt, 0) AS gerados,
    COALESCE(p.cnt, 0) AS pagos,
    ROUND(COALESCE(p.valor, 0), 2) AS valor_pago
  FROM dates
  LEFT JOIN generated_by_day g ON g.d = dates.d
  LEFT JOIN paid_by_day p ON p.d = dates.d
  ORDER BY dates.d;
END;
$function$;