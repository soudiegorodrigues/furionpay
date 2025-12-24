-- 1. Drop existing function to change return type
DROP FUNCTION IF EXISTS public.get_all_withdrawals_admin(integer);

-- 2. Create updated function with gross_amount, fee_percentage, fee_fixed
CREATE OR REPLACE FUNCTION public.get_all_withdrawals_admin(p_limit integer DEFAULT 100)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  user_email text,
  amount numeric,
  gross_amount numeric,
  fee_percentage numeric,
  fee_fixed numeric,
  bank_code text,
  bank_name text,
  pix_key_type text,
  pix_key text,
  status withdrawal_status,
  created_at timestamptz,
  processed_at timestamptz,
  rejection_reason text
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
    w.id,
    w.user_id,
    u.email::text as user_email,
    w.amount,
    w.gross_amount,
    w.fee_percentage,
    w.fee_fixed,
    w.bank_code,
    w.bank_name,
    w.pix_key_type,
    w.pix_key,
    w.status,
    w.created_at,
    w.processed_at,
    w.rejection_reason
  FROM withdrawal_requests w
  LEFT JOIN auth.users u ON w.user_id = u.id
  ORDER BY w.created_at DESC
  LIMIT p_limit;
END;
$$;

-- 3. HARDENING: Remove the direct INSERT policy and force users to use the RPC
DROP POLICY IF EXISTS "Users can create their own withdrawals" ON withdrawal_requests;

-- Create a restrictive policy that blocks direct INSERT
CREATE POLICY "Block direct insert - use RPC only"
ON withdrawal_requests
FOR INSERT
WITH CHECK (false);