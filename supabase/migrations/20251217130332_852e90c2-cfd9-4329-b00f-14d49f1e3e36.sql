-- ============================================
-- OTIMIZAÇÃO: Transações Globais
-- ============================================

-- 1. Índices otimizados para filtros comuns
CREATE INDEX IF NOT EXISTS idx_pix_transactions_created_at_desc 
ON pix_transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pix_transactions_status 
ON pix_transactions(status);

-- Índice composto para filtros combinados mais comuns
CREATE INDEX IF NOT EXISTS idx_pix_transactions_status_created 
ON pix_transactions(status, created_at DESC);

-- 2. Função RPC otimizada com filtros server-side
CREATE OR REPLACE FUNCTION public.get_global_transactions_v2(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_status text DEFAULT NULL,
  p_date_filter text DEFAULT NULL,
  p_email_search text DEFAULT NULL
)
RETURNS TABLE(
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
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total bigint;
  v_brazil_now timestamptz;
  v_start_date timestamptz;
BEGIN
  -- Verificar se é admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can view global transactions';
  END IF;

  -- Calcular data atual no Brasil
  v_brazil_now := NOW() AT TIME ZONE 'America/Sao_Paulo';
  
  -- Calcular data de início baseado no filtro
  IF p_date_filter = 'today' THEN
    v_start_date := DATE_TRUNC('day', v_brazil_now)::timestamptz;
  ELSIF p_date_filter = '7days' THEN
    v_start_date := (DATE_TRUNC('day', v_brazil_now) - INTERVAL '7 days')::timestamptz;
  ELSIF p_date_filter = 'month' THEN
    v_start_date := DATE_TRUNC('month', v_brazil_now)::timestamptz;
  ELSIF p_date_filter = 'year' THEN
    v_start_date := DATE_TRUNC('year', v_brazil_now)::timestamptz;
  ELSE
    v_start_date := NULL;
  END IF;

  -- Contar total com filtros
  SELECT COUNT(*) INTO v_total
  FROM pix_transactions pt
  LEFT JOIN auth.users u ON pt.user_id = u.id
  WHERE 
    (p_status IS NULL OR pt.status::text = p_status)
    AND (v_start_date IS NULL OR pt.created_at >= v_start_date)
    AND (p_email_search IS NULL OR p_email_search = '' OR u.email ILIKE '%' || p_email_search || '%');

  -- Retornar dados paginados
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
    v_total as total_count
  FROM pix_transactions pt
  LEFT JOIN auth.users u ON pt.user_id = u.id
  WHERE 
    (p_status IS NULL OR pt.status::text = p_status)
    AND (v_start_date IS NULL OR pt.created_at >= v_start_date)
    AND (p_email_search IS NULL OR p_email_search = '' OR u.email ILIKE '%' || p_email_search || '%')
  ORDER BY pt.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;