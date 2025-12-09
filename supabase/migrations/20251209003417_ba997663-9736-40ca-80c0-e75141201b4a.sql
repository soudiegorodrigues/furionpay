
-- Drop the old function first
DROP FUNCTION IF EXISTS public.get_pix_transactions_auth(integer);

-- Recreate with new return type including user_email
CREATE OR REPLACE FUNCTION public.get_pix_transactions_auth(p_limit integer DEFAULT 100)
RETURNS TABLE(
  amount numeric,
  created_at timestamp with time zone,
  donor_name text,
  id uuid,
  paid_at timestamp with time zone,
  product_name text,
  status pix_status,
  txid text,
  user_email text
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
    u.email::text as user_email
  FROM pix_transactions pt
  LEFT JOIN auth.users u ON u.id = pt.user_id
  ORDER BY pt.created_at DESC
  LIMIT p_limit;
END;
$$;
