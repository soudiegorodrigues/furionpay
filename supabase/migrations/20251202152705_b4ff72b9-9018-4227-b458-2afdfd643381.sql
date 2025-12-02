-- Fix the reset function to include WHERE clause (PostgREST requirement)
CREATE OR REPLACE FUNCTION public.reset_pix_transactions(input_token text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.validate_admin_token(input_token) THEN
    RAISE EXCEPTION 'Invalid admin token';
  END IF;
  
  -- Use WHERE TRUE to satisfy PostgREST requirement
  DELETE FROM public.pix_transactions WHERE TRUE;
  
  RETURN TRUE;
END;
$function$;