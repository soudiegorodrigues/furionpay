-- Drop and recreate the function with UPSERT logic
CREATE OR REPLACE FUNCTION public.update_admin_setting(input_token text, setting_key text, setting_value text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.validate_admin_token(input_token) THEN
    RAISE EXCEPTION 'Invalid admin token';
  END IF;
  
  -- Use UPSERT to insert or update
  INSERT INTO public.admin_settings (key, value, created_at, updated_at)
  VALUES (setting_key, setting_value, now(), now())
  ON CONFLICT (key) DO UPDATE
  SET value = setting_value, updated_at = now();
  
  RETURN TRUE;
END;
$function$;