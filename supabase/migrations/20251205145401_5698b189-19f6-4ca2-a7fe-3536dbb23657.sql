-- Remove the public policy that exposes all transactions
DROP POLICY IF EXISTS "Anyone can view transaction by txid" ON public.pix_transactions;

-- Create a secure function to check transaction status by txid only
-- This returns only the necessary fields, not all sensitive data
CREATE OR REPLACE FUNCTION public.get_transaction_status_by_txid(p_txid text)
RETURNS TABLE(
  status pix_status,
  amount numeric,
  paid_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT t.status, t.amount, t.paid_at
  FROM public.pix_transactions t
  WHERE t.txid = p_txid
  LIMIT 1;
END;
$$;