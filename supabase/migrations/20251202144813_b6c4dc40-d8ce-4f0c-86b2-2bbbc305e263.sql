-- Add UTM data column to pix_transactions
ALTER TABLE public.pix_transactions 
ADD COLUMN IF NOT EXISTS utm_data jsonb DEFAULT NULL;

-- Update the log_pix_generated function to accept UTM data
CREATE OR REPLACE FUNCTION public.log_pix_generated(
  p_amount numeric, 
  p_txid text, 
  p_pix_code text, 
  p_donor_name text,
  p_utm_data jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.pix_transactions (amount, txid, pix_code, donor_name, status, utm_data)
  VALUES (p_amount, p_txid, p_pix_code, p_donor_name, 'generated', p_utm_data)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$function$;