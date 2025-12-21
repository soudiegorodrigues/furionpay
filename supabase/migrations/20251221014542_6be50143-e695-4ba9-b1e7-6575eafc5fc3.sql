-- Create function to get global banner URL (accessible to all users)
CREATE OR REPLACE FUNCTION public.get_global_banner_url()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  banner_url text;
BEGIN
  SELECT value INTO banner_url 
  FROM admin_settings 
  WHERE key = 'global_dashboard_banner_url' 
    AND user_id IS NULL
  LIMIT 1;
  
  RETURN banner_url;
END;
$$;

-- Grant execute to authenticated users so everyone can read the banner
GRANT EXECUTE ON FUNCTION public.get_global_banner_url() TO authenticated;