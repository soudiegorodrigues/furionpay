
-- Add backup_type column to pix_transactions_backup
ALTER TABLE pix_transactions_backup ADD COLUMN IF NOT EXISTS backup_type TEXT DEFAULT 'manual';

-- Update existing backups to 'manual' type
UPDATE pix_transactions_backup SET backup_type = 'manual' WHERE backup_type IS NULL;

-- Update backup_and_reset_transactions to set backup_type = 'manual'
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
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can backup and reset transactions';
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

  DELETE FROM pix_transactions;

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

-- Create auto_backup_transactions function (does NOT delete original transactions)
CREATE OR REPLACE FUNCTION public.auto_backup_transactions()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_backup_id UUID;
  v_old_backup_ids UUID[];
BEGIN
  v_backup_id := gen_random_uuid();

  INSERT INTO pix_transactions_backup (
    backup_id, backed_up_by, backup_type, original_id, amount, status, txid, pix_code,
    donor_name, product_name, popup_model, fee_fixed, fee_percentage,
    utm_data, user_id, created_at, paid_at, expired_at
  )
  SELECT 
    v_backup_id, NULL, 'automatic', id, amount, status::TEXT, txid, pix_code,
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

-- Update create_manual_backup function
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
