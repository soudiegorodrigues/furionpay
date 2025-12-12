-- 1. Adicionar colunas fee_percentage e fee_fixed na tabela pix_transactions
ALTER TABLE public.pix_transactions 
ADD COLUMN IF NOT EXISTS fee_percentage numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS fee_fixed numeric DEFAULT NULL;

-- 2. Dropar funções existentes com assinatura exata para poder recriar com novos campos
DROP FUNCTION IF EXISTS public.get_user_transactions(integer);
DROP FUNCTION IF EXISTS public.get_pix_transactions_auth(integer);
DROP FUNCTION IF EXISTS public.log_pix_generated_user(numeric, text, text, text, jsonb, text, uuid, text);

-- 3. Recriar log_pix_generated_user com parâmetros de taxa
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
  p_fee_fixed numeric DEFAULT NULL::numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.pix_transactions (amount, txid, pix_code, donor_name, status, utm_data, product_name, user_id, popup_model, fee_percentage, fee_fixed)
  VALUES (p_amount, p_txid, p_pix_code, p_donor_name, 'generated', p_utm_data, p_product_name, p_user_id, p_popup_model, p_fee_percentage, p_fee_fixed)
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$function$;

-- 4. Recriar get_user_transactions com campos de taxa
CREATE OR REPLACE FUNCTION public.get_user_transactions(p_limit integer DEFAULT 50)
RETURNS TABLE(
  id uuid, 
  amount numeric, 
  status pix_status, 
  txid text, 
  donor_name text, 
  product_name text, 
  created_at timestamp with time zone, 
  paid_at timestamp with time zone,
  fee_percentage numeric,
  fee_fixed numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  RETURN QUERY
  SELECT t.id, t.amount, t.status, t.txid, t.donor_name, t.product_name, t.created_at, t.paid_at, t.fee_percentage, t.fee_fixed
  FROM public.pix_transactions t
  WHERE t.user_id = auth.uid()
  ORDER BY t.created_at DESC
  LIMIT p_limit;
END;
$function$;

-- 5. Recriar get_pix_transactions_auth com campos de taxa
CREATE OR REPLACE FUNCTION public.get_pix_transactions_auth(p_limit integer DEFAULT 100)
RETURNS TABLE(
  amount numeric, 
  created_at timestamp with time zone, 
  donor_name text, 
  id uuid, 
  paid_at timestamp with time zone, 
  product_name text, 
  status pix_status, 
  txid text, 
  user_email text,
  fee_percentage numeric,
  fee_fixed numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if user is admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    pt.amount,
    pt.created_at,
    pt.donor_name,
    pt.id,
    pt.paid_at,
    pt.product_name,
    pt.status,
    pt.txid,
    u.email::text as user_email,
    pt.fee_percentage,
    pt.fee_fixed
  FROM pix_transactions pt
  LEFT JOIN auth.users u ON u.id = pt.user_id
  ORDER BY pt.created_at DESC
  LIMIT p_limit;
END;
$function$;