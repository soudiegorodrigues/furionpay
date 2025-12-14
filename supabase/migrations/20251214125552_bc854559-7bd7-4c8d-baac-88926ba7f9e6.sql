
-- Create comprehensive system backup table
CREATE TABLE IF NOT EXISTS public.system_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_name TEXT NOT NULL,
  backup_type TEXT NOT NULL DEFAULT 'manual',
  backed_up_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  backed_up_by UUID,
  
  -- Data storage in JSONB format
  pix_transactions_data JSONB DEFAULT '[]'::jsonb,
  withdrawal_requests_data JSONB DEFAULT '[]'::jsonb,
  fee_configs_data JSONB DEFAULT '[]'::jsonb,
  admin_settings_data JSONB DEFAULT '[]'::jsonb,
  products_data JSONB DEFAULT '[]'::jsonb,
  product_offers_data JSONB DEFAULT '[]'::jsonb,
  product_checkout_configs_data JSONB DEFAULT '[]'::jsonb,
  product_testimonials_data JSONB DEFAULT '[]'::jsonb,
  product_folders_data JSONB DEFAULT '[]'::jsonb,
  checkout_offers_data JSONB DEFAULT '[]'::jsonb,
  checkout_templates_data JSONB DEFAULT '[]'::jsonb,
  popup_configurations_data JSONB DEFAULT '[]'::jsonb,
  profiles_data JSONB DEFAULT '[]'::jsonb,
  rewards_data JSONB DEFAULT '[]'::jsonb,
  reward_requests_data JSONB DEFAULT '[]'::jsonb,
  available_domains_data JSONB DEFAULT '[]'::jsonb,
  chat_flows_data JSONB DEFAULT '[]'::jsonb,
  chat_blocks_data JSONB DEFAULT '[]'::jsonb,
  
  -- Statistics
  total_records INTEGER DEFAULT 0,
  size_bytes BIGINT DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_backups ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view system backups"
ON public.system_backups FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create system backups"
ON public.system_backups FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete system backups"
ON public.system_backups FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to create full system backup
CREATE OR REPLACE FUNCTION public.create_full_system_backup(p_backup_name TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_backup_id UUID;
  v_backup_name TEXT;
  v_total_records INTEGER := 0;
  v_pix_data JSONB;
  v_withdrawal_data JSONB;
  v_fee_data JSONB;
  v_settings_data JSONB;
  v_products_data JSONB;
  v_offers_data JSONB;
  v_checkout_configs_data JSONB;
  v_testimonials_data JSONB;
  v_folders_data JSONB;
  v_checkout_offers_data JSONB;
  v_templates_data JSONB;
  v_popup_data JSONB;
  v_profiles_data JSONB;
  v_rewards_data JSONB;
  v_reward_requests_data JSONB;
  v_domains_data JSONB;
  v_flows_data JSONB;
  v_blocks_data JSONB;
  v_old_backup_ids UUID[];
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can create system backups';
  END IF;

  v_backup_id := gen_random_uuid();
  v_backup_name := COALESCE(p_backup_name, 'Backup Manual - ' || to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI'));

  -- Collect data from all tables
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_pix_data FROM pix_transactions t;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_withdrawal_data FROM withdrawal_requests t;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_fee_data FROM fee_configs t;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_settings_data FROM admin_settings t;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_products_data FROM products t;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_offers_data FROM product_offers t;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_checkout_configs_data FROM product_checkout_configs t;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_testimonials_data FROM product_testimonials t;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_folders_data FROM product_folders t;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_checkout_offers_data FROM checkout_offers t;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_templates_data FROM checkout_templates t;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_popup_data FROM popup_configurations t;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_profiles_data FROM profiles t;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_rewards_data FROM rewards t;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_reward_requests_data FROM reward_requests t;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_domains_data FROM available_domains t;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_flows_data FROM chat_flows t;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_blocks_data FROM chat_blocks t;

  -- Calculate total records
  v_total_records := 
    jsonb_array_length(v_pix_data) +
    jsonb_array_length(v_withdrawal_data) +
    jsonb_array_length(v_fee_data) +
    jsonb_array_length(v_settings_data) +
    jsonb_array_length(v_products_data) +
    jsonb_array_length(v_offers_data) +
    jsonb_array_length(v_checkout_configs_data) +
    jsonb_array_length(v_testimonials_data) +
    jsonb_array_length(v_folders_data) +
    jsonb_array_length(v_checkout_offers_data) +
    jsonb_array_length(v_templates_data) +
    jsonb_array_length(v_popup_data) +
    jsonb_array_length(v_profiles_data) +
    jsonb_array_length(v_rewards_data) +
    jsonb_array_length(v_reward_requests_data) +
    jsonb_array_length(v_domains_data) +
    jsonb_array_length(v_flows_data) +
    jsonb_array_length(v_blocks_data);

  -- Insert backup
  INSERT INTO system_backups (
    id, backup_name, backup_type, backed_up_at, backed_up_by,
    pix_transactions_data, withdrawal_requests_data, fee_configs_data,
    admin_settings_data, products_data, product_offers_data,
    product_checkout_configs_data, product_testimonials_data, product_folders_data,
    checkout_offers_data, checkout_templates_data, popup_configurations_data,
    profiles_data, rewards_data, reward_requests_data,
    available_domains_data, chat_flows_data, chat_blocks_data,
    total_records, size_bytes
  ) VALUES (
    v_backup_id, v_backup_name, 'manual', now(), auth.uid(),
    v_pix_data, v_withdrawal_data, v_fee_data,
    v_settings_data, v_products_data, v_offers_data,
    v_checkout_configs_data, v_testimonials_data, v_folders_data,
    v_checkout_offers_data, v_templates_data, v_popup_data,
    v_profiles_data, v_rewards_data, v_reward_requests_data,
    v_domains_data, v_flows_data, v_blocks_data,
    v_total_records, 0
  );

  -- Keep only 5 most recent backups
  SELECT ARRAY_AGG(old_ids.id) INTO v_old_backup_ids
  FROM (
    SELECT id FROM system_backups
    ORDER BY backed_up_at DESC
    OFFSET 5
  ) old_ids;

  IF v_old_backup_ids IS NOT NULL AND array_length(v_old_backup_ids, 1) > 0 THEN
    DELETE FROM system_backups WHERE id = ANY(v_old_backup_ids);
  END IF;

  RETURN v_backup_id;
END;
$$;

-- Function to get system backups list
CREATE OR REPLACE FUNCTION public.get_system_backups()
RETURNS TABLE(
  id UUID,
  backup_name TEXT,
  backup_type TEXT,
  backed_up_at TIMESTAMPTZ,
  backed_up_by_email TEXT,
  total_records INTEGER,
  pix_count INTEGER,
  withdrawal_count INTEGER,
  fee_count INTEGER,
  settings_count INTEGER,
  products_count INTEGER,
  profiles_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can view system backups';
  END IF;

  RETURN QUERY
  SELECT 
    b.id,
    b.backup_name,
    b.backup_type,
    b.backed_up_at,
    (SELECT u.email::TEXT FROM auth.users u WHERE u.id = b.backed_up_by) as backed_up_by_email,
    b.total_records,
    jsonb_array_length(b.pix_transactions_data)::INTEGER as pix_count,
    jsonb_array_length(b.withdrawal_requests_data)::INTEGER as withdrawal_count,
    jsonb_array_length(b.fee_configs_data)::INTEGER as fee_count,
    jsonb_array_length(b.admin_settings_data)::INTEGER as settings_count,
    jsonb_array_length(b.products_data)::INTEGER as products_count,
    jsonb_array_length(b.profiles_data)::INTEGER as profiles_count
  FROM system_backups b
  ORDER BY b.backed_up_at DESC;
END;
$$;

-- Function to restore full system backup
CREATE OR REPLACE FUNCTION public.restore_full_system_backup(p_backup_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_backup RECORD;
  v_record JSONB;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can restore system backups';
  END IF;

  -- Get backup data
  SELECT * INTO v_backup FROM system_backups WHERE id = p_backup_id;
  
  IF v_backup IS NULL THEN
    RAISE EXCEPTION 'Backup not found';
  END IF;

  -- Restore pix_transactions
  FOR v_record IN SELECT * FROM jsonb_array_elements(v_backup.pix_transactions_data)
  LOOP
    INSERT INTO pix_transactions (id, amount, status, txid, pix_code, donor_name, product_name, popup_model, fee_fixed, fee_percentage, utm_data, user_id, created_at, paid_at, expired_at)
    VALUES (
      (v_record->>'id')::UUID,
      (v_record->>'amount')::NUMERIC,
      (v_record->>'status')::pix_status,
      v_record->>'txid',
      v_record->>'pix_code',
      v_record->>'donor_name',
      v_record->>'product_name',
      v_record->>'popup_model',
      (v_record->>'fee_fixed')::NUMERIC,
      (v_record->>'fee_percentage')::NUMERIC,
      (v_record->'utm_data')::JSONB,
      (v_record->>'user_id')::UUID,
      (v_record->>'created_at')::TIMESTAMPTZ,
      (v_record->>'paid_at')::TIMESTAMPTZ,
      (v_record->>'expired_at')::TIMESTAMPTZ
    )
    ON CONFLICT (id) DO UPDATE SET
      amount = EXCLUDED.amount,
      status = EXCLUDED.status,
      txid = EXCLUDED.txid,
      pix_code = EXCLUDED.pix_code,
      donor_name = EXCLUDED.donor_name,
      product_name = EXCLUDED.product_name,
      popup_model = EXCLUDED.popup_model,
      fee_fixed = EXCLUDED.fee_fixed,
      fee_percentage = EXCLUDED.fee_percentage,
      utm_data = EXCLUDED.utm_data,
      user_id = EXCLUDED.user_id,
      paid_at = EXCLUDED.paid_at,
      expired_at = EXCLUDED.expired_at;
  END LOOP;

  -- Restore withdrawal_requests
  FOR v_record IN SELECT * FROM jsonb_array_elements(v_backup.withdrawal_requests_data)
  LOOP
    INSERT INTO withdrawal_requests (id, user_id, amount, bank_code, bank_name, pix_key_type, pix_key, status, created_at, processed_at, processed_by, rejection_reason)
    VALUES (
      (v_record->>'id')::UUID,
      (v_record->>'user_id')::UUID,
      (v_record->>'amount')::NUMERIC,
      v_record->>'bank_code',
      v_record->>'bank_name',
      v_record->>'pix_key_type',
      v_record->>'pix_key',
      (v_record->>'status')::withdrawal_status,
      (v_record->>'created_at')::TIMESTAMPTZ,
      (v_record->>'processed_at')::TIMESTAMPTZ,
      (v_record->>'processed_by')::UUID,
      v_record->>'rejection_reason'
    )
    ON CONFLICT (id) DO UPDATE SET
      amount = EXCLUDED.amount,
      status = EXCLUDED.status,
      processed_at = EXCLUDED.processed_at,
      processed_by = EXCLUDED.processed_by,
      rejection_reason = EXCLUDED.rejection_reason;
  END LOOP;

  -- Restore fee_configs
  FOR v_record IN SELECT * FROM jsonb_array_elements(v_backup.fee_configs_data)
  LOOP
    INSERT INTO fee_configs (id, name, pix_percentage, pix_fixed, pix_repasse_days, pix_repasse_percentage, boleto_percentage, boleto_fixed, boleto_repasse_days, boleto_repasse_percentage, cartao_percentage, cartao_fixed, cartao_repasse_days, cartao_repasse_percentage, saque_percentage, saque_fixed, is_default, created_at, updated_at)
    VALUES (
      (v_record->>'id')::UUID,
      v_record->>'name',
      (v_record->>'pix_percentage')::NUMERIC,
      (v_record->>'pix_fixed')::NUMERIC,
      (v_record->>'pix_repasse_days')::INTEGER,
      (v_record->>'pix_repasse_percentage')::NUMERIC,
      (v_record->>'boleto_percentage')::NUMERIC,
      (v_record->>'boleto_fixed')::NUMERIC,
      (v_record->>'boleto_repasse_days')::INTEGER,
      (v_record->>'boleto_repasse_percentage')::NUMERIC,
      (v_record->>'cartao_percentage')::NUMERIC,
      (v_record->>'cartao_fixed')::NUMERIC,
      (v_record->>'cartao_repasse_days')::INTEGER,
      (v_record->>'cartao_repasse_percentage')::NUMERIC,
      (v_record->>'saque_percentage')::NUMERIC,
      (v_record->>'saque_fixed')::NUMERIC,
      (v_record->>'is_default')::BOOLEAN,
      (v_record->>'created_at')::TIMESTAMPTZ,
      (v_record->>'updated_at')::TIMESTAMPTZ
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      pix_percentage = EXCLUDED.pix_percentage,
      pix_fixed = EXCLUDED.pix_fixed,
      is_default = EXCLUDED.is_default,
      updated_at = EXCLUDED.updated_at;
  END LOOP;

  -- Restore admin_settings
  FOR v_record IN SELECT * FROM jsonb_array_elements(v_backup.admin_settings_data)
  LOOP
    INSERT INTO admin_settings (id, key, value, user_id, created_at, updated_at)
    VALUES (
      (v_record->>'id')::UUID,
      v_record->>'key',
      v_record->>'value',
      (v_record->>'user_id')::UUID,
      (v_record->>'created_at')::TIMESTAMPTZ,
      (v_record->>'updated_at')::TIMESTAMPTZ
    )
    ON CONFLICT (id) DO UPDATE SET
      value = EXCLUDED.value,
      updated_at = EXCLUDED.updated_at;
  END LOOP;

  -- Restore products
  FOR v_record IN SELECT * FROM jsonb_array_elements(v_backup.products_data)
  LOOP
    INSERT INTO products (id, name, description, image_url, price, is_active, user_id, folder_id, website_url, product_code, created_at, updated_at)
    VALUES (
      (v_record->>'id')::UUID,
      v_record->>'name',
      v_record->>'description',
      v_record->>'image_url',
      (v_record->>'price')::NUMERIC,
      (v_record->>'is_active')::BOOLEAN,
      (v_record->>'user_id')::UUID,
      (v_record->>'folder_id')::UUID,
      v_record->>'website_url',
      v_record->>'product_code',
      (v_record->>'created_at')::TIMESTAMPTZ,
      (v_record->>'updated_at')::TIMESTAMPTZ
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      image_url = EXCLUDED.image_url,
      price = EXCLUDED.price,
      is_active = EXCLUDED.is_active,
      updated_at = EXCLUDED.updated_at;
  END LOOP;

  -- Restore profiles
  FOR v_record IN SELECT * FROM jsonb_array_elements(v_backup.profiles_data)
  LOOP
    INSERT INTO profiles (id, full_name, is_approved, created_at, updated_at)
    VALUES (
      (v_record->>'id')::UUID,
      v_record->>'full_name',
      (v_record->>'is_approved')::BOOLEAN,
      (v_record->>'created_at')::TIMESTAMPTZ,
      (v_record->>'updated_at')::TIMESTAMPTZ
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      is_approved = EXCLUDED.is_approved,
      updated_at = EXCLUDED.updated_at;
  END LOOP;

  RETURN TRUE;
END;
$$;

-- Function to delete system backup
CREATE OR REPLACE FUNCTION public.delete_system_backup(p_backup_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can delete system backups';
  END IF;

  DELETE FROM system_backups WHERE id = p_backup_id;
  
  RETURN FOUND;
END;
$$;
