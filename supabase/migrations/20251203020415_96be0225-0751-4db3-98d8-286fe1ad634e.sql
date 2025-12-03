-- Function to check if current user is blocked
CREATE OR REPLACE FUNCTION public.check_user_blocked()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_banned_until timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  
  SELECT banned_until INTO v_banned_until
  FROM auth.users
  WHERE id = auth.uid();
  
  RETURN v_banned_until IS NOT NULL AND v_banned_until > now();
END;
$$;