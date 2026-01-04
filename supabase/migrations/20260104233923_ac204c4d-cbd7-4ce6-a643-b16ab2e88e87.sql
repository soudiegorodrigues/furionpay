-- 1) Update the JSON RPC used by the admin UI (p_page/p_per_page/p_date_filter...)
CREATE OR REPLACE FUNCTION public.get_global_transactions_paginated(
  p_page integer DEFAULT 1,
  p_per_page integer DEFAULT 10,
  p_date_filter text DEFAULT 'all'::text,
  p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_status text DEFAULT 'all'::text,
  p_search text DEFAULT ''::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    -- Search filter (email, name, product, txid, ip)
    (
      p_search = '' OR p_search IS NULL OR
      u.email ILIKE '%' || p_search || '%' OR
      pt.donor_name ILIKE '%' || p_search || '%' OR
      pt.product_name ILIKE '%' || p_search || '%' OR
      pt.txid ILIKE '%' || p_search || '%' OR
      pt.client_ip ILIKE '%' || p_search || '%'
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
      pt.is_manual_approval,
      pt.client_ip
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
        pt.txid ILIKE '%' || p_search || '%' OR
        pt.client_ip ILIKE '%' || p_search || '%'
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
$function$;

-- 2) Fix linter warning: set a fixed search_path on the TABLE-returning overload
CREATE OR REPLACE FUNCTION public.get_global_transactions_paginated(
  p_limit integer DEFAULT 10,
  p_offset integer DEFAULT 0,
  p_date_filter text DEFAULT 'all'::text,
  p_status_filter text DEFAULT 'all'::text,
  p_search text DEFAULT ''::text
)
RETURNS TABLE(
  id uuid,
  amount numeric,
  status text,
  created_at timestamp with time zone,
  paid_at timestamp with time zone,
  donor_name text,
  donor_email text,
  donor_cpf text,
  product_name text,
  popup_model text,
  txid text,
  user_id uuid,
  user_email text,
  user_name text,
  fee_percentage numeric,
  fee_fixed numeric,
  acquirer text,
  is_manual_approval boolean,
  approved_by_email text,
  utm_data jsonb,
  order_bumps jsonb,
  client_ip text,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;