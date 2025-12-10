
-- Update reset_user_transactions to preserve user configurations
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
  
  -- Reset profile name only (not the entire profile)
  UPDATE public.profiles 
  SET full_name = NULL, updated_at = now()
  WHERE id = auth.uid();
  
  -- DO NOT delete admin_settings - preserve user configurations like:
  -- user_acquirer, meta_pixels, spedpay_api_key, dashboard_banner_url, etc.
  
  RETURN TRUE;
END;
$function$;
