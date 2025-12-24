
-- Drop ALL versions of log_pix_generated_user by querying system catalog
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT 
      p.proname,
      pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname IN ('log_pix_generated', 'log_pix_generated_user')
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', r.proname, r.args);
    RAISE NOTICE 'Dropped function: %.%(%)', 'public', r.proname, r.args;
  END LOOP;
END $$;

-- Create single version of log_pix_generated_user with 23 parameters (matching the current call)
CREATE OR REPLACE FUNCTION public.log_pix_generated_user(
  p_amount NUMERIC,
  p_txid TEXT,
  p_pix_code TEXT,
  p_donor_name TEXT,
  p_utm_data JSONB DEFAULT NULL,
  p_product_name TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_popup_model TEXT DEFAULT NULL,
  p_fee_percentage NUMERIC DEFAULT NULL,
  p_fee_fixed NUMERIC DEFAULT NULL,
  p_acquirer TEXT DEFAULT 'ativus',
  p_fingerprint_hash TEXT DEFAULT NULL,
  p_client_ip TEXT DEFAULT NULL,
  p_donor_email TEXT DEFAULT NULL,
  p_donor_phone TEXT DEFAULT NULL,
  p_donor_cpf TEXT DEFAULT NULL,
  p_donor_birthdate TEXT DEFAULT NULL,
  p_donor_cep TEXT DEFAULT NULL,
  p_donor_street TEXT DEFAULT NULL,
  p_donor_number TEXT DEFAULT NULL,
  p_donor_complement TEXT DEFAULT NULL,
  p_donor_neighborhood TEXT DEFAULT NULL,
  p_donor_city TEXT DEFAULT NULL,
  p_donor_state TEXT DEFAULT NULL,
  p_order_bumps JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  new_id UUID;
  brazil_now TIMESTAMP WITH TIME ZONE;
BEGIN
  brazil_now := (now() AT TIME ZONE 'America/Sao_Paulo');
  
  INSERT INTO public.pix_transactions (
    id,
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
    gen_random_uuid(),
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
    p_donor_birthdate,
    p_donor_cep,
    p_donor_street,
    p_donor_number,
    p_donor_complement,
    p_donor_neighborhood,
    p_donor_city,
    p_donor_state,
    p_fingerprint_hash,
    p_client_ip,
    p_acquirer,
    p_fee_percentage,
    p_fee_fixed,
    p_order_bumps,
    'generated',
    now(),
    brazil_now::DATE
  )
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$func$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.log_pix_generated_user TO authenticated, anon, service_role;
