-- Drop and recreate the function with Brazil timezone
CREATE OR REPLACE FUNCTION public.get_pix_dashboard_auth() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
AS $$
DECLARE
  v_result JSON;
  v_brazil_today DATE;
BEGIN
  IF NOT public.is_admin_authenticated() THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get current date in Brazil timezone (America/Sao_Paulo)
  v_brazil_today := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;
  
  SELECT json_build_object(
    'total_generated', (SELECT COUNT(*) FROM pix_transactions),
    'total_paid', (SELECT COUNT(*) FROM pix_transactions WHERE status = 'paid'),
    'total_expired', (SELECT COUNT(*) FROM pix_transactions WHERE status = 'expired'),
    'total_amount_generated', COALESCE((SELECT SUM(amount) FROM pix_transactions), 0),
    'total_amount_paid', COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE status = 'paid'), 0),
    'today_generated', (SELECT COUNT(*) FROM pix_transactions WHERE (created_at AT TIME ZONE 'America/Sao_Paulo')::DATE = v_brazil_today),
    'today_paid', (SELECT COUNT(*) FROM pix_transactions WHERE status = 'paid' AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE = v_brazil_today),
    'today_amount_paid', COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE status = 'paid' AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::DATE = v_brazil_today), 0)
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;