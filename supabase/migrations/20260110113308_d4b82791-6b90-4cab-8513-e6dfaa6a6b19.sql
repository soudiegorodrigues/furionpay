
-- Dropar e recriar função get_global_dashboard_v2 para usar paid_date_brazil
DROP FUNCTION IF EXISTS public.get_global_dashboard_v2();

CREATE FUNCTION public.get_global_dashboard_v2()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_brazil_today DATE;
  v_brazil_month_start DATE;
  v_today_generated BIGINT := 0;
  v_today_paid BIGINT := 0;
  v_today_amount NUMERIC := 0;
  v_today_fees NUMERIC := 0;
  v_total_generated_count BIGINT := 0;
  v_total_paid_count BIGINT := 0;
  v_total_amount_generated NUMERIC := 0;
  v_total_amount_paid NUMERIC := 0;
  v_total_fees NUMERIC := 0;
  v_month_generated_count BIGINT := 0;
  v_month_paid_count BIGINT := 0;
  v_month_amount NUMERIC := 0;
BEGIN
  v_brazil_today := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;
  v_brazil_month_start := DATE_TRUNC('month', v_brazil_today)::DATE;

  -- HOJE: gerados por created_date_brazil
  SELECT COUNT(*)
  INTO v_today_generated
  FROM pix_transactions
  WHERE created_date_brazil = v_brazil_today;

  -- HOJE: pagos por paid_date_brazil (CORRIGIDO!)
  SELECT 
    COUNT(*),
    COALESCE(SUM(amount), 0),
    COALESCE(SUM(COALESCE(fee_fixed, 0) + (amount * COALESCE(fee_percentage, 0) / 100)), 0)
  INTO v_today_paid, v_today_amount, v_today_fees
  FROM pix_transactions
  WHERE status = 'paid'
    AND paid_date_brazil = v_brazil_today;

  -- TOTAIS (all-time)
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'paid'),
    COALESCE(SUM(amount), 0),
    COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0),
    COALESCE(SUM(COALESCE(fee_fixed, 0) + (amount * COALESCE(fee_percentage, 0) / 100)) FILTER (WHERE status = 'paid'), 0)
  INTO v_total_generated_count, v_total_paid_count, v_total_amount_generated, v_total_amount_paid, v_total_fees
  FROM pix_transactions;

  -- MÊS: pagos por paid_date_brazil (CORRIGIDO!)
  SELECT 
    COUNT(*),
    COALESCE(SUM(amount), 0)
  INTO v_month_paid_count, v_month_amount
  FROM pix_transactions
  WHERE status = 'paid'
    AND paid_date_brazil >= v_brazil_month_start;

  -- MÊS: gerados por created_date_brazil
  SELECT COUNT(*)
  INTO v_month_generated_count
  FROM pix_transactions
  WHERE created_date_brazil >= v_brazil_month_start;

  RETURN json_build_object(
    'today_generated', v_today_generated,
    'today_paid', v_today_paid,
    'today_amount_paid', v_today_amount,
    'today_fees', v_today_fees,
    'total_generated', v_total_generated_count,
    'total_paid', v_total_paid_count,
    'total_amount_generated', v_total_amount_generated,
    'total_amount_paid', v_total_amount_paid,
    'total_fees', v_total_fees,
    'month_generated', v_month_generated_count,
    'month_paid', v_month_paid_count,
    'month_amount', v_month_amount
  );
END;
$$;
