
-- =====================================================
-- CORREÇÃO SEGURA: Funções de Backup
-- Remove apenas referências a tabelas inexistentes
-- Mantém mesma assinatura das funções originais
-- NÃO afeta: PIX, webhooks, API, taxas, usuários
-- =====================================================

-- 1. CORRIGIR auto_full_system_backup (retorna UUID)
CREATE OR REPLACE FUNCTION public.auto_full_system_backup()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_backup_id uuid;
  v_backup_name text;
  v_total_records int := 0;
  v_size_bytes int := 0;
BEGIN
  -- Generate backup name with timestamp
  v_backup_name := 'auto_backup_' || to_char(now(), 'YYYY-MM-DD_HH24-MI-SS');
  
  -- Create the backup record
  INSERT INTO system_backups (
    backup_name,
    backup_type,
    backed_up_at,
    profiles_data,
    products_data,
    product_folders_data,
    product_offers_data,
    product_testimonials_data,
    product_checkout_configs_data,
    checkout_offers_data,
    checkout_templates_data,
    popup_configurations_data,
    pix_transactions_data,
    withdrawal_requests_data,
    rewards_data,
    reward_requests_data,
    fee_configs_data,
    available_domains_data,
    admin_settings_data
  )
  SELECT
    v_backup_name,
    'full_auto',
    now(),
    (SELECT jsonb_agg(row_to_json(t)) FROM profiles t),
    (SELECT jsonb_agg(row_to_json(t)) FROM products t),
    (SELECT jsonb_agg(row_to_json(t)) FROM product_folders t),
    (SELECT jsonb_agg(row_to_json(t)) FROM product_offers t),
    (SELECT jsonb_agg(row_to_json(t)) FROM product_testimonials t),
    (SELECT jsonb_agg(row_to_json(t)) FROM product_checkout_configs t),
    (SELECT jsonb_agg(row_to_json(t)) FROM checkout_offers t),
    (SELECT jsonb_agg(row_to_json(t)) FROM checkout_templates t),
    (SELECT jsonb_agg(row_to_json(t)) FROM popup_configurations t),
    (SELECT jsonb_agg(row_to_json(t)) FROM pix_transactions t),
    (SELECT jsonb_agg(row_to_json(t)) FROM withdrawal_requests t),
    (SELECT jsonb_agg(row_to_json(t)) FROM rewards t),
    (SELECT jsonb_agg(row_to_json(t)) FROM reward_requests t),
    (SELECT jsonb_agg(row_to_json(t)) FROM fee_configs t),
    (SELECT jsonb_agg(row_to_json(t)) FROM available_domains t),
    (SELECT jsonb_agg(row_to_json(t)) FROM admin_settings t)
  RETURNING id INTO v_backup_id;
  
  -- Calculate total records (CORRIGIDO: sem chat_flows e chat_blocks)
  SELECT 
    (SELECT COUNT(*) FROM profiles) +
    (SELECT COUNT(*) FROM products) +
    (SELECT COUNT(*) FROM product_folders) +
    (SELECT COUNT(*) FROM product_offers) +
    (SELECT COUNT(*) FROM product_testimonials) +
    (SELECT COUNT(*) FROM product_checkout_configs) +
    (SELECT COUNT(*) FROM checkout_offers) +
    (SELECT COUNT(*) FROM checkout_templates) +
    (SELECT COUNT(*) FROM popup_configurations) +
    (SELECT COUNT(*) FROM pix_transactions) +
    (SELECT COUNT(*) FROM withdrawal_requests) +
    (SELECT COUNT(*) FROM rewards) +
    (SELECT COUNT(*) FROM reward_requests) +
    (SELECT COUNT(*) FROM fee_configs) +
    (SELECT COUNT(*) FROM available_domains) +
    (SELECT COUNT(*) FROM admin_settings)
  INTO v_total_records;
  
  -- Update backup with stats
  UPDATE system_backups 
  SET 
    total_records = v_total_records,
    size_bytes = v_size_bytes
  WHERE id = v_backup_id;
  
  RETURN v_backup_id;
END;
$$;

-- 2. CORRIGIR export_full_backup (retorna JSON)
CREATE OR REPLACE FUNCTION public.export_full_backup()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  SELECT json_build_object(
    'exported_at', now(),
    'version', '2.0',
    'tables', json_build_object(
      'profiles', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM profiles t),
      'products', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM products t),
      'product_folders', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM product_folders t),
      'product_offers', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM product_offers t),
      'product_testimonials', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM product_testimonials t),
      'product_checkout_configs', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM product_checkout_configs t),
      'checkout_offers', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM checkout_offers t),
      'checkout_templates', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM checkout_templates t),
      'popup_configurations', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM popup_configurations t),
      'pix_transactions', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM pix_transactions t),
      'withdrawal_requests', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM withdrawal_requests t),
      'rewards', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM rewards t),
      'reward_requests', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM reward_requests t),
      'fee_configs', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM fee_configs t),
      'available_domains', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM available_domains t),
      'admin_settings', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM admin_settings t),
      'finance_accounts', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM finance_accounts t),
      'finance_categories', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM finance_categories t),
      'finance_transactions', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM finance_transactions t),
      'finance_goals', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM finance_goals t),
      'collaborator_permissions', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM collaborator_permissions t),
      'user_documents', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM user_documents t),
      'user_verification', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM user_verification t),
      'api_clients', (SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) FROM api_clients t)
    ),
    'statistics', json_build_object(
      'total_profiles', (SELECT COUNT(*) FROM profiles),
      'total_products', (SELECT COUNT(*) FROM products),
      'total_transactions', (SELECT COUNT(*) FROM pix_transactions),
      'total_paid', (SELECT COUNT(*) FROM pix_transactions WHERE status = 'paid'),
      'total_amount_paid', (SELECT COALESCE(SUM(amount), 0) FROM pix_transactions WHERE status = 'paid')
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Adicionar comentários de documentação
COMMENT ON FUNCTION public.auto_full_system_backup() IS 'Backup automático completo do sistema. Corrigido em 2024-12 para remover referências a tabelas inexistentes (chat_flows, chat_blocks).';
COMMENT ON FUNCTION public.export_full_backup() IS 'Exportação completa do sistema em JSON. Corrigido em 2024-12 para remover referências a tabelas inexistentes (chat_flows, chat_blocks).';
