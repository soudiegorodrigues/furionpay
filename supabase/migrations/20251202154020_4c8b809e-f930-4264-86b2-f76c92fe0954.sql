-- Create admin functions that work with authenticated users

-- Function to check if current user is admin (authenticated)
CREATE OR REPLACE FUNCTION public.is_admin_authenticated()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Any authenticated user can access admin for now
  -- You can add role checking here later
  RETURN auth.uid() IS NOT NULL;
END;
$$;

-- Get admin settings for authenticated users
CREATE OR REPLACE FUNCTION public.get_admin_settings_auth()
RETURNS TABLE(key text, value text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin_authenticated() THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  RETURN QUERY SELECT s.key, s.value FROM public.admin_settings s;
END;
$$;

-- Update admin setting for authenticated users
CREATE OR REPLACE FUNCTION public.update_admin_setting_auth(setting_key text, setting_value text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin_authenticated() THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  INSERT INTO public.admin_settings (key, value, created_at, updated_at)
  VALUES (setting_key, setting_value, now(), now())
  ON CONFLICT (key) DO UPDATE
  SET value = setting_value, updated_at = now();
  
  RETURN TRUE;
END;
$$;

-- Get dashboard stats for authenticated users
CREATE OR REPLACE FUNCTION public.get_pix_dashboard_auth()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result JSON;
BEGIN
  IF NOT public.is_admin_authenticated() THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  SELECT json_build_object(
    'total_generated', (SELECT COUNT(*) FROM pix_transactions),
    'total_paid', (SELECT COUNT(*) FROM pix_transactions WHERE status = 'paid'),
    'total_expired', (SELECT COUNT(*) FROM pix_transactions WHERE status = 'expired'),
    'total_amount_generated', COALESCE((SELECT SUM(amount) FROM pix_transactions), 0),
    'total_amount_paid', COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE status = 'paid'), 0),
    'today_generated', (SELECT COUNT(*) FROM pix_transactions WHERE created_at >= CURRENT_DATE),
    'today_paid', (SELECT COUNT(*) FROM pix_transactions WHERE status = 'paid' AND paid_at >= CURRENT_DATE),
    'today_amount_paid', COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE status = 'paid' AND paid_at >= CURRENT_DATE), 0)
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Get transactions for authenticated users
CREATE OR REPLACE FUNCTION public.get_pix_transactions_auth(p_limit integer DEFAULT 50)
RETURNS TABLE(id uuid, amount numeric, status pix_status, txid text, donor_name text, created_at timestamp with time zone, paid_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin_authenticated() THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  RETURN QUERY
  SELECT t.id, t.amount, t.status, t.txid, t.donor_name, t.created_at, t.paid_at
  FROM public.pix_transactions t
  ORDER BY t.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Reset transactions for authenticated users
CREATE OR REPLACE FUNCTION public.reset_pix_transactions_auth()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin_authenticated() THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  DELETE FROM public.pix_transactions WHERE TRUE;
  
  RETURN TRUE;
END;
$$;