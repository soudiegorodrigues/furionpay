-- Update log_pix_generated_user RPC to accept fingerprint_hash and client_ip
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
  p_acquirer TEXT DEFAULT 'manual',
  p_fingerprint_hash TEXT DEFAULT NULL,
  p_client_ip TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transaction_id UUID;
  v_brazil_now TIMESTAMPTZ;
  v_brazil_date DATE;
BEGIN
  -- Get current time in Brazil timezone
  v_brazil_now := NOW() AT TIME ZONE 'America/Sao_Paulo';
  v_brazil_date := v_brazil_now::DATE;

  -- Insert the transaction
  INSERT INTO public.pix_transactions (
    amount,
    txid,
    pix_code,
    donor_name,
    status,
    user_id,
    utm_data,
    product_name,
    popup_model,
    fee_percentage,
    fee_fixed,
    acquirer,
    fingerprint_hash,
    client_ip,
    created_at,
    created_date_brazil
  ) VALUES (
    p_amount,
    p_txid,
    p_pix_code,
    p_donor_name,
    'pending',
    p_user_id,
    p_utm_data,
    p_product_name,
    p_popup_model,
    p_fee_percentage,
    p_fee_fixed,
    p_acquirer,
    p_fingerprint_hash,
    p_client_ip,
    NOW(),
    v_brazil_date::TEXT
  )
  RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$;