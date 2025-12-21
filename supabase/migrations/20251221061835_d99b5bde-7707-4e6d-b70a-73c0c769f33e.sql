-- Fix mark_pix_paid to use the correct pix_status values (generated/paid/expired)
-- The previous version compared status = 'pending', which is not a valid pix_status enum value.

CREATE OR REPLACE FUNCTION public.mark_pix_paid(
  p_txid text,
  p_admin_email text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_brazil_now timestamptz;
  v_brazil_date date;
BEGIN
  -- Brazil timezone date for paid_date_brazil
  v_brazil_now := NOW() AT TIME ZONE 'America/Sao_Paulo';
  v_brazil_date := v_brazil_now::date;

  UPDATE public.pix_transactions
  SET
    status = 'paid',
    paid_at = now(),
    paid_date_brazil = v_brazil_date,
    is_manual_approval = CASE WHEN p_admin_email IS NOT NULL THEN true ELSE false END,
    approved_by_email = p_admin_email
  WHERE txid = p_txid
    AND status = 'generated';

  RETURN FOUND;
END;
$function$;