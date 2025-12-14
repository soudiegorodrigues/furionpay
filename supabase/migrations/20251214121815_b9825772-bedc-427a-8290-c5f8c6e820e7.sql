-- Create backup table for pix_transactions
CREATE TABLE public.pix_transactions_backup (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  backup_id UUID NOT NULL,
  backed_up_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  backed_up_by UUID REFERENCES auth.users(id),
  -- Original transaction data
  original_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL,
  txid TEXT,
  pix_code TEXT,
  donor_name TEXT,
  product_name TEXT,
  popup_model TEXT,
  fee_fixed NUMERIC,
  fee_percentage NUMERIC,
  utm_data JSONB,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  expired_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.pix_transactions_backup ENABLE ROW LEVEL SECURITY;

-- Only admins can access backups
CREATE POLICY "Admins can view backups"
ON public.pix_transactions_backup
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert backups"
ON public.pix_transactions_backup
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete backups"
ON public.pix_transactions_backup
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to backup all transactions before reset
CREATE OR REPLACE FUNCTION public.backup_and_reset_transactions()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_backup_id UUID;
BEGIN
  -- Check if user is admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can backup and reset transactions';
  END IF;

  -- Generate backup ID
  v_backup_id := gen_random_uuid();

  -- Backup all transactions
  INSERT INTO pix_transactions_backup (
    backup_id, backed_up_by, original_id, amount, status, txid, pix_code,
    donor_name, product_name, popup_model, fee_fixed, fee_percentage,
    utm_data, user_id, created_at, paid_at, expired_at
  )
  SELECT 
    v_backup_id, auth.uid(), id, amount, status::TEXT, txid, pix_code,
    donor_name, product_name, popup_model, fee_fixed, fee_percentage,
    utm_data, user_id, created_at, paid_at, expired_at
  FROM pix_transactions;

  -- Delete all transactions
  DELETE FROM pix_transactions;

  RETURN v_backup_id;
END;
$$;

-- Function to restore from backup
CREATE OR REPLACE FUNCTION public.restore_transactions_from_backup(p_backup_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can restore transactions';
  END IF;

  -- Check if backup exists
  IF NOT EXISTS (SELECT 1 FROM pix_transactions_backup WHERE backup_id = p_backup_id) THEN
    RAISE EXCEPTION 'Backup not found';
  END IF;

  -- Restore transactions
  INSERT INTO pix_transactions (
    id, amount, status, txid, pix_code, donor_name, product_name,
    popup_model, fee_fixed, fee_percentage, utm_data, user_id,
    created_at, paid_at, expired_at
  )
  SELECT 
    original_id, amount, status::pix_status, txid, pix_code, donor_name,
    product_name, popup_model, fee_fixed, fee_percentage, utm_data,
    user_id, created_at, paid_at, expired_at
  FROM pix_transactions_backup
  WHERE backup_id = p_backup_id;

  RETURN TRUE;
END;
$$;

-- Function to get available backups
CREATE OR REPLACE FUNCTION public.get_transaction_backups()
RETURNS TABLE (
  backup_id UUID,
  backed_up_at TIMESTAMP WITH TIME ZONE,
  transaction_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can view backups';
  END IF;

  RETURN QUERY
  SELECT 
    b.backup_id,
    MIN(b.backed_up_at) as backed_up_at,
    COUNT(*) as transaction_count
  FROM pix_transactions_backup b
  GROUP BY b.backup_id
  ORDER BY MIN(b.backed_up_at) DESC;
END;
$$;

-- Function to delete a backup
CREATE OR REPLACE FUNCTION public.delete_transaction_backup(p_backup_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can delete backups';
  END IF;

  DELETE FROM pix_transactions_backup WHERE backup_id = p_backup_id;
  
  RETURN FOUND;
END;
$$;