
-- Drop existing function to change return type
DROP FUNCTION IF EXISTS public.get_transaction_backups();

-- Update get_transaction_backups to include backup_type and backed_up_by_email
CREATE OR REPLACE FUNCTION public.get_transaction_backups()
RETURNS TABLE(backup_id uuid, backed_up_at timestamp with time zone, transaction_count bigint, backup_type text, backed_up_by_email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can view backups';
  END IF;

  RETURN QUERY
  SELECT 
    b.backup_id,
    MIN(b.backed_up_at) as backed_up_at,
    COUNT(*) as transaction_count,
    MAX(b.backup_type) as backup_type,
    (SELECT u.email::TEXT FROM auth.users u WHERE u.id = MAX(b.backed_up_by)) as backed_up_by_email
  FROM pix_transactions_backup b
  GROUP BY b.backup_id
  ORDER BY MIN(b.backed_up_at) DESC;
END;
$$;

-- Create function to trigger manual backup without reset (for on-demand backups)
CREATE OR REPLACE FUNCTION public.create_manual_backup()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_backup_id UUID;
  v_old_backup_ids UUID[];
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can create backups';
  END IF;

  v_backup_id := gen_random_uuid();

  INSERT INTO pix_transactions_backup (
    backup_id, backed_up_by, backup_type, original_id, amount, status, txid, pix_code,
    donor_name, product_name, popup_model, fee_fixed, fee_percentage,
    utm_data, user_id, created_at, paid_at, expired_at
  )
  SELECT 
    v_backup_id, auth.uid(), 'manual', id, amount, status::TEXT, txid, pix_code,
    donor_name, product_name, popup_model, fee_fixed, fee_percentage,
    utm_data, user_id, created_at, paid_at, expired_at
  FROM pix_transactions;

  SELECT ARRAY_AGG(backup_id) INTO v_old_backup_ids
  FROM (
    SELECT DISTINCT backup_id
    FROM pix_transactions_backup
    ORDER BY (SELECT MIN(backed_up_at) FROM pix_transactions_backup b2 WHERE b2.backup_id = pix_transactions_backup.backup_id) DESC
    OFFSET 5
  ) old_backups;

  IF v_old_backup_ids IS NOT NULL AND array_length(v_old_backup_ids, 1) > 0 THEN
    DELETE FROM pix_transactions_backup WHERE backup_id = ANY(v_old_backup_ids);
  END IF;

  RETURN v_backup_id;
END;
$$;
