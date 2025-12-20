-- Add bypass_antifraud column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bypass_antifraud BOOLEAN DEFAULT false;

-- Create function to toggle user antifraud bypass (admin only)
CREATE OR REPLACE FUNCTION public.set_user_antifraud_bypass(p_user_id uuid, p_bypass boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can set bypass
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can set antifraud bypass';
  END IF;
  
  UPDATE public.profiles
  SET bypass_antifraud = p_bypass, updated_at = now()
  WHERE id = p_user_id;
  
  RETURN FOUND;
END;
$$;

-- Create function to check if current user has antifraud bypass
CREATE OR REPLACE FUNCTION public.check_antifraud_bypass(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (SELECT bypass_antifraud FROM public.profiles WHERE id = p_user_id),
    false
  );
END;
$$;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.bypass_antifraud IS 'When true, user bypasses all antifraud checks (fingerprint/IP) when generating PIX';