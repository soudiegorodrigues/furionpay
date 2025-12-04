-- Update function to show global stats for ALL users
CREATE OR REPLACE FUNCTION public.get_popup_model_stats()
RETURNS TABLE(
  popup_model text,
  total_generated bigint,
  total_paid bigint,
  conversion_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Show global stats for ALL users so they can see which popup converts best
  RETURN QUERY
  SELECT 
    COALESCE(pt.popup_model, 'unknown') as popup_model,
    COUNT(*)::bigint as total_generated,
    COUNT(*) FILTER (WHERE pt.status = 'paid')::bigint as total_paid,
    CASE 
      WHEN COUNT(*) > 0 THEN 
        ROUND((COUNT(*) FILTER (WHERE pt.status = 'paid')::numeric / COUNT(*)::numeric) * 100, 1)
      ELSE 0
    END as conversion_rate
  FROM public.pix_transactions pt
  GROUP BY pt.popup_model;
END;
$function$;