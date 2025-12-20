CREATE OR REPLACE FUNCTION public.get_user_transactions(
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  amount numeric,
  status public.pix_status,
  created_at timestamp with time zone,
  paid_at timestamp with time zone,
  donor_name text,
  txid text,
  product_name text,
  fee_fixed numeric,
  fee_percentage numeric,
  acquirer text,
  utm_data jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_effective_owner_id uuid;
BEGIN
  -- Get effective owner (for collaborators)
  SELECT get_effective_owner_id(auth.uid()) INTO v_effective_owner_id;
  
  RETURN QUERY
  SELECT 
    pt.id,
    pt.amount,
    pt.status,
    pt.created_at,
    pt.paid_at,
    pt.donor_name,
    pt.txid,
    pt.product_name,
    pt.fee_fixed,
    pt.fee_percentage,
    pt.acquirer,
    pt.utm_data
  FROM pix_transactions pt
  WHERE pt.user_id = v_effective_owner_id
  ORDER BY pt.created_at DESC
  LIMIT CASE WHEN p_limit = 0 THEN NULL ELSE p_limit END
  OFFSET p_offset;
END;
$$;