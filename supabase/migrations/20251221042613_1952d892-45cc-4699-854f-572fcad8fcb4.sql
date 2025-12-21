-- Drop and recreate the log_pix_generated_user function with all parameters
DROP FUNCTION IF EXISTS public.log_pix_generated_user(numeric, text, text, text, jsonb, text, uuid);
DROP FUNCTION IF EXISTS public.log_pix_generated_user(numeric, text, text, text, jsonb, text, uuid, text, numeric, numeric, text, text, text);

CREATE OR REPLACE FUNCTION public.log_pix_generated_user(
  p_amount numeric,
  p_txid text,
  p_pix_code text,
  p_donor_name text,
  p_utm_data jsonb DEFAULT NULL::jsonb,
  p_product_name text DEFAULT NULL::text,
  p_user_id uuid DEFAULT NULL::uuid,
  p_popup_model text DEFAULT NULL::text,
  p_fee_percentage numeric DEFAULT NULL::numeric,
  p_fee_fixed numeric DEFAULT NULL::numeric,
  p_acquirer text DEFAULT 'valorion'::text,
  p_fingerprint_hash text DEFAULT NULL::text,
  p_client_ip text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id UUID;
  v_brazil_date DATE;
BEGIN
  -- Calculate Brazil date
  v_brazil_date := (NOW() AT TIME ZONE 'America/Sao_Paulo')::date;
  
  INSERT INTO public.pix_transactions (
    amount, 
    txid, 
    pix_code, 
    donor_name, 
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
  )
  VALUES (
    p_amount, 
    p_txid, 
    p_pix_code, 
    p_donor_name, 
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
    v_brazil_date
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$function$;