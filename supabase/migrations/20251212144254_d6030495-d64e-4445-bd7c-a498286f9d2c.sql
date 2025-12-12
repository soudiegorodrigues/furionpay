-- Update get_user_dashboard to return net amounts (after fee deduction)
CREATE OR REPLACE FUNCTION public.get_user_dashboard()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSON;
  v_brazil_today DATE;
  v_fee_config RECORD;
  v_total_fees NUMERIC;
  v_today_fees NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get current date in Brazil timezone (America/Sao_Paulo)
  v_brazil_today := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;
  
  -- Get default fee config
  SELECT pix_percentage, pix_fixed INTO v_fee_config
  FROM public.fee_configs
  WHERE is_default = true
  LIMIT 1;
  
  -- Calculate total fees for all paid transactions
  IF v_fee_config IS NOT NULL THEN
    SELECT COALESCE(
      SUM((amount * v_fee_config.pix_percentage / 100) + v_fee_config.pix_fixed), 0
    ) INTO v_total_fees
    FROM pix_transactions
    WHERE user_id = auth.uid() AND status = 'paid';
    
    -- Calculate today's fees
    SELECT COALESCE(
      SUM((amount * v_fee_config.pix_percentage / 100) + v_fee_config.pix_fixed), 0
    ) INTO v_today_fees
    FROM pix_transactions
    WHERE user_id = auth.uid() AND status = 'paid' 
    AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE = v_brazil_today;
  ELSE
    v_total_fees := 0;
    v_today_fees := 0;
  END IF;
  
  SELECT json_build_object(
    'total_generated', (SELECT COUNT(*) FROM pix_transactions WHERE user_id = auth.uid()),
    'total_paid', (SELECT COUNT(*) FROM pix_transactions WHERE user_id = auth.uid() AND status = 'paid'),
    'total_expired', (SELECT COUNT(*) FROM pix_transactions WHERE user_id = auth.uid() AND status = 'expired'),
    'total_amount_generated', COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE user_id = auth.uid()), 0),
    'total_amount_paid', ROUND(COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE user_id = auth.uid() AND status = 'paid'), 0) - v_total_fees, 2),
    'today_generated', (SELECT COUNT(*) FROM pix_transactions WHERE user_id = auth.uid() AND (created_at AT TIME ZONE 'America/Sao_Paulo')::DATE = v_brazil_today),
    'today_paid', (SELECT COUNT(*) FROM pix_transactions WHERE user_id = auth.uid() AND status = 'paid' AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE = v_brazil_today),
    'today_amount_paid', ROUND(COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE user_id = auth.uid() AND status = 'paid' AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE = v_brazil_today), 0) - v_today_fees, 2),
    'total_fees', ROUND(v_total_fees, 2),
    'today_fees', ROUND(v_today_fees, 2)
  ) INTO v_result;
  
  RETURN v_result;
END;
$function$;