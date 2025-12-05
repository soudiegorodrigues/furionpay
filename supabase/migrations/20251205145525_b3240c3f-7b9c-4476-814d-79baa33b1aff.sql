-- Create a secure function to check transaction status by id (UUID)
-- This returns only the status, not sensitive data
CREATE OR REPLACE FUNCTION public.get_transaction_status_by_id(p_id uuid)
RETURNS TABLE(
  status pix_status,
  paid_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT t.status, t.paid_at
  FROM public.pix_transactions t
  WHERE t.id = p_id
  LIMIT 1;
END;
$$;