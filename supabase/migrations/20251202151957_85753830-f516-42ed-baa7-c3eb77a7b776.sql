-- Create function to reset all pix transactions (admin only)
CREATE OR REPLACE FUNCTION public.reset_pix_transactions(input_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.validate_admin_token(input_token) THEN
    RAISE EXCEPTION 'Invalid admin token';
  END IF;
  
  DELETE FROM public.pix_transactions;
  
  RETURN TRUE;
END;
$$;