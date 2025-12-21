-- Remove a função antiga sem o parâmetro admin_email para resolver o conflito de sobrecarga
DROP FUNCTION IF EXISTS public.mark_pix_paid(text);

-- Recriar a função mark_pix_paid com parâmetro opcional para admin_email
CREATE OR REPLACE FUNCTION public.mark_pix_paid(p_txid text, p_admin_email text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_transaction RECORD;
  v_brazil_now TIMESTAMPTZ;
  v_brazil_date DATE;
BEGIN
  -- Get Brazil timezone timestamp
  v_brazil_now := NOW() AT TIME ZONE 'America/Sao_Paulo';
  v_brazil_date := v_brazil_now::DATE;

  -- Get transaction details
  SELECT * INTO v_transaction
  FROM pix_transactions
  WHERE txid = p_txid AND status = 'pending';

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Update transaction to paid
  UPDATE pix_transactions
  SET 
    status = 'paid',
    paid_at = NOW(),
    paid_date_brazil = v_brazil_date,
    is_manual_approval = CASE WHEN p_admin_email IS NOT NULL THEN true ELSE false END,
    approved_by_email = p_admin_email
  WHERE txid = p_txid AND status = 'pending';

  RETURN FOUND;
END;
$function$;