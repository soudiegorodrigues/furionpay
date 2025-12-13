-- Drop and recreate get_pix_transactions_auth function to include utm_data
DROP FUNCTION IF EXISTS public.get_pix_transactions_auth(integer);

CREATE OR REPLACE FUNCTION public.get_pix_transactions_auth(p_limit integer DEFAULT 1000)
RETURNS TABLE(
  amount numeric,
  created_at timestamp with time zone,
  donor_name text,
  id uuid,
  paid_at timestamp with time zone,
  product_name text,
  status pix_status,
  txid text,
  user_email text,
  fee_percentage numeric,
  fee_fixed numeric,
  utm_data jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    pt.amount,
    pt.created_at,
    pt.donor_name,
    pt.id,
    pt.paid_at,
    pt.product_name,
    pt.status,
    pt.txid,
    u.email::text as user_email,
    pt.fee_percentage,
    pt.fee_fixed,
    pt.utm_data
  FROM pix_transactions pt
  LEFT JOIN auth.users u ON u.id = pt.user_id
  ORDER BY pt.created_at DESC
  LIMIT p_limit;
END;
$$;