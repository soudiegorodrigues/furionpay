-- Atualizar função de backup completo para NÃO incluir transações (evita timeout)

CREATE OR REPLACE FUNCTION public.create_full_system_backup()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_backup_id uuid;
  v_admin_settings jsonb;
  v_products jsonb;
  v_product_offers jsonb;
  v_product_checkout_configs jsonb;
  v_product_testimonials jsonb;
  v_product_folders jsonb;
  v_checkout_offers jsonb;
  v_checkout_templates jsonb;
  v_popup_configurations jsonb;
  v_profiles jsonb;
  v_rewards jsonb;
  v_reward_requests jsonb;
  v_fee_configs jsonb;
  v_available_domains jsonb;
  v_total_records integer := 0;
BEGIN
  -- Coletar tabelas de configuração (pequenas, sem timeout)
  SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_admin_settings FROM admin_settings t;
  v_total_records := v_total_records + COALESCE(jsonb_array_length(v_admin_settings), 0);

  SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_products FROM products t;
  v_total_records := v_total_records + COALESCE(jsonb_array_length(v_products), 0);

  SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_product_offers FROM product_offers t;
  v_total_records := v_total_records + COALESCE(jsonb_array_length(v_product_offers), 0);

  SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_product_checkout_configs FROM product_checkout_configs t;
  v_total_records := v_total_records + COALESCE(jsonb_array_length(v_product_checkout_configs), 0);

  SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_product_testimonials FROM product_testimonials t;
  v_total_records := v_total_records + COALESCE(jsonb_array_length(v_product_testimonials), 0);

  SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_product_folders FROM product_folders t;
  v_total_records := v_total_records + COALESCE(jsonb_array_length(v_product_folders), 0);

  SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_checkout_offers FROM checkout_offers t;
  v_total_records := v_total_records + COALESCE(jsonb_array_length(v_checkout_offers), 0);

  SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_checkout_templates FROM checkout_templates t;
  v_total_records := v_total_records + COALESCE(jsonb_array_length(v_checkout_templates), 0);

  SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_popup_configurations FROM popup_configurations t;
  v_total_records := v_total_records + COALESCE(jsonb_array_length(v_popup_configurations), 0);

  SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_profiles FROM profiles t;
  v_total_records := v_total_records + COALESCE(jsonb_array_length(v_profiles), 0);

  SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_rewards FROM rewards t;
  v_total_records := v_total_records + COALESCE(jsonb_array_length(v_rewards), 0);

  SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_reward_requests FROM reward_requests t;
  v_total_records := v_total_records + COALESCE(jsonb_array_length(v_reward_requests), 0);

  SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_fee_configs FROM fee_configs t;
  v_total_records := v_total_records + COALESCE(jsonb_array_length(v_fee_configs), 0);

  SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb) INTO v_available_domains FROM available_domains t;
  v_total_records := v_total_records + COALESCE(jsonb_array_length(v_available_domains), 0);

  -- Inserir backup SEM transações PIX e saques (evita timeout)
  -- Transações permanecem no banco, apenas não são incluídas no backup interno
  INSERT INTO system_backups (
    backup_name,
    backup_type,
    backed_up_at,
    admin_settings_data,
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
    pix_transactions_data,
    withdrawal_requests_data,
    fee_configs_data,
    available_domains_data,
    total_records
  ) VALUES (
    'Backup Configurações - ' || to_char(NOW(), 'DD/MM/YYYY HH24:MI'),
    'full',
    NOW(),
    v_admin_settings,
    v_products,
    v_product_offers,
    v_product_checkout_configs,
    v_product_testimonials,
    v_product_folders,
    v_checkout_offers,
    v_checkout_templates,
    v_popup_configurations,
    v_profiles,
    v_rewards,
    v_reward_requests,
    '[]'::jsonb,  -- Transações PIX não incluídas (permanecem no banco)
    '[]'::jsonb,  -- Saques não incluídos (permanecem no banco)
    v_fee_configs,
    v_available_domains,
    v_total_records
  )
  RETURNING id INTO v_backup_id;

  RETURN v_backup_id;
END;
$$;