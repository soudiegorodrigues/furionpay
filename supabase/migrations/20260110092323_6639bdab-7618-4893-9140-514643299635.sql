-- Recriar get_system_backups com colunas corretas da tabela
CREATE OR REPLACE FUNCTION public.get_system_backups()
RETURNS TABLE (
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
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    b.id,
    COALESCE(b.backup_name, 'Backup ' || to_char(b.backed_up_at, 'DD/MM/YYYY HH24:MI'))::TEXT as backup_name,
    b.backup_type,
    b.backed_up_at,
    NULL::TEXT as backed_up_by_email,
    COALESCE(b.total_records, 0)::INTEGER as total_records,
    0::INTEGER as pix_count,
    0::INTEGER as withdrawal_count,
    0::INTEGER as fee_count,
    0::INTEGER as settings_count,
    0::INTEGER as products_count,
    0::INTEGER as profiles_count
  FROM system_backups b
  ORDER BY b.backed_up_at DESC
  LIMIT 50;
$$;

-- Recriar create_full_system_backup com colunas corretas e limite de 30 dias para PIX
CREATE OR REPLACE FUNCTION public.create_full_system_backup(p_backup_type TEXT DEFAULT 'manual', p_created_by UUID DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_backup_id UUID;
  v_admin_data JSONB;
  v_products_data JSONB;
  v_product_offers_data JSONB;
  v_product_checkout_configs_data JSONB;
  v_product_testimonials_data JSONB;
  v_product_folders_data JSONB;
  v_offers_data JSONB;
  v_profiles_data JSONB;
  v_pix_data JSONB;
  v_withdrawal_data JSONB;
  v_fee_data JSONB;
  v_templates_data JSONB;
  v_popups_data JSONB;
  v_rewards_data JSONB;
  v_reward_requests_data JSONB;
  v_domains_data JSONB;
  v_total_records INTEGER := 0;
BEGIN
  -- Coletar dados de cada tabela
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_admin_data FROM admin_settings t;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_products_data FROM products t;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_product_offers_data FROM product_offers t;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_product_checkout_configs_data FROM product_checkout_configs t;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_product_testimonials_data FROM product_testimonials t;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_product_folders_data FROM product_folders t;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_offers_data FROM checkout_offers t;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_profiles_data FROM profiles t;
  
  -- PIX: Apenas últimos 30 dias para evitar timeout
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) 
  INTO v_pix_data 
  FROM pix_transactions t 
  WHERE t.created_at > NOW() - INTERVAL '30 days';
  
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_withdrawal_data FROM withdrawal_requests t;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_fee_data FROM fee_configs t;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_templates_data FROM checkout_templates t;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_popups_data FROM popup_configurations t;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_rewards_data FROM user_rewards t;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_reward_requests_data FROM reward_requests t;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_domains_data FROM available_domains t;

  -- Calcular total de registros
  v_total_records := 
    jsonb_array_length(v_admin_data) +
    jsonb_array_length(v_products_data) +
    jsonb_array_length(v_product_offers_data) +
    jsonb_array_length(v_product_checkout_configs_data) +
    jsonb_array_length(v_product_testimonials_data) +
    jsonb_array_length(v_product_folders_data) +
    jsonb_array_length(v_offers_data) +
    jsonb_array_length(v_profiles_data) +
    jsonb_array_length(v_pix_data) +
    jsonb_array_length(v_withdrawal_data) +
    jsonb_array_length(v_fee_data) +
    jsonb_array_length(v_templates_data) +
    jsonb_array_length(v_popups_data) +
    jsonb_array_length(v_rewards_data) +
    jsonb_array_length(v_reward_requests_data) +
    jsonb_array_length(v_domains_data);

  -- Inserir backup
  INSERT INTO system_backups (
    backup_name,
    backup_type,
    backed_up_at,
    backed_up_by,
    admin_settings_data,
    products_data,
    product_offers_data,
    product_checkout_configs_data,
    product_testimonials_data,
    product_folders_data,
    checkout_offers_data,
    profiles_data,
    pix_transactions_data,
    withdrawal_requests_data,
    fee_configs_data,
    checkout_templates_data,
    popup_configurations_data,
    rewards_data,
    reward_requests_data,
    available_domains_data,
    total_records
  ) VALUES (
    'Backup ' || to_char(NOW(), 'DD/MM/YYYY HH24:MI'),
    p_backup_type,
    NOW(),
    p_created_by,
    v_admin_data,
    v_products_data,
    v_product_offers_data,
    v_product_checkout_configs_data,
    v_product_testimonials_data,
    v_product_folders_data,
    v_offers_data,
    v_profiles_data,
    v_pix_data,
    v_withdrawal_data,
    v_fee_data,
    v_templates_data,
    v_popups_data,
    v_rewards_data,
    v_reward_requests_data,
    v_domains_data,
    v_total_records
  ) RETURNING id INTO v_backup_id;

  RETURN v_backup_id;
END;
$$;

-- Criar função de backup leve (apenas configurações, sem transações PIX)
CREATE OR REPLACE FUNCTION public.create_light_backup(p_created_by UUID DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_backup_id UUID;
  v_admin_data JSONB;
  v_products_data JSONB;
  v_product_offers_data JSONB;
  v_product_checkout_configs_data JSONB;
  v_product_testimonials_data JSONB;
  v_product_folders_data JSONB;
  v_offers_data JSONB;
  v_profiles_data JSONB;
  v_fee_data JSONB;
  v_templates_data JSONB;
  v_popups_data JSONB;
  v_rewards_data JSONB;
  v_domains_data JSONB;
  v_total_records INTEGER := 0;
BEGIN
  -- Coletar apenas configurações (sem transações PIX e saques)
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_admin_data FROM admin_settings t;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_products_data FROM products t;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_product_offers_data FROM product_offers t;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_product_checkout_configs_data FROM product_checkout_configs t;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_product_testimonials_data FROM product_testimonials t;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_product_folders_data FROM product_folders t;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_offers_data FROM checkout_offers t;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_profiles_data FROM profiles t;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_fee_data FROM fee_configs t;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_templates_data FROM checkout_templates t;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_popups_data FROM popup_configurations t;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_rewards_data FROM user_rewards t;
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_domains_data FROM available_domains t;

  v_total_records := 
    jsonb_array_length(v_admin_data) +
    jsonb_array_length(v_products_data) +
    jsonb_array_length(v_product_offers_data) +
    jsonb_array_length(v_product_checkout_configs_data) +
    jsonb_array_length(v_product_testimonials_data) +
    jsonb_array_length(v_product_folders_data) +
    jsonb_array_length(v_offers_data) +
    jsonb_array_length(v_profiles_data) +
    jsonb_array_length(v_fee_data) +
    jsonb_array_length(v_templates_data) +
    jsonb_array_length(v_popups_data) +
    jsonb_array_length(v_rewards_data) +
    jsonb_array_length(v_domains_data);

  INSERT INTO system_backups (
    backup_name,
    backup_type,
    backed_up_at,
    backed_up_by,
    admin_settings_data,
    products_data,
    product_offers_data,
    product_checkout_configs_data,
    product_testimonials_data,
    product_folders_data,
    checkout_offers_data,
    profiles_data,
    pix_transactions_data,
    withdrawal_requests_data,
    fee_configs_data,
    checkout_templates_data,
    popup_configurations_data,
    rewards_data,
    reward_requests_data,
    available_domains_data,
    total_records
  ) VALUES (
    'Backup Leve ' || to_char(NOW(), 'DD/MM/YYYY HH24:MI'),
    'light',
    NOW(),
    p_created_by,
    v_admin_data,
    v_products_data,
    v_product_offers_data,
    v_product_checkout_configs_data,
    v_product_testimonials_data,
    v_product_folders_data,
    v_offers_data,
    v_profiles_data,
    '[]'::jsonb,
    '[]'::jsonb,
    v_fee_data,
    v_templates_data,
    v_popups_data,
    v_rewards_data,
    '[]'::jsonb,
    v_domains_data,
    v_total_records
  ) RETURNING id INTO v_backup_id;

  RETURN v_backup_id;
END;
$$;