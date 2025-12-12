-- Create withdrawal status enum
CREATE TYPE public.withdrawal_status AS ENUM ('pending', 'approved', 'rejected');

-- Create withdrawal requests table
CREATE TABLE public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  status withdrawal_status NOT NULL DEFAULT 'pending',
  bank_code TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  pix_key_type TEXT NOT NULL,
  pix_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT
);

-- Enable RLS
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own withdrawal requests
CREATE POLICY "Users can view their own withdrawals"
ON public.withdrawal_requests
FOR SELECT
USING (user_id = auth.uid());

-- Users can create their own withdrawal requests
CREATE POLICY "Users can create their own withdrawals"
ON public.withdrawal_requests
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Admins can view all withdrawal requests
CREATE POLICY "Admins can view all withdrawals"
ON public.withdrawal_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update withdrawal requests
CREATE POLICY "Admins can update withdrawals"
ON public.withdrawal_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to get user available balance
CREATE OR REPLACE FUNCTION public.get_user_available_balance()
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_paid NUMERIC;
  v_pending_withdrawals NUMERIC;
  v_approved_withdrawals NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN 0;
  END IF;

  -- Get total paid transactions
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM pix_transactions
  WHERE user_id = auth.uid() AND status = 'paid';

  -- Get pending withdrawals
  SELECT COALESCE(SUM(amount), 0) INTO v_pending_withdrawals
  FROM withdrawal_requests
  WHERE user_id = auth.uid() AND status = 'pending';

  -- Get approved withdrawals
  SELECT COALESCE(SUM(amount), 0) INTO v_approved_withdrawals
  FROM withdrawal_requests
  WHERE user_id = auth.uid() AND status = 'approved';

  RETURN v_total_paid - v_pending_withdrawals - v_approved_withdrawals;
END;
$$;

-- Create function to request withdrawal
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_amount NUMERIC,
  p_bank_code TEXT,
  p_bank_name TEXT,
  p_pix_key_type TEXT,
  p_pix_key TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_available_balance NUMERIC;
  v_withdrawal_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get available balance
  v_available_balance := public.get_user_available_balance();

  -- Validate amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Valor deve ser maior que zero';
  END IF;

  IF p_amount > v_available_balance THEN
    RAISE EXCEPTION 'Saldo insuficiente. Disponível: R$ %', ROUND(v_available_balance, 2);
  END IF;

  -- Create withdrawal request
  INSERT INTO public.withdrawal_requests (
    user_id, amount, bank_code, bank_name, pix_key_type, pix_key
  ) VALUES (
    auth.uid(), p_amount, p_bank_code, p_bank_name, p_pix_key_type, p_pix_key
  ) RETURNING id INTO v_withdrawal_id;

  RETURN v_withdrawal_id;
END;
$$;

-- Create function for admins to process withdrawals
CREATE OR REPLACE FUNCTION public.process_withdrawal(
  p_withdrawal_id UUID,
  p_status withdrawal_status,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can process withdrawals';
  END IF;

  UPDATE public.withdrawal_requests
  SET 
    status = p_status,
    processed_at = now(),
    processed_by = auth.uid(),
    rejection_reason = p_rejection_reason,
    updated_at = now()
  WHERE id = p_withdrawal_id AND status = 'pending';

  RETURN FOUND;
END;
$$;

-- Create function to get all pending withdrawals for admins
CREATE OR REPLACE FUNCTION public.get_pending_withdrawals()
RETURNS TABLE(
  id UUID,
  user_id UUID,
  user_email TEXT,
  amount NUMERIC,
  bank_code TEXT,
  bank_name TEXT,
  pix_key_type TEXT,
  pix_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can view pending withdrawals';
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
    wr.created_at
  FROM withdrawal_requests wr
  JOIN auth.users u ON u.id = wr.user_id
  WHERE wr.status = 'pending'
  ORDER BY wr.created_at ASC;
END;
$$;

-- Create function to get user withdrawal history
CREATE OR REPLACE FUNCTION public.get_user_withdrawals(p_limit INTEGER DEFAULT 50)
RETURNS TABLE(
  id UUID,
  amount NUMERIC,
  status withdrawal_status,
  bank_name TEXT,
  pix_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  processed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT 
    wr.id,
    wr.amount,
    wr.status,
    wr.bank_name,
    wr.pix_key,
    wr.created_at,
    wr.processed_at,
    wr.rejection_reason
  FROM withdrawal_requests wr
  WHERE wr.user_id = auth.uid()
  ORDER BY wr.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Add trigger for updated_at
CREATE TRIGGER update_withdrawal_requests_updated_at
BEFORE UPDATE ON public.withdrawal_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();