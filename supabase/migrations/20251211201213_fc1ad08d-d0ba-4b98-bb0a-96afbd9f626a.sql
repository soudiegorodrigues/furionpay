-- Fix update_admin_setting_auth to handle composite unique constraint properly
CREATE OR REPLACE FUNCTION public.update_admin_setting_auth(setting_key text, setting_value text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_existing_id uuid;
BEGIN
  IF NOT public.is_admin_authenticated() THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Check if setting exists (global setting with NULL user_id)
  SELECT id INTO v_existing_id 
  FROM public.admin_settings 
  WHERE key = setting_key AND user_id IS NULL;
  
  IF v_existing_id IS NOT NULL THEN
    -- Update existing
    UPDATE public.admin_settings 
    SET value = setting_value, updated_at = now()
    WHERE id = v_existing_id;
  ELSE
    -- Insert new
    INSERT INTO public.admin_settings (key, value, user_id, created_at, updated_at)
    VALUES (setting_key, setting_value, NULL, now(), now());
  END IF;
  
  RETURN TRUE;
END;
$function$;