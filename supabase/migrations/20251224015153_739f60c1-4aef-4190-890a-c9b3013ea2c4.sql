-- Drop existing function and recreate with all customer data fields
DROP FUNCTION IF EXISTS public.log_pix_generated_user(NUMERIC, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, UUID, TEXT, NUMERIC, NUMERIC, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.log_pix_generated_user(
  p_amount NUMERIC,
  p_txid TEXT,
  p_pix_code TEXT,
  p_donor_name TEXT DEFAULT NULL,
  p_donor_email TEXT DEFAULT NULL,
  p_donor_phone TEXT DEFAULT NULL,
  p_donor_cpf TEXT DEFAULT NULL,
  p_donor_birthdate DATE DEFAULT NULL,
  p_donor_cep TEXT DEFAULT NULL,
  p_donor_street TEXT DEFAULT NULL,
  p_donor_number TEXT DEFAULT NULL,
  p_donor_complement TEXT DEFAULT NULL,
  p_donor_neighborhood TEXT DEFAULT NULL,
  p_donor_city TEXT DEFAULT NULL,
  p_donor_state TEXT DEFAULT NULL,
  p_utm_data JSONB DEFAULT NULL,
  p_product_name TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_popup_model TEXT DEFAULT NULL,
  p_fee_percentage NUMERIC DEFAULT NULL,
  p_fee_fixed NUMERIC DEFAULT NULL,
  p_fingerprint_hash TEXT DEFAULT NULL,
  p_client_ip TEXT DEFAULT NULL,
  p_acquirer TEXT DEFAULT 'valorion'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.pix_transactions (
    amount, 
    txid, 
    pix_code, 
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
    status, 
    utm_data, 
    product_name, 
    user_id, 
    popup_model, 
    fee_percentage, 
    fee_fixed, 
    fingerprint_hash, 
    client_ip, 
    acquirer
  )
  VALUES (
    p_amount, 
    p_txid, 
    p_pix_code, 
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
    'generated', 
    p_utm_data, 
    p_product_name, 
    p_user_id, 
    p_popup_model,
    p_fee_percentage, 
    p_fee_fixed, 
    p_fingerprint_hash, 
    p_client_ip, 
    p_acquirer
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;