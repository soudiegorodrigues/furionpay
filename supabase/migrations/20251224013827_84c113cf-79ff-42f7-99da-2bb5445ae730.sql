-- Update the log_pix_generated_user function to accept new customer data fields
CREATE OR REPLACE FUNCTION public.log_pix_generated_user(
  p_amount numeric,
  p_txid text,
  p_pix_code text,
  p_donor_name text,
  p_utm_data jsonb DEFAULT NULL,
  p_product_name text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_popup_model text DEFAULT NULL,
  p_fee_percentage numeric DEFAULT NULL,
  p_fee_fixed numeric DEFAULT NULL,
  p_acquirer text DEFAULT 'valorion',
  p_fingerprint_hash text DEFAULT NULL,
  p_client_ip text DEFAULT NULL,
  p_donor_email text DEFAULT NULL,
  p_donor_phone text DEFAULT NULL,
  p_donor_cpf text DEFAULT NULL,
  p_donor_birthdate date DEFAULT NULL,
  p_donor_cep text DEFAULT NULL,
  p_donor_street text DEFAULT NULL,
  p_donor_number text DEFAULT NULL,
  p_donor_complement text DEFAULT NULL,
  p_donor_neighborhood text DEFAULT NULL,
  p_donor_city text DEFAULT NULL,
  p_donor_state text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_date_brazil date;
BEGIN
  -- Calculate Brazil date
  v_date_brazil := (NOW() AT TIME ZONE 'America/Sao_Paulo')::date;
  
  INSERT INTO pix_transactions (
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
    acquirer,
    fingerprint_hash,
    client_ip,
    created_date_brazil
  ) VALUES (
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
    p_acquirer,
    p_fingerprint_hash,
    p_client_ip,
    v_date_brazil
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;