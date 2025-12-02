-- Create a bootstrap function that can be called once to set up the first admin
-- This uses service role and should be removed after first use
CREATE OR REPLACE FUNCTION public.bootstrap_first_admin(admin_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  target_user_id UUID;
BEGIN
  -- Check if any admin already exists
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    RAISE EXCEPTION 'Admin already exists. Use grant_admin_role instead.';
  END IF;
  
  -- Find user by email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = admin_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', admin_email;
  END IF;
  
  -- Grant admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin');
  
  RETURN TRUE;
END;
$function$;