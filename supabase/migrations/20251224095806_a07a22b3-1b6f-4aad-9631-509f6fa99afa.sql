-- Force drop ALL versions of log_pix_generated_user regardless of signature
DO $$
DECLARE
  func_record RECORD;
BEGIN
  FOR func_record IN 
    SELECT oid::regprocedure::text as func_signature
    FROM pg_proc 
    WHERE proname = 'log_pix_generated_user' 
    AND pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || func_record.func_signature || ' CASCADE';
    RAISE NOTICE 'Dropped function: %', func_record.func_signature;
  END LOOP;
END $$;

-- Recreate the SINGLE definitive function
CREATE FUNCTION public.log_pix_generated_user(
  p_user_id uuid,
  p_txid text,
  p_amount numeric,
  p_pix_code text,
  p_product_name text DEFAULT NULL,
  p_popup_model text DEFAULT NULL,
  p_acquirer text DEFAULT NULL,
  p_donor_name text DEFAULT NULL,
  p_donor_email text DEFAULT NULL,
  p_donor_cpf text DEFAULT NULL,
  p_donor_phone text DEFAULT NULL,
  p_donor_cep text DEFAULT NULL,
  p_donor_street text DEFAULT NULL,
  p_donor_number text DEFAULT NULL,
  p_donor_complement text DEFAULT NULL,
  p_donor_neighborhood text DEFAULT NULL,
  p_donor_city text DEFAULT NULL,
  p_donor_state text DEFAULT NULL,
  p_donor_birthdate text DEFAULT NULL,
  p_fee_percentage numeric DEFAULT NULL,
  p_fee_fixed numeric DEFAULT NULL,
  p_fingerprint_hash text DEFAULT NULL,
  p_client_ip text DEFAULT NULL,
  p_utm_data jsonb DEFAULT NULL,
  p_order_bumps jsonb DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction_id uuid;
  v_birthdate date;
BEGIN
  IF p_donor_birthdate IS NOT NULL AND p_donor_birthdate != '' THEN
    BEGIN
      v_birthdate := p_donor_birthdate::date;
    EXCEPTION WHEN OTHERS THEN
      v_birthdate := NULL;
    END;
  ELSE
    v_birthdate := NULL;
  END IF;

  INSERT INTO pix_transactions (
    user_id, txid, amount, pix_code, product_name, popup_model, acquirer,
    donor_name, donor_email, donor_cpf, donor_phone, donor_cep, donor_street,
    donor_number, donor_complement, donor_neighborhood, donor_city, donor_state,
    donor_birthdate, fee_percentage, fee_fixed, fingerprint_hash, client_ip,
    utm_data, order_bumps, status
  ) VALUES (
    p_user_id, p_txid, p_amount, p_pix_code, p_product_name, p_popup_model, p_acquirer,
    p_donor_name, p_donor_email, p_donor_cpf, p_donor_phone, p_donor_cep, p_donor_street,
    p_donor_number, p_donor_complement, p_donor_neighborhood, p_donor_city, p_donor_state,
    v_birthdate, p_fee_percentage, p_fee_fixed, p_fingerprint_hash, p_client_ip,
    p_utm_data, p_order_bumps, 'generated'
  )
  RETURNING id INTO v_transaction_id;
  
  RETURN v_transaction_id;
END;
$$;