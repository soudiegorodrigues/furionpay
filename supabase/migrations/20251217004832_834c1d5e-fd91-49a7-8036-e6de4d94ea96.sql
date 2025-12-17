-- Primeiro remove a função existente
DROP FUNCTION IF EXISTS get_user_transactions(integer);

-- Recria com o limite alto
CREATE OR REPLACE FUNCTION get_user_transactions(p_limit integer DEFAULT 0)
RETURNS TABLE (
  id uuid,
  amount numeric,
  status text,
  txid text,
  donor_name text,
  product_name text,
  created_at timestamptz,
  paid_at timestamptz,
  fee_percentage numeric,
  fee_fixed numeric,
  utm_data jsonb,
  popup_model text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Se p_limit for 0 ou NULL, usa limite alto (100000) para evitar limite default do Supabase de 1000
  IF p_limit IS NULL OR p_limit = 0 THEN
    RETURN QUERY
    SELECT t.id, t.amount, t.status::text, t.txid, t.donor_name, t.product_name, t.created_at, t.paid_at, t.fee_percentage, t.fee_fixed, t.utm_data, t.popup_model
    FROM public.pix_transactions t
    WHERE t.user_id = auth.uid()
    ORDER BY t.created_at DESC
    LIMIT 100000;
  ELSE
    RETURN QUERY
    SELECT t.id, t.amount, t.status::text, t.txid, t.donor_name, t.product_name, t.created_at, t.paid_at, t.fee_percentage, t.fee_fixed, t.utm_data, t.popup_model
    FROM public.pix_transactions t
    WHERE t.user_id = auth.uid()
    ORDER BY t.created_at DESC
    LIMIT p_limit;
  END IF;
END;
$$;