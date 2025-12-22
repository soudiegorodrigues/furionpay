-- Atualizar has_role para reconhecer super_admin como tendo todas as permissões de admin
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (
        role = _role 
        OR (
          -- super_admin tem todas as permissões de admin
          _role = 'admin' AND role = 'super_admin'
        )
      )
  )
$$;