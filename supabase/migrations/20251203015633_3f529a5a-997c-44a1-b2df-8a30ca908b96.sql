-- Drop existing function to change return type
DROP FUNCTION IF EXISTS public.get_all_users_auth();

-- Recreate with is_blocked column
CREATE OR REPLACE FUNCTION public.get_all_users_auth()
RETURNS TABLE(id uuid, email text, created_at timestamp with time zone, last_sign_in_at timestamp with time zone, is_admin boolean, is_blocked boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin_authenticated() THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  RETURN QUERY
  SELECT 
    u.id,
    u.email::text,
    u.created_at,
    u.last_sign_in_at,
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id AND ur.role = 'admin') as is_admin,
    (u.banned_until IS NOT NULL AND u.banned_until > now()) as is_blocked
  FROM auth.users u
  ORDER BY u.created_at DESC;
END;
$$;