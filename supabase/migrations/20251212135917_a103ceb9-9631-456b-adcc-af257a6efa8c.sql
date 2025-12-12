-- Create function to get all withdrawals with user emails for admins
CREATE OR REPLACE FUNCTION public.get_all_withdrawals_admin(p_limit integer DEFAULT 100)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  user_email text,
  amount numeric,
  bank_code text,
  bank_name text,
  pix_key_type text,
  pix_key text,
  status withdrawal_status,
  created_at timestamp with time zone,
  processed_at timestamp with time zone,
  rejection_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can view all withdrawals';
  END IF;

  RETURN QUERY
  SELECT 
    wr.id,
    wr.user_id,
    u.email::text as user_email,
    wr.amount,
    wr.bank_code,
    wr.bank_name,
    wr.pix_key_type,
    wr.pix_key,
    wr.status,
    wr.created_at,
    wr.processed_at,
    wr.rejection_reason
  FROM withdrawal_requests wr
  JOIN auth.users u ON u.id = wr.user_id
  ORDER BY wr.created_at DESC
  LIMIT p_limit;
END;
$$;