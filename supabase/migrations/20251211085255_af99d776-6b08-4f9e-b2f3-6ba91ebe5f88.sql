
CREATE OR REPLACE FUNCTION public.reset_user_transactions()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Only reset transactions - set user_id to NULL so admin can still see them
  -- but user's dashboard shows empty (no transactions with their user_id)
  UPDATE public.pix_transactions 
  SET user_id = NULL 
  WHERE user_id = auth.uid();
  
  -- DO NOT reset profile name - keep it as user requested
  -- DO NOT delete admin_settings - preserve user configurations
  
  RETURN TRUE;
END;
$function$;
