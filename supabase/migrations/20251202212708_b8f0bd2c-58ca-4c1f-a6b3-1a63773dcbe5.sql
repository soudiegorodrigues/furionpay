-- Function to list all users (admin only)
CREATE OR REPLACE FUNCTION public.get_all_users_auth()
RETURNS TABLE(
  id uuid,
  email text,
  created_at timestamp with time zone,
  last_sign_in_at timestamp with time zone,
  is_admin boolean
)
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
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id AND ur.role = 'admin') as is_admin
  FROM auth.users u
  ORDER BY u.created_at DESC;
END;
$$;

-- Function to revoke admin role
CREATE OR REPLACE FUNCTION public.revoke_admin_role(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only existing admins can revoke admin role
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can revoke admin role';
  END IF;
  
  -- Prevent self-revocation
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot revoke your own admin role';
  END IF;
  
  DELETE FROM public.user_roles
  WHERE user_id = target_user_id AND role = 'admin';
  
  RETURN TRUE;
END;
$$;