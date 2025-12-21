-- Fix mark_pix_paid function to NOT update paid_date_brazil
-- paid_date_brazil is a GENERATED column that auto-calculates from paid_at
-- Trying to update it directly causes error: "column can only be updated to DEFAULT"

CREATE OR REPLACE FUNCTION public.mark_pix_paid(
  p_txid text,
  p_admin_email text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- paid_date_brazil is auto-generated from paid_at, so we only set paid_at
  UPDATE public.pix_transactions
  SET
    status = 'paid',
    paid_at = now(),
    is_manual_approval = CASE WHEN p_admin_email IS NOT NULL THEN true ELSE false END,
    approved_by_email = p_admin_email
  WHERE txid = p_txid
    AND status = 'generated';

  RETURN FOUND;
END;
$function$;