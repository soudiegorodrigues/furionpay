-- Adicionar colunas para rastreamento de aprovação manual
ALTER TABLE pix_transactions 
ADD COLUMN IF NOT EXISTS approved_by_email TEXT DEFAULT NULL;

ALTER TABLE pix_transactions 
ADD COLUMN IF NOT EXISTS is_manual_approval BOOLEAN DEFAULT FALSE;

-- Atualizar a função mark_pix_paid para receber e salvar o email do admin
CREATE OR REPLACE FUNCTION public.mark_pix_paid(p_txid text, p_admin_email text DEFAULT NULL) 
RETURNS boolean
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.pix_transactions
  SET 
    status = 'paid', 
    paid_at = now(),
    paid_date_brazil = (now() AT TIME ZONE 'America/Sao_Paulo')::DATE,
    approved_by_email = p_admin_email,
    is_manual_approval = CASE WHEN p_admin_email IS NOT NULL THEN TRUE ELSE FALSE END
  WHERE txid = p_txid AND status = 'generated';
  
  RETURN FOUND;
END;
$$;

-- Recriar a função get_global_transactions_v2 para incluir as novas colunas
CREATE OR REPLACE FUNCTION public.get_global_transactions_v2(
  p_date_filter text DEFAULT NULL,
  p_email_search text DEFAULT NULL,
  p_limit integer DEFAULT 1000,
  p_offset integer DEFAULT 0,
  p_status text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  amount numeric,
  status pix_status,
  txid text,
  donor_name text,
  product_name text,
  created_at timestamptz,
  paid_at timestamptz,
  user_email text,
  utm_data jsonb,
  acquirer text,
  total_count bigint,
  approved_by_email text,
  is_manual_approval boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total bigint;
BEGIN
  -- Verificar se é admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can view global transactions';
  END IF;

  -- Contar total de registros
  SELECT COUNT(*) INTO v_total FROM pix_transactions;

  RETURN QUERY
  SELECT 
    pt.id,
    pt.amount,
    pt.status,
    pt.txid,
    pt.donor_name,
    pt.product_name,
    pt.created_at,
    pt.paid_at,
    u.email::text as user_email,
    pt.utm_data,
    pt.acquirer,
    v_total as total_count,
    pt.approved_by_email,
    pt.is_manual_approval
  FROM pix_transactions pt
  LEFT JOIN auth.users u ON u.id = pt.user_id
  ORDER BY pt.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;