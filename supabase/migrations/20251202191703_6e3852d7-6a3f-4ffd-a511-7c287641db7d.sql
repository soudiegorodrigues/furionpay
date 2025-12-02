-- 1. Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- 3. Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Create restrictive policy - no direct access
CREATE POLICY "Deny all direct access to user_roles"
ON public.user_roles
AS RESTRICTIVE
FOR ALL
USING (false);

-- 5. Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 6. Update is_admin_authenticated to check for admin role
CREATE OR REPLACE FUNCTION public.is_admin_authenticated()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN public.has_role(auth.uid(), 'admin');
END;
$function$;

-- 7. Function to grant admin role (only callable by existing admins or service role)
CREATE OR REPLACE FUNCTION public.grant_admin_role(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Only existing admins can grant admin role
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can grant admin role';
  END IF;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN TRUE;
END;
$function$;