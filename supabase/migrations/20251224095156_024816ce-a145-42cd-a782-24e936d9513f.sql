-- =====================================================
-- CORREÇÃO URGENTE: Remover funções duplicadas que causam PGRST203
-- =====================================================

-- Primeiro, remover TODAS as versões de log_pix_generated (básica)
DROP FUNCTION IF EXISTS public.log_pix_generated(numeric, text, text, text);
DROP FUNCTION IF EXISTS public.log_pix_generated(numeric, text, text, text, jsonb);
DROP FUNCTION IF EXISTS public.log_pix_generated(numeric, text, text, text, jsonb, text);
DROP FUNCTION IF EXISTS public.log_pix_generated(numeric, text, text, text, jsonb, text, text);
DROP FUNCTION IF EXISTS public.log_pix_generated(numeric, text, text, text, jsonb, text, text, text);

-- Remover TODAS as versões de log_pix_generated_user (com variações de parâmetros)
-- Versões com diferentes quantidades de parâmetros
DROP FUNCTION IF EXISTS public.log_pix_generated_user(uuid, numeric, text, text, text);
DROP FUNCTION IF EXISTS public.log_pix_generated_user(uuid, numeric, text, text, text, jsonb);
DROP FUNCTION IF EXISTS public.log_pix_generated_user(uuid, numeric, text, text, text, jsonb, text);
DROP FUNCTION IF EXISTS public.log_pix_generated_user(uuid, numeric, text, text, text, jsonb, text, text);
DROP FUNCTION IF EXISTS public.log_pix_generated_user(uuid, numeric, text, text, text, jsonb, text, text, text);
DROP FUNCTION IF EXISTS public.log_pix_generated_user(uuid, numeric, text, text, text, jsonb, text, text, text, text);
DROP FUNCTION IF EXISTS public.log_pix_generated_user(uuid, numeric, text, text, text, jsonb, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.log_pix_generated_user(uuid, numeric, text, text, text, jsonb, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.log_pix_generated_user(uuid, numeric, text, text, text, jsonb, text, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.log_pix_generated_user(uuid, numeric, text, text, text, jsonb, text, text, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.log_pix_generated_user(uuid, numeric, text, text, text, jsonb, text, text, text, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.log_pix_generated_user(uuid, numeric, text, text, text, jsonb, text, text, text, text, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.log_pix_generated_user(uuid, numeric, text, text, text, jsonb, text, text, text, text, text, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.log_pix_generated_user(uuid, numeric, text, text, text, jsonb, text, text, text, text, text, text, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.log_pix_generated_user(uuid, numeric, text, text, text, jsonb, text, text, text, text, text, text, text, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.log_pix_generated_user(uuid, numeric, text, text, text, jsonb, text, text, text, text, text, text, text, text, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.log_pix_generated_user(uuid, numeric, text, text, text, jsonb, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.log_pix_generated_user(uuid, numeric, text, text, text, jsonb, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.log_pix_generated_user(uuid, numeric, text, text, text, jsonb, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.log_pix_generated_user(uuid, numeric, text, text, text, jsonb, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text);

-- Versões com order_bumps (jsonb) em diferentes posições
DROP FUNCTION IF EXISTS public.log_pix_generated_user(uuid, numeric, text, text, text, jsonb, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb);
DROP FUNCTION IF EXISTS public.log_pix_generated_user(uuid, numeric, text, text, text, jsonb, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, jsonb, text);

-- =====================================================
-- CRIAR FUNÇÃO ÚNICA E DEFINITIVA
-- =====================================================

CREATE OR REPLACE FUNCTION public.log_pix_generated_user(
  p_user_id uuid,
  p_amount numeric,
  p_txid text,
  p_pix_code text,
  p_product_name text,
  p_utm_data jsonb DEFAULT NULL,
  p_popup_model text DEFAULT NULL,
  p_donor_name text DEFAULT NULL,
  p_donor_email text DEFAULT NULL,
  p_donor_phone text DEFAULT NULL,
  p_donor_cpf text DEFAULT NULL,
  p_donor_birthdate text DEFAULT NULL,
  p_donor_cep text DEFAULT NULL,
  p_donor_street text DEFAULT NULL,
  p_donor_number text DEFAULT NULL,
  p_donor_complement text DEFAULT NULL,
  p_donor_neighborhood text DEFAULT NULL,
  p_donor_city text DEFAULT NULL,
  p_donor_state text DEFAULT NULL,
  p_fingerprint_hash text DEFAULT NULL,
  p_client_ip text DEFAULT NULL,
  p_acquirer text DEFAULT 'valorion',
  p_fee_percentage numeric DEFAULT NULL,
  p_fee_fixed numeric DEFAULT NULL,
  p_order_bumps jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction_id uuid;
  v_brazil_now timestamptz;
  v_brazil_date date;
  v_birthdate date;
  v_fee_config record;
BEGIN
  -- Get current time in Brazil timezone
  v_brazil_now := NOW() AT TIME ZONE 'America/Sao_Paulo';
  v_brazil_date := v_brazil_now::date;
  
  -- Parse birthdate if provided
  IF p_donor_birthdate IS NOT NULL AND p_donor_birthdate != '' THEN
    BEGIN
      v_birthdate := p_donor_birthdate::date;
    EXCEPTION WHEN OTHERS THEN
      v_birthdate := NULL;
    END;
  END IF;
  
  -- Get fee config if not provided
  IF p_fee_percentage IS NULL OR p_fee_fixed IS NULL THEN
    -- Try to get user-specific fee config
    SELECT fc.pix_percentage, fc.pix_fixed INTO v_fee_config
    FROM admin_settings ast
    JOIN fee_configs fc ON fc.id = ast.value::uuid
    WHERE ast.user_id = p_user_id AND ast.key = 'user_fee_config'
    LIMIT 1;
    
    -- Fallback to default fee config
    IF v_fee_config IS NULL THEN
      SELECT pix_percentage, pix_fixed INTO v_fee_config
      FROM fee_configs
      WHERE is_default = true
      LIMIT 1;
    END IF;
  END IF;
  
  -- Insert the transaction
  INSERT INTO pix_transactions (
    user_id,
    amount,
    txid,
    pix_code,
    product_name,
    utm_data,
    popup_model,
    donor_name,
    donor_email,
    donor_phone,
    donor_cpf,
    donor_birthdate,
    donor_cep,
    donor_street,
    donor_number,
    donor_complement,
    donor_neighborhood,
    donor_city,
    donor_state,
    fingerprint_hash,
    client_ip,
    acquirer,
    fee_percentage,
    fee_fixed,
    order_bumps,
    status,
    created_at,
    created_date_brazil
  ) VALUES (
    p_user_id,
    p_amount,
    p_txid,
    p_pix_code,
    p_product_name,
    p_utm_data,
    p_popup_model,
    p_donor_name,
    p_donor_email,
    p_donor_phone,
    p_donor_cpf,
    v_birthdate,
    p_donor_cep,
    p_donor_street,
    p_donor_number,
    p_donor_complement,
    p_donor_neighborhood,
    p_donor_city,
    p_donor_state,
    p_fingerprint_hash,
    p_client_ip,
    COALESCE(p_acquirer, 'valorion'),
    COALESCE(p_fee_percentage, v_fee_config.pix_percentage),
    COALESCE(p_fee_fixed, v_fee_config.pix_fixed),
    p_order_bumps,
    'generated',
    v_brazil_now,
    v_brazil_date
  )
  RETURNING id INTO v_transaction_id;
  
  RETURN v_transaction_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.log_pix_generated_user(
  uuid, numeric, text, text, text, jsonb, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, numeric, numeric, jsonb
) TO anon, authenticated, service_role;