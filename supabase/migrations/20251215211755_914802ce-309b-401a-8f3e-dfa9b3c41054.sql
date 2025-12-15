-- Create auto backup function for full system backup (no auth required for cron)
CREATE OR REPLACE FUNCTION public.auto_full_system_backup()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_backup_id UUID;
  v_backup_name TEXT;
  v_total_records INTEGER := 0;
  v_backup_count INTEGER;
BEGIN
  -- Generate backup name with timestamp
  v_backup_name := 'Auto Backup ' || to_char(NOW() AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI');
  
  -- Check backup count and delete oldest if >= 5
  SELECT COUNT(*) INTO v_backup_count FROM system_backups;
  
  IF v_backup_count >= 5 THEN
    DELETE FROM system_backups 
    WHERE id = (SELECT id FROM system_backups ORDER BY backed_up_at ASC LIMIT 1);
  END IF;
  
  -- Generate new backup ID
  v_backup_id := gen_random_uuid();
  
  -- Insert the backup with all table data
  INSERT INTO system_backups (
    id,
    backup_name,
    backup_type,
    backed_up_at,
    backed_up_by,
    pix_transactions_data,
    withdrawal_requests_data,
    fee_configs_data,
    products_data,
    product_offers_data,
    product_checkout_configs_data,
    product_testimonials_data,
    product_folders_data,
    checkout_offers_data,
    checkout_templates_data,
    popup_configurations_data,
    profiles_data,
    rewards_data,
    reward_requests_data,
    admin_settings_data,
    available_domains_data,
    chat_flows_data,
    chat_blocks_data,
    total_records
  )
  SELECT
    v_backup_id,
    v_backup_name,
    'automatic',
    NOW(),
    NULL, -- No user for automatic backup
    (SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM pix_transactions t),
    (SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM withdrawal_requests t),
    (SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM fee_configs t),
    (SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM products t),
    (SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM product_offers t),
    (SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM product_checkout_configs t),
    (SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM product_testimonials t),
    (SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM product_folders t),
    (SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM checkout_offers t),
    (SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM checkout_templates t),
    (SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM popup_configurations t),
    (SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM profiles t),
    (SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM rewards t),
    (SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM reward_requests t),
    (SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM admin_settings t),
    (SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM available_domains t),
    (SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM chat_flows t),
    (SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM chat_blocks t),
    (
      SELECT 
        (SELECT COUNT(*) FROM pix_transactions) +
        (SELECT COUNT(*) FROM withdrawal_requests) +
        (SELECT COUNT(*) FROM fee_configs) +
        (SELECT COUNT(*) FROM products) +
        (SELECT COUNT(*) FROM product_offers) +
        (SELECT COUNT(*) FROM product_checkout_configs) +
        (SELECT COUNT(*) FROM product_testimonials) +
        (SELECT COUNT(*) FROM product_folders) +
        (SELECT COUNT(*) FROM checkout_offers) +
        (SELECT COUNT(*) FROM checkout_templates) +
        (SELECT COUNT(*) FROM popup_configurations) +
        (SELECT COUNT(*) FROM profiles) +
        (SELECT COUNT(*) FROM rewards) +
        (SELECT COUNT(*) FROM reward_requests) +
        (SELECT COUNT(*) FROM admin_settings) +
        (SELECT COUNT(*) FROM available_domains) +
        (SELECT COUNT(*) FROM chat_flows) +
        (SELECT COUNT(*) FROM chat_blocks)
    );
  
  RETURN v_backup_id;
END;
$function$;