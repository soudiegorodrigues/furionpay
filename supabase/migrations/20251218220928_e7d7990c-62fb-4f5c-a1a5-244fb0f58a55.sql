-- Corrigir a função get_popup_model_stats para agrupar NULL como 'unknown'
CREATE OR REPLACE FUNCTION public.get_popup_model_stats()
RETURNS TABLE(popup_model text, total_generated bigint, total_paid bigint, conversion_rate numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
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
  GROUP BY COALESCE(pt.popup_model, 'unknown');
END;
$$;