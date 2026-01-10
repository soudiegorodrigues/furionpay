-- Dropar TODAS as versões das funções para limpar conflitos
DROP FUNCTION IF EXISTS public.create_full_system_backup(text);
DROP FUNCTION IF EXISTS public.create_full_system_backup(text, uuid);
DROP FUNCTION IF EXISTS public.create_full_system_backup();

-- Também limpar create_light_backup para evitar conflitos similares
DROP FUNCTION IF EXISTS public.create_light_backup(text);
DROP FUNCTION IF EXISTS public.create_light_backup(text, uuid);
DROP FUNCTION IF EXISTS public.create_light_backup();

-- Recriar função create_full_system_backup SEM parâmetros obrigatórios
CREATE OR REPLACE FUNCTION public.create_full_system_backup()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_backup_id uuid;
  v_admin_data jsonb;
  v_products_data jsonb;
  v_offers_data jsonb;
  v_profiles_data jsonb;
  v_pix_data jsonb;
  v_templates_data jsonb;
  v_popups_data jsonb;
  v_rewards_data jsonb;
  v_total_records integer := 0;
BEGIN
  -- Coletar dados administrativos
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_admin_data FROM admin_settings t;
  
  -- Coletar produtos
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_products_data FROM products t;
  
  -- Coletar ofertas
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_offers_data FROM product_offers t;
  
  -- Coletar perfis
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_profiles_data FROM profiles t;
  
  -- Coletar transações PIX (LIMITADO aos últimos 30 dias para evitar timeout)
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) 
  INTO v_pix_data 
  FROM pix_transactions t 
  WHERE t.created_at > NOW() - INTERVAL '30 days';
  
  -- Coletar templates
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_templates_data FROM checkout_templates t;
  
  -- Coletar popups
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_popups_data FROM popup_models t;
  
  -- Coletar recompensas
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_rewards_data FROM ranking_rewards t;
  
  -- Calcular total de registros
  v_total_records := 
    jsonb_array_length(v_admin_data) +
    jsonb_array_length(v_products_data) +
    jsonb_array_length(v_offers_data) +
    jsonb_array_length(v_profiles_data) +
    jsonb_array_length(v_pix_data) +
    jsonb_array_length(v_templates_data) +
    jsonb_array_length(v_popups_data) +
    jsonb_array_length(v_rewards_data);
  
  -- Inserir backup
  INSERT INTO system_backups (
    backup_type,
    admin_settings_data,
    products_data,
    offers_data,
    profiles_data,
    pix_transactions_data,
    templates_data,
    popup_models_data,
    rewards_data,
    total_records,
    status,
    backup_name
  ) VALUES (
    'full',
    v_admin_data,
    v_products_data,
    v_offers_data,
    v_profiles_data,
    v_pix_data,
    v_templates_data,
    v_popups_data,
    v_rewards_data,
    v_total_records,
    'completed',
    'Backup completo (PIX últimos 30 dias)'
  ) RETURNING id INTO v_backup_id;
  
  RETURN v_backup_id;
END;
$$;

-- Recriar função create_light_backup SEM parâmetros obrigatórios
CREATE OR REPLACE FUNCTION public.create_light_backup()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_backup_id uuid;
  v_admin_data jsonb;
  v_products_data jsonb;
  v_offers_data jsonb;
  v_profiles_data jsonb;
  v_templates_data jsonb;
  v_popups_data jsonb;
  v_rewards_data jsonb;
  v_total_records integer := 0;
BEGIN
  -- Coletar dados administrativos
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_admin_data FROM admin_settings t;
  
  -- Coletar produtos
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_products_data FROM products t;
  
  -- Coletar ofertas
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_offers_data FROM product_offers t;
  
  -- Coletar perfis
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_profiles_data FROM profiles t;
  
  -- Coletar templates
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_templates_data FROM checkout_templates t;
  
  -- Coletar popups
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_popups_data FROM popup_models t;
  
  -- Coletar recompensas
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_rewards_data FROM ranking_rewards t;
  
  -- Calcular total de registros (sem PIX e withdrawals)
  v_total_records := 
    jsonb_array_length(v_admin_data) +
    jsonb_array_length(v_products_data) +
    jsonb_array_length(v_offers_data) +
    jsonb_array_length(v_profiles_data) +
    jsonb_array_length(v_templates_data) +
    jsonb_array_length(v_popups_data) +
    jsonb_array_length(v_rewards_data);
  
  -- Inserir backup LEVE (sem transações PIX e saques)
  INSERT INTO system_backups (
    backup_type,
    admin_settings_data,
    products_data,
    offers_data,
    profiles_data,
    pix_transactions_data,
    templates_data,
    popup_models_data,
    rewards_data,
    total_records,
    status,
    backup_name
  ) VALUES (
    'light',
    v_admin_data,
    v_products_data,
    v_offers_data,
    v_profiles_data,
    '[]'::jsonb,
    v_templates_data,
    v_popups_data,
    v_rewards_data,
    v_total_records,
    'completed',
    'Backup leve (apenas configurações)'
  ) RETURNING id INTO v_backup_id;
  
  RETURN v_backup_id;
END;
$$;