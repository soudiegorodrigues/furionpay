
-- Atualizar função get_user_dashboard para incluir month_paid e month_amount_paid
CREATE OR REPLACE FUNCTION public.get_user_dashboard()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSON;
  v_brazil_today DATE;
  v_brazil_month_start DATE;
  v_user_fee_config_id UUID;
  v_fee_config RECORD;
  v_total_fees NUMERIC;
  v_today_fees NUMERIC;
  v_month_fees NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get current date in Brazil timezone (America/Sao_Paulo)
  v_brazil_today := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;
  v_brazil_month_start := DATE_TRUNC('month', NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;
  
  -- Get user's specific fee config from admin_settings
  SELECT value::UUID INTO v_user_fee_config_id
  FROM admin_settings
  WHERE user_id = auth.uid() AND key = 'user_fee_config'
  LIMIT 1;

  -- Get fee config (user-specific or default)
  IF v_user_fee_config_id IS NOT NULL THEN
    SELECT pix_percentage, pix_fixed INTO v_fee_config
    FROM public.fee_configs
    WHERE id = v_user_fee_config_id
    LIMIT 1;
  END IF;

  -- Fallback to default fee config
  IF v_fee_config IS NULL THEN
    SELECT pix_percentage, pix_fixed INTO v_fee_config
    FROM public.fee_configs
    WHERE is_default = true
    LIMIT 1;
  END IF;
  
  -- Calculate total fees using stored fees first, then fallback
  SELECT COALESCE(
    SUM(
      CASE 
        WHEN fee_percentage IS NOT NULL AND fee_fixed IS NOT NULL THEN
          (amount * fee_percentage / 100) + fee_fixed
        WHEN v_fee_config IS NOT NULL THEN
          (amount * v_fee_config.pix_percentage / 100) + v_fee_config.pix_fixed
        ELSE
          0
      END
    ), 0
  ) INTO v_total_fees
  FROM pix_transactions
  WHERE user_id = auth.uid() AND status = 'paid';
  
  -- Calculate today's fees
  SELECT COALESCE(
    SUM(
      CASE 
        WHEN fee_percentage IS NOT NULL AND fee_fixed IS NOT NULL THEN
          (amount * fee_percentage / 100) + fee_fixed
        WHEN v_fee_config IS NOT NULL THEN
          (amount * v_fee_config.pix_percentage / 100) + v_fee_config.pix_fixed
        ELSE
          0
      END
    ), 0
  ) INTO v_today_fees
  FROM pix_transactions
  WHERE user_id = auth.uid() AND status = 'paid' 
  AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE = v_brazil_today;
  
  -- Calculate month's fees
  SELECT COALESCE(
    SUM(
      CASE 
        WHEN fee_percentage IS NOT NULL AND fee_fixed IS NOT NULL THEN
          (amount * fee_percentage / 100) + fee_fixed
        WHEN v_fee_config IS NOT NULL THEN
          (amount * v_fee_config.pix_percentage / 100) + v_fee_config.pix_fixed
        ELSE
          0
      END
    ), 0
  ) INTO v_month_fees
  FROM pix_transactions
  WHERE user_id = auth.uid() AND status = 'paid' 
  AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE >= v_brazil_month_start;
  
  SELECT json_build_object(
    'total_generated', (SELECT COUNT(*) FROM pix_transactions WHERE user_id = auth.uid()),
    'total_paid', (SELECT COUNT(*) FROM pix_transactions WHERE user_id = auth.uid() AND status = 'paid'),
    'total_expired', (SELECT COUNT(*) FROM pix_transactions WHERE user_id = auth.uid() AND status = 'expired'),
    'total_amount_generated', COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE user_id = auth.uid()), 0),
    'total_amount_paid', ROUND(COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE user_id = auth.uid() AND status = 'paid'), 0) - v_total_fees, 2),
    'today_generated', (SELECT COUNT(*) FROM pix_transactions WHERE user_id = auth.uid() AND (created_at AT TIME ZONE 'America/Sao_Paulo')::DATE = v_brazil_today),
    'today_paid', (SELECT COUNT(*) FROM pix_transactions WHERE user_id = auth.uid() AND status = 'paid' AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE = v_brazil_today),
    'today_amount_paid', ROUND(COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE user_id = auth.uid() AND status = 'paid' AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE = v_brazil_today), 0) - v_today_fees, 2),
    'month_paid', (SELECT COUNT(*) FROM pix_transactions WHERE user_id = auth.uid() AND status = 'paid' AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE >= v_brazil_month_start),
    'month_amount_paid', ROUND(COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE user_id = auth.uid() AND status = 'paid' AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE >= v_brazil_month_start), 0) - v_month_fees, 2),
    'total_fees', ROUND(v_total_fees, 2),
    'today_fees', ROUND(v_today_fees, 2)
  ) INTO v_result;
  
  RETURN v_result;
END;
$function$;
