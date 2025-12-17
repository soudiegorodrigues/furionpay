-- Drop and recreate the function with pagination support
DROP FUNCTION IF EXISTS get_pix_transactions_auth(integer);

CREATE OR REPLACE FUNCTION get_pix_transactions_auth(
  p_limit integer DEFAULT 1000,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  amount numeric,
  created_at timestamptz,
  donor_name text,
  id uuid,
  paid_at timestamptz,
  product_name text,
  status pix_status,
  txid text,
  user_email text,
  fee_percentage numeric,
  fee_fixed numeric,
  utm_data jsonb,
  acquirer text
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

  -- If p_limit is 0 or NULL, return all rows (no limit)
  IF p_limit IS NULL OR p_limit = 0 THEN
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
      pt.utm_data,
      pt.acquirer
    FROM pix_transactions pt
    LEFT JOIN auth.users u ON u.id = pt.user_id
    ORDER BY pt.created_at DESC
    OFFSET p_offset;
  ELSE
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
      pt.utm_data,
      pt.acquirer
    FROM pix_transactions pt
    LEFT JOIN auth.users u ON u.id = pt.user_id
    ORDER BY pt.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
  END IF;
END;
$$;

-- Create a function to get total count
CREATE OR REPLACE FUNCTION get_pix_transactions_count()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN (SELECT COUNT(*) FROM pix_transactions);
END;
$$;