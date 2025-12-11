-- Function to check if user is approved
CREATE OR REPLACE FUNCTION public.check_user_approved()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN COALESCE(
    (SELECT is_approved FROM public.profiles WHERE id = auth.uid()),
    false
  );
END;
$$;

-- Function to approve a user (admin only)
CREATE OR REPLACE FUNCTION public.approve_user(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can approve users
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can approve users';
  END IF;
  
  UPDATE public.profiles
  SET is_approved = true, updated_at = now()
  WHERE id = target_user_id;
  
  RETURN FOUND;
END;
$$;

-- Function to revoke user approval (admin only)
CREATE OR REPLACE FUNCTION public.revoke_user_approval(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can revoke approval
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can revoke user approval';
  END IF;
  
  UPDATE public.profiles
  SET is_approved = false, updated_at = now()
  WHERE id = target_user_id;
  
  RETURN FOUND;
END;
$$;