-- Update get_user_dashboard to use Brazil timezone
CREATE OR REPLACE FUNCTION public.get_user_dashboard()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSON;
  v_brazil_today DATE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get current date in Brazil timezone (America/Sao_Paulo)
  v_brazil_today := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;
  
  SELECT json_build_object(
    'total_generated', (SELECT COUNT(*) FROM pix_transactions WHERE user_id = auth.uid()),
    'total_paid', (SELECT COUNT(*) FROM pix_transactions WHERE user_id = auth.uid() AND status = 'paid'),
    'total_expired', (SELECT COUNT(*) FROM pix_transactions WHERE user_id = auth.uid() AND status = 'expired'),
    'total_amount_generated', COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE user_id = auth.uid()), 0),
    'total_amount_paid', COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE user_id = auth.uid() AND status = 'paid'), 0),
    'today_generated', (SELECT COUNT(*) FROM pix_transactions WHERE user_id = auth.uid() AND (created_at AT TIME ZONE 'America/Sao_Paulo')::DATE = v_brazil_today),
    'today_paid', (SELECT COUNT(*) FROM pix_transactions WHERE user_id = auth.uid() AND status = 'paid' AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE = v_brazil_today),
    'today_amount_paid', COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE user_id = auth.uid() AND status = 'paid' AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE = v_brazil_today), 0)
  ) INTO v_result;
  
  RETURN v_result;
END;
$function$;