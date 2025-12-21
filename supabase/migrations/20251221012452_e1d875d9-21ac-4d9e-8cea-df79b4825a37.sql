-- Recriar a função mark_pix_paid sem atualizar paid_date_brazil diretamente
-- A coluna paid_date_brazil é GENERATED e será calculada automaticamente
CREATE OR REPLACE FUNCTION public.mark_pix_paid(p_txid text, p_admin_email text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.pix_transactions
  SET 
    status = 'paid', 
    paid_at = now(),
    approved_by_email = p_admin_email,
    is_manual_approval = CASE WHEN p_admin_email IS NOT NULL THEN TRUE ELSE FALSE END
  WHERE txid = p_txid AND status = 'generated';
  
  RETURN FOUND;
END;
$function$;