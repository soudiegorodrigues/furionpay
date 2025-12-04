-- Update log_pix_generated_user to include popup_model
CREATE OR REPLACE FUNCTION public.log_pix_generated_user(
  p_amount numeric, 
  p_txid text, 
  p_pix_code text, 
  p_donor_name text, 
  p_utm_data jsonb DEFAULT NULL::jsonb, 
  p_product_name text DEFAULT NULL::text, 
  p_user_id uuid DEFAULT NULL::uuid,
  p_popup_model text DEFAULT NULL::text
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.pix_transactions (amount, txid, pix_code, donor_name, status, utm_data, product_name, user_id, popup_model)
  VALUES (p_amount, p_txid, p_pix_code, p_donor_name, 'generated', p_utm_data, p_product_name, p_user_id, p_popup_model)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$function$;

-- Create function to get popup model conversion stats for a user
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
  WHERE pt.user_id = auth.uid()
  GROUP BY pt.popup_model;
END;
$function$;