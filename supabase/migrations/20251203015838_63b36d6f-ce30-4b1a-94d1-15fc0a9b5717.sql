-- Function to block a user (set banned_until to far future)
CREATE OR REPLACE FUNCTION public.block_user(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can block users
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can block users';
  END IF;
  
  -- Cannot block yourself
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot block yourself';
  END IF;
  
  -- Update banned_until in auth.users
  UPDATE auth.users
  SET banned_until = '2999-12-31 23:59:59'::timestamptz
  WHERE id = target_user_id;
  
  RETURN FOUND;
END;
$$;

-- Function to unblock a user
CREATE OR REPLACE FUNCTION public.unblock_user(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can unblock users
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can unblock users';
  END IF;
  
  -- Update banned_until to null
  UPDATE auth.users
  SET banned_until = NULL
  WHERE id = target_user_id;
  
  RETURN FOUND;
END;
$$;

-- Function to delete a user
CREATE OR REPLACE FUNCTION public.delete_user(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can delete users
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;
  
  -- Cannot delete yourself
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete yourself';
  END IF;
  
  -- Delete from auth.users (will cascade to user_roles, admin_settings, etc.)
  DELETE FROM auth.users WHERE id = target_user_id;
  
  RETURN FOUND;
END;
$$;