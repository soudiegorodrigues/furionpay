-- Drop and recreate get_pix_transactions_auth with product_name
DROP FUNCTION IF EXISTS public.get_pix_transactions_auth(integer);

CREATE FUNCTION public.get_pix_transactions_auth(p_limit integer DEFAULT 50)
 RETURNS TABLE(id uuid, amount numeric, status pix_status, txid text, donor_name text, product_name text, created_at timestamp with time zone, paid_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin_authenticated() THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  RETURN QUERY
  SELECT t.id, t.amount, t.status, t.txid, t.donor_name, t.product_name, t.created_at, t.paid_at
  FROM public.pix_transactions t
  ORDER BY t.created_at DESC
  LIMIT p_limit;
END;
$function$;

-- Update log_pix_generated to accept product_name (this one can be overloaded)
CREATE OR REPLACE FUNCTION public.log_pix_generated(p_amount numeric, p_txid text, p_pix_code text, p_donor_name text, p_utm_data jsonb DEFAULT NULL::jsonb, p_product_name text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.pix_transactions (amount, txid, pix_code, donor_name, status, utm_data, product_name)
  VALUES (p_amount, p_txid, p_pix_code, p_donor_name, 'generated', p_utm_data, p_product_name)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$function$;