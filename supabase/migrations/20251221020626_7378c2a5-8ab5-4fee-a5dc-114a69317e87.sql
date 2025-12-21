-- Função para buscar transações globais com paginação no servidor (apenas admins)
CREATE OR REPLACE FUNCTION public.get_global_transactions_paginated(
  p_page integer DEFAULT 1,
  p_per_page integer DEFAULT 10,
  p_date_filter text DEFAULT 'all',
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_status text DEFAULT 'all',
  p_search text DEFAULT ''
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_offset integer;
  v_total_count bigint;
  v_transactions json;
  v_now timestamptz;
  v_start_of_today timestamptz;
BEGIN
  -- Verify admin role
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can view global transactions';
  END IF;

  -- Calculate offset
  v_offset := (p_page - 1) * p_per_page;
  
  -- Get current time in Brazil timezone
  v_now := NOW() AT TIME ZONE 'America/Sao_Paulo';
  v_start_of_today := date_trunc('day', v_now);

  -- Count total matching records
  SELECT COUNT(*) INTO v_total_count
  FROM pix_transactions pt
  LEFT JOIN auth.users u ON pt.user_id = u.id
  WHERE
    -- Date filter
    (
      p_date_filter = 'all' OR
      (p_date_filter = 'today' AND (pt.created_at AT TIME ZONE 'America/Sao_Paulo') >= v_start_of_today) OR
      (p_date_filter = 'yesterday' AND (pt.created_at AT TIME ZONE 'America/Sao_Paulo') >= v_start_of_today - INTERVAL '1 day' AND (pt.created_at AT TIME ZONE 'America/Sao_Paulo') < v_start_of_today) OR
      (p_date_filter = '7days' AND (pt.created_at AT TIME ZONE 'America/Sao_Paulo') >= v_start_of_today - INTERVAL '7 days') OR
      (p_date_filter = '15days' AND (pt.created_at AT TIME ZONE 'America/Sao_Paulo') >= v_start_of_today - INTERVAL '15 days') OR
      (p_date_filter = 'month' AND (pt.created_at AT TIME ZONE 'America/Sao_Paulo') >= date_trunc('month', v_now)) OR
      (p_date_filter = 'year' AND (pt.created_at AT TIME ZONE 'America/Sao_Paulo') >= date_trunc('year', v_now)) OR
      (p_date_filter = 'custom' AND p_start_date IS NOT NULL AND pt.created_at >= p_start_date AND pt.created_at <= COALESCE(p_end_date, p_start_date + INTERVAL '1 day'))
    )
    AND
    -- Status filter
    (p_status = 'all' OR pt.status::text = p_status)
    AND
    -- Search filter (email, name, product, txid)
    (
      p_search = '' OR p_search IS NULL OR
      u.email ILIKE '%' || p_search || '%' OR
      pt.donor_name ILIKE '%' || p_search || '%' OR
      pt.product_name ILIKE '%' || p_search || '%' OR
      pt.txid ILIKE '%' || p_search || '%'
    );

  -- Get paginated transactions
  SELECT json_agg(t ORDER BY t.created_at DESC) INTO v_transactions
  FROM (
    SELECT
      pt.id,
      pt.amount,
      pt.status::text,
      pt.txid,
      pt.donor_name,
      pt.product_name,
      pt.created_at,
      pt.paid_at,
      u.email as user_email,
      pt.utm_data,
      pt.acquirer,
      pt.approved_by_email,
      pt.is_manual_approval
    FROM pix_transactions pt
    LEFT JOIN auth.users u ON pt.user_id = u.id
    WHERE
      -- Date filter
      (
        p_date_filter = 'all' OR
        (p_date_filter = 'today' AND (pt.created_at AT TIME ZONE 'America/Sao_Paulo') >= v_start_of_today) OR
        (p_date_filter = 'yesterday' AND (pt.created_at AT TIME ZONE 'America/Sao_Paulo') >= v_start_of_today - INTERVAL '1 day' AND (pt.created_at AT TIME ZONE 'America/Sao_Paulo') < v_start_of_today) OR
        (p_date_filter = '7days' AND (pt.created_at AT TIME ZONE 'America/Sao_Paulo') >= v_start_of_today - INTERVAL '7 days') OR
        (p_date_filter = '15days' AND (pt.created_at AT TIME ZONE 'America/Sao_Paulo') >= v_start_of_today - INTERVAL '15 days') OR
        (p_date_filter = 'month' AND (pt.created_at AT TIME ZONE 'America/Sao_Paulo') >= date_trunc('month', v_now)) OR
        (p_date_filter = 'year' AND (pt.created_at AT TIME ZONE 'America/Sao_Paulo') >= date_trunc('year', v_now)) OR
        (p_date_filter = 'custom' AND p_start_date IS NOT NULL AND pt.created_at >= p_start_date AND pt.created_at <= COALESCE(p_end_date, p_start_date + INTERVAL '1 day'))
      )
      AND
      -- Status filter
      (p_status = 'all' OR pt.status::text = p_status)
      AND
      -- Search filter
      (
        p_search = '' OR p_search IS NULL OR
        u.email ILIKE '%' || p_search || '%' OR
        pt.donor_name ILIKE '%' || p_search || '%' OR
        pt.product_name ILIKE '%' || p_search || '%' OR
        pt.txid ILIKE '%' || p_search || '%'
      )
    ORDER BY pt.created_at DESC
    LIMIT p_per_page
    OFFSET v_offset
  ) t;

  -- Return result
  RETURN json_build_object(
    'transactions', COALESCE(v_transactions, '[]'::json),
    'total_count', v_total_count
  );
END;
$$;