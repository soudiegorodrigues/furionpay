-- Function to get global notification settings (user_id IS NULL)
CREATE OR REPLACE FUNCTION public.get_global_notification_settings()
RETURNS TABLE(key text, value text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT s.key, s.value
  FROM public.admin_settings s
  WHERE s.user_id IS NULL
  AND s.key LIKE 'notification_%';
END;
$$;

-- Function to update global notification setting (admin only)
CREATE OR REPLACE FUNCTION public.update_global_notification_setting(setting_key text, setting_value text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing_id uuid;
BEGIN
  -- Only admins can update global settings
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can update global notification settings';
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
$$;