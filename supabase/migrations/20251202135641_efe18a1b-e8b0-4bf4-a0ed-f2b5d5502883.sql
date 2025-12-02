-- Create enum for transaction status
CREATE TYPE public.pix_status AS ENUM ('generated', 'paid', 'expired');

-- Create transactions table
CREATE TABLE public.pix_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount DECIMAL(10,2) NOT NULL,
  status pix_status NOT NULL DEFAULT 'generated',
  txid TEXT,
  pix_code TEXT,
  donor_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  paid_at TIMESTAMP WITH TIME ZONE,
  expired_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.pix_transactions ENABLE ROW LEVEL SECURITY;

-- Deny all direct access (only via functions)
CREATE POLICY "Deny all direct access to pix_transactions"
ON public.pix_transactions
AS RESTRICTIVE
FOR ALL
USING (false);

-- Function to log PIX generation (called from edge function)
CREATE OR REPLACE FUNCTION public.log_pix_generated(
  p_amount DECIMAL,
  p_txid TEXT,
  p_pix_code TEXT,
  p_donor_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.pix_transactions (amount, txid, pix_code, donor_name, status)
  VALUES (p_amount, p_txid, p_pix_code, p_donor_name, 'generated')
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- Function to mark PIX as paid
CREATE OR REPLACE FUNCTION public.mark_pix_paid(p_txid TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.pix_transactions
  SET status = 'paid', paid_at = now()
  WHERE txid = p_txid AND status = 'generated';
  
  RETURN FOUND;
END;
$$;

-- Function to get dashboard stats (admin only)
CREATE OR REPLACE FUNCTION public.get_pix_dashboard(input_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  IF NOT public.validate_admin_token(input_token) THEN
    RAISE EXCEPTION 'Invalid admin token';
  END IF;
  
  SELECT json_build_object(
    'total_generated', (SELECT COUNT(*) FROM pix_transactions),
    'total_paid', (SELECT COUNT(*) FROM pix_transactions WHERE status = 'paid'),
    'total_expired', (SELECT COUNT(*) FROM pix_transactions WHERE status = 'expired'),
    'total_amount_generated', COALESCE((SELECT SUM(amount) FROM pix_transactions), 0),
    'total_amount_paid', COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE status = 'paid'), 0),
    'today_generated', (SELECT COUNT(*) FROM pix_transactions WHERE created_at >= CURRENT_DATE),
    'today_paid', (SELECT COUNT(*) FROM pix_transactions WHERE status = 'paid' AND paid_at >= CURRENT_DATE),
    'today_amount_paid', COALESCE((SELECT SUM(amount) FROM pix_transactions WHERE status = 'paid' AND paid_at >= CURRENT_DATE), 0)
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Function to get recent transactions (admin only)
CREATE OR REPLACE FUNCTION public.get_pix_transactions(input_token TEXT, p_limit INTEGER DEFAULT 50)
RETURNS TABLE(
  id UUID,
  amount DECIMAL,
  status pix_status,
  txid TEXT,
  donor_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.validate_admin_token(input_token) THEN
    RAISE EXCEPTION 'Invalid admin token';
  END IF;
  
  RETURN QUERY
  SELECT t.id, t.amount, t.status, t.txid, t.donor_name, t.created_at, t.paid_at
  FROM public.pix_transactions t
  ORDER BY t.created_at DESC
  LIMIT p_limit;
END;
$$;