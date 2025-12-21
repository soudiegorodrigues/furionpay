-- Fix create_full_system_backup function to remove references to non-existent tables
CREATE OR REPLACE FUNCTION public.create_full_system_backup(p_backup_name TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  v_old_backup_ids UUID[];
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can create system backups';
  END IF;

  v_backup_id := gen_random_uuid();
  v_backup_name := COALESCE(p_backup_name, 'Backup Manual - ' || to_char(now() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI'));

  -- Collect data from all tables (excluding non-existent chat_flows and chat_blocks)
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
    jsonb_array_length(v_domains_data);

  -- Insert backup (without chat_flows_data and chat_blocks_data)
  INSERT INTO system_backups (
    id, backup_name, backup_type, backed_up_at, backed_up_by,
    pix_transactions_data, withdrawal_requests_data, fee_configs_data,
    admin_settings_data, products_data, product_offers_data,
    product_checkout_configs_data, product_testimonials_data, product_folders_data,
    checkout_offers_data, checkout_templates_data, popup_configurations_data,
    profiles_data, rewards_data, reward_requests_data,
    available_domains_data,
    total_records, size_bytes
  ) VALUES (
    v_backup_id, v_backup_name, 'manual', now(), auth.uid(),
    v_pix_data, v_withdrawal_data, v_fee_data,
    v_settings_data, v_products_data, v_offers_data,
    v_checkout_configs_data, v_testimonials_data, v_folders_data,
    v_checkout_offers_data, v_templates_data, v_popup_data,
    v_profiles_data, v_rewards_data, v_reward_requests_data,
    v_domains_data,
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