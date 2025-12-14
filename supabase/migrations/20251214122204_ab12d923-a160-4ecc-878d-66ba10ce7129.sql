
-- Update backup function to keep only 5 most recent backups
CREATE OR REPLACE FUNCTION public.backup_and_reset_transactions()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_backup_id UUID;
  v_old_backup_ids UUID[];
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

  -- Keep only 5 most recent backups - get old backup IDs to delete
  SELECT ARRAY_AGG(backup_id) INTO v_old_backup_ids
  FROM (
    SELECT DISTINCT backup_id
    FROM pix_transactions_backup
    ORDER BY (SELECT MIN(backed_up_at) FROM pix_transactions_backup b2 WHERE b2.backup_id = pix_transactions_backup.backup_id) DESC
    OFFSET 5
  ) old_backups;

  -- Delete old backups if any exist
  IF v_old_backup_ids IS NOT NULL AND array_length(v_old_backup_ids, 1) > 0 THEN
    DELETE FROM pix_transactions_backup WHERE backup_id = ANY(v_old_backup_ids);
  END IF;

  RETURN v_backup_id;
END;
$$;
