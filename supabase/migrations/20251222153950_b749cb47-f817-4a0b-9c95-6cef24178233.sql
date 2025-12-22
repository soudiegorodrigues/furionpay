-- Promover o primeiro admin (você) para super_admin
UPDATE public.user_roles 
SET role = 'super_admin' 
WHERE user_id = '998f5350-d1af-4538-91c7-74976a6bd4c7' AND role = 'admin';

-- Criar função para verificar se é admin ou super_admin
CREATE OR REPLACE FUNCTION public.is_any_admin(_user_id uuid) 
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'super_admin')
  )
$$;

-- Atualizar função delete_user com proteção total
CREATE OR REPLACE FUNCTION public.delete_user(target_user_id uuid) 
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only admins or super_admins can delete users
  IF NOT public.is_any_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;
  
  -- Cannot delete yourself
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete yourself';
  END IF;
  
  -- SUPER ADMIN PROTECTION: Nobody can delete super_admin
  IF public.has_role(target_user_id, 'super_admin') THEN
    RAISE EXCEPTION 'Cannot delete the super administrator';
  END IF;
  
  -- Only super_admin can delete other admins
  IF public.has_role(target_user_id, 'admin') AND NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Only the super administrator can delete other administrators';
  END IF;
  
  DELETE FROM auth.users WHERE id = target_user_id;
  
  RETURN FOUND;
END;
$$;

-- Atualizar função revoke_admin_role com proteção
CREATE OR REPLACE FUNCTION public.revoke_admin_role(target_user_id uuid) 
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only super_admin can revoke admin roles
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Only the super administrator can revoke admin roles';
  END IF;
  
  -- Cannot revoke super_admin role
  IF public.has_role(target_user_id, 'super_admin') THEN
    RAISE EXCEPTION 'Cannot revoke super administrator role';
  END IF;
  
  DELETE FROM public.user_roles 
  WHERE user_id = target_user_id AND role = 'admin';
  
  RETURN FOUND;
END;
$$;

-- Atualizar função block_user para proteger super_admin
CREATE OR REPLACE FUNCTION public.block_user(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only admins can block users
  IF NOT public.is_any_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can block users';
  END IF;
  
  -- Cannot block yourself
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot block yourself';
  END IF;
  
  -- SUPER ADMIN PROTECTION: Nobody can block super_admin
  IF public.has_role(target_user_id, 'super_admin') THEN
    RAISE EXCEPTION 'Cannot block the super administrator';
  END IF;
  
  -- Only super_admin can block other admins
  IF public.has_role(target_user_id, 'admin') AND NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Only the super administrator can block other administrators';
  END IF;
  
  UPDATE auth.users
  SET banned_until = '2999-12-31'::timestamptz
  WHERE id = target_user_id;
  
  RETURN FOUND;
END;
$$;

-- Atualizar função is_admin_authenticated para incluir super_admin
CREATE OR REPLACE FUNCTION public.is_admin_authenticated()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
  )
$$;