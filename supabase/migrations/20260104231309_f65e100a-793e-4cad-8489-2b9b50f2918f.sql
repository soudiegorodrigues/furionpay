-- Atualizar a função get_global_transactions_paginated para incluir client_ip
CREATE OR REPLACE FUNCTION public.get_global_transactions_paginated(
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0,
  p_date_filter TEXT DEFAULT 'all',
  p_status_filter TEXT DEFAULT 'all',
  p_search TEXT DEFAULT ''
)
RETURNS TABLE (
  id UUID,
  amount NUMERIC,
  status TEXT,
  created_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  donor_name TEXT,
  donor_email TEXT,
  donor_cpf TEXT,
  product_name TEXT,
  popup_model TEXT,
  txid TEXT,
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  fee_percentage NUMERIC,
  fee_fixed NUMERIC,
  acquirer TEXT,
  is_manual_approval BOOLEAN,
  approved_by_email TEXT,
  utm_data JSONB,
  order_bumps JSONB,
  client_ip TEXT,
  total_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_date_start TIMESTAMPTZ;
  v_date_end TIMESTAMPTZ;
BEGIN
  -- Calcular filtro de data
  v_date_end := NOW();
  
  CASE p_date_filter
    WHEN 'today' THEN v_date_start := DATE_TRUNC('day', NOW() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
    WHEN 'yesterday' THEN 
      v_date_start := DATE_TRUNC('day', (NOW() AT TIME ZONE 'America/Sao_Paulo') - INTERVAL '1 day') AT TIME ZONE 'America/Sao_Paulo';
      v_date_end := DATE_TRUNC('day', NOW() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
    WHEN '7days' THEN v_date_start := NOW() - INTERVAL '7 days';
    WHEN '30days' THEN v_date_start := NOW() - INTERVAL '30 days';
    WHEN '90days' THEN v_date_start := NOW() - INTERVAL '90 days';
    ELSE v_date_start := NULL;
  END CASE;

  RETURN QUERY
  WITH filtered_transactions AS (
    SELECT 
      pt.id,
      pt.amount,
      pt.status::TEXT,
      pt.created_at,
      pt.paid_at,
      pt.donor_name,
      pt.donor_email,
      pt.donor_cpf,
      pt.product_name,
      pt.popup_model,
      pt.txid,
      pt.user_id,
      au.email AS user_email,
      p.full_name AS user_name,
      pt.fee_percentage,
      pt.fee_fixed,
      pt.acquirer,
      pt.is_manual_approval,
      pt.approved_by_email,
      pt.utm_data,
      pt.order_bumps,
      pt.client_ip
    FROM pix_transactions pt
    LEFT JOIN auth.users au ON pt.user_id = au.id
    LEFT JOIN profiles p ON pt.user_id = p.id
    WHERE 
      (v_date_start IS NULL OR pt.created_at >= v_date_start)
      AND (v_date_end IS NULL OR pt.created_at <= v_date_end)
      AND (p_status_filter = 'all' OR pt.status::TEXT = p_status_filter)
      AND (
        p_search = '' 
        OR pt.donor_name ILIKE '%' || p_search || '%'
        OR pt.donor_email ILIKE '%' || p_search || '%'
        OR pt.donor_cpf ILIKE '%' || p_search || '%'
        OR pt.txid ILIKE '%' || p_search || '%'
        OR pt.id::TEXT ILIKE '%' || p_search || '%'
        OR pt.product_name ILIKE '%' || p_search || '%'
        OR au.email ILIKE '%' || p_search || '%'
        OR p.full_name ILIKE '%' || p_search || '%'
        OR pt.client_ip ILIKE '%' || p_search || '%'
      )
  )
  SELECT 
    ft.id,
    ft.amount,
    ft.status,
    ft.created_at,
    ft.paid_at,
    ft.donor_name,
    ft.donor_email,
    ft.donor_cpf,
    ft.product_name,
    ft.popup_model,
    ft.txid,
    ft.user_id,
    ft.user_email,
    ft.user_name,
    ft.fee_percentage,
    ft.fee_fixed,
    ft.acquirer,
    ft.is_manual_approval,
    ft.approved_by_email,
    ft.utm_data,
    ft.order_bumps,
    ft.client_ip,
    COUNT(*) OVER() AS total_count
  FROM filtered_transactions ft
  ORDER BY ft.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;