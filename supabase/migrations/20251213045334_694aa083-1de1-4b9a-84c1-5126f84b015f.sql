-- Drop and recreate get_user_transactions to include utm_data and popup_model
DROP FUNCTION IF EXISTS public.get_user_transactions(integer);

CREATE FUNCTION public.get_user_transactions(p_limit integer DEFAULT 50)
 RETURNS TABLE(id uuid, amount numeric, status pix_status, txid text, donor_name text, product_name text, created_at timestamp with time zone, paid_at timestamp with time zone, fee_percentage numeric, fee_fixed numeric, utm_data jsonb, popup_model text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  RETURN QUERY
  SELECT t.id, t.amount, t.status, t.txid, t.donor_name, t.product_name, t.created_at, t.paid_at, t.fee_percentage, t.fee_fixed, t.utm_data, t.popup_model
  FROM public.pix_transactions t
  WHERE t.user_id = auth.uid()
  ORDER BY t.created_at DESC
  LIMIT p_limit;
END;
$function$;