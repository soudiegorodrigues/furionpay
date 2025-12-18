-- Dropar função existente e recriar com campo acquirer
DROP FUNCTION IF EXISTS public.get_user_transactions(integer);

CREATE OR REPLACE FUNCTION public.get_user_transactions(p_limit integer DEFAULT 0)
RETURNS TABLE(
  id uuid, 
  amount numeric, 
  status text, 
  txid text, 
  donor_name text, 
  product_name text, 
  created_at timestamp with time zone, 
  paid_at timestamp with time zone, 
  fee_percentage numeric, 
  fee_fixed numeric, 
  utm_data jsonb, 
  popup_model text,
  acquirer text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_effective_owner_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_effective_owner_id := public.get_effective_owner_id(auth.uid());

  IF p_limit IS NULL OR p_limit = 0 THEN
    RETURN QUERY
    SELECT t.id, t.amount, t.status::text, t.txid, t.donor_name, t.product_name, t.created_at, t.paid_at, t.fee_percentage, t.fee_fixed, t.utm_data, t.popup_model, t.acquirer
    FROM public.pix_transactions t
    WHERE t.user_id = v_effective_owner_id
    ORDER BY t.created_at DESC
    LIMIT 100000;
  ELSE
    RETURN QUERY
    SELECT t.id, t.amount, t.status::text, t.txid, t.donor_name, t.product_name, t.created_at, t.paid_at, t.fee_percentage, t.fee_fixed, t.utm_data, t.popup_model, t.acquirer
    FROM public.pix_transactions t
    WHERE t.user_id = v_effective_owner_id
    ORDER BY t.created_at DESC
    LIMIT p_limit;
  END IF;
END;
$function$;