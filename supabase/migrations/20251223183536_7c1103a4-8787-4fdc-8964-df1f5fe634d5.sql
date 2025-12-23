-- First drop the existing function
DROP FUNCTION IF EXISTS public.get_admin_settings_auth();

-- Recreate with proper filtering for cache tokens and global settings
CREATE OR REPLACE FUNCTION public.get_admin_settings_auth()
RETURNS TABLE(key text, value text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin_authenticated() THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  RETURN QUERY
  SELECT 
    s.key,
    s.value
  FROM public.admin_settings s
  WHERE 
    -- Exclude cache tokens which are temporary and bloat the response
    s.key NOT LIKE '%_token_cache%'
    -- Return global settings (user_id IS NULL) OR user's own settings
    AND (s.user_id IS NULL OR s.user_id = auth.uid())
  ORDER BY s.key;
END;
$function$;