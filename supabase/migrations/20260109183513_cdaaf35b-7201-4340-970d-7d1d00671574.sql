-- Incluir offer_code e offer_domain no retorno das RPCs usadas no painel

-- 1) Vendas do usuário (usada em /admin/vendas)
CREATE OR REPLACE FUNCTION public.get_user_transactions_paginated(
  p_page integer DEFAULT 1,
  p_items_per_page integer DEFAULT 10,
  p_date_filter text DEFAULT 'all'::text,
  p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_status_filter text DEFAULT 'all'::text,
  p_search text DEFAULT ''::text,
  p_platform_filter text DEFAULT 'all'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_offset integer;
  v_start_date timestamptz;
  v_end_date timestamptz;
  v_total bigint;
  v_transactions jsonb;
  v_user_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('total', 0, 'transactions', '[]'::jsonb);
  END IF;

  -- Calculate offset
  v_offset := (p_page - 1) * p_items_per_page;

  -- Handle date filters with CORRECT São Paulo timezone logic
  CASE p_date_filter
    WHEN 'today' THEN
      v_start_date := date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
      v_end_date := v_start_date + interval '1 day';
    WHEN 'yesterday' THEN
      v_start_date := (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') - interval '1 day') AT TIME ZONE 'America/Sao_Paulo';
      v_end_date := date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
    WHEN '7days' THEN
      v_start_date := (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') - interval '6 days') AT TIME ZONE 'America/Sao_Paulo';
      v_end_date := now();
    WHEN '15days' THEN
      v_start_date := (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') - interval '14 days') AT TIME ZONE 'America/Sao_Paulo';
      v_end_date := now();
    WHEN 'month' THEN
      v_start_date := date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
      v_end_date := now();
    WHEN 'year' THEN
      v_start_date := date_trunc('year', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
      v_end_date := now();
    WHEN 'custom' THEN
      v_start_date := COALESCE(p_start_date, now() - interval '30 days');
      v_end_date := COALESCE(p_end_date, now());
    ELSE
      v_start_date := NULL;
      v_end_date := NULL;
  END CASE;

  -- Get total count
  SELECT COUNT(*)
  INTO v_total
  FROM pix_transactions pt
  WHERE pt.user_id = v_user_id
    AND (v_start_date IS NULL OR pt.created_at >= v_start_date)
    AND (v_end_date IS NULL OR pt.created_at < v_end_date)
    AND (p_status_filter = 'all' OR pt.status::text = p_status_filter)
    AND (
      p_search = '' 
      OR pt.donor_name ILIKE '%' || p_search || '%'
      OR pt.donor_email ILIKE '%' || p_search || '%'
      OR pt.donor_cpf ILIKE '%' || p_search || '%'
      OR pt.product_name ILIKE '%' || p_search || '%'
      OR pt.txid ILIKE '%' || p_search || '%'
    )
    AND (p_platform_filter = 'all' OR COALESCE(pt.acquirer, 'inter') = p_platform_filter);

  -- Get paginated transactions
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  INTO v_transactions
  FROM (
    SELECT 
      pt.id,
      pt.amount,
      pt.status,
      pt.created_at,
      pt.paid_at,
      pt.expired_at,
      pt.donor_name,
      pt.donor_email,
      pt.donor_cpf,
      pt.donor_phone,
      pt.product_name,
      pt.product_code,
      pt.txid,
      pt.pix_code,
      pt.popup_model,
      pt.fee_fixed,
      pt.fee_percentage,
      pt.utm_data,
      pt.acquirer,
      pt.order_bumps,
      pt.is_manual_approval,
      pt.approved_by_email,
      pt.donor_cep,
      pt.donor_street,
      pt.donor_number,
      pt.donor_complement,
      pt.donor_neighborhood,
      pt.donor_city,
      pt.donor_state,
      pt.donor_birthdate,
      -- ✅ Novo: link do checkout
      COALESCE(
        po_direct.offer_code,
        (
          SELECT po2.offer_code
          FROM product_offers po2
          JOIN products p2 ON p2.id = po2.product_id
          WHERE p2.product_code = pt.product_code AND po2.is_active = true
          LIMIT 1
        ),
        (
          SELECT po3.offer_code
          FROM product_offers po3
          JOIN products p3 ON p3.id = po3.product_id
          WHERE trim(lower(p3.name)) = trim(lower(pt.product_name)) AND po3.is_active = true
          LIMIT 1
        )
      ) AS offer_code,
      COALESCE(
        po_direct.domain,
        (
          SELECT po2.domain
          FROM product_offers po2
          JOIN products p2 ON p2.id = po2.product_id
          WHERE p2.product_code = pt.product_code AND po2.is_active = true
          LIMIT 1
        ),
        (
          SELECT po3.domain
          FROM product_offers po3
          JOIN products p3 ON p3.id = po3.product_id
          WHERE trim(lower(p3.name)) = trim(lower(pt.product_name)) AND po3.is_active = true
          LIMIT 1
        )
      ) AS offer_domain
    FROM pix_transactions pt
    LEFT JOIN product_offers po_direct ON pt.offer_id = po_direct.id
    WHERE pt.user_id = v_user_id
      AND (v_start_date IS NULL OR pt.created_at >= v_start_date)
      AND (v_end_date IS NULL OR pt.created_at < v_end_date)
      AND (p_status_filter = 'all' OR pt.status::text = p_status_filter)
      AND (
        p_search = '' 
        OR pt.donor_name ILIKE '%' || p_search || '%'
        OR pt.donor_email ILIKE '%' || p_search || '%'
        OR pt.donor_cpf ILIKE '%' || p_search || '%'
        OR pt.product_name ILIKE '%' || p_search || '%'
        OR pt.txid ILIKE '%' || p_search || '%'
      )
      AND (p_platform_filter = 'all' OR COALESCE(pt.acquirer, 'inter') = p_platform_filter)
    ORDER BY pt.created_at DESC
    LIMIT p_items_per_page
    OFFSET v_offset
  ) t;

  RETURN jsonb_build_object('total', v_total, 'transactions', v_transactions);
END;
$function$;


-- 2) Transações globais (usada no /admin)
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
    AND (p_status = 'all' OR pt.status::text = p_status)
    AND (
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
      pt.donor_phone,
      pt.product_name,
      pt.product_code,
      pt.created_at,
      pt.paid_at,
      u.email as user_email,
      pt.utm_data,
      pt.acquirer,
      pt.approved_by_email,
      pt.is_manual_approval,
      pt.client_ip,
      -- ✅ Novo: link do checkout
      COALESCE(
        po_direct.offer_code,
        (
          SELECT po2.offer_code
          FROM product_offers po2
          JOIN products p2 ON p2.id = po2.product_id
          WHERE p2.product_code = pt.product_code AND po2.is_active = true
          LIMIT 1
        ),
        (
          SELECT po3.offer_code
          FROM product_offers po3
          JOIN products p3 ON p3.id = po3.product_id
          WHERE trim(lower(p3.name)) = trim(lower(pt.product_name)) AND po3.is_active = true
          LIMIT 1
        )
      ) AS offer_code,
      COALESCE(
        po_direct.domain,
        (
          SELECT po2.domain
          FROM product_offers po2
          JOIN products p2 ON p2.id = po2.product_id
          WHERE p2.product_code = pt.product_code AND po2.is_active = true
          LIMIT 1
        ),
        (
          SELECT po3.domain
          FROM product_offers po3
          JOIN products p3 ON p3.id = po3.product_id
          WHERE trim(lower(p3.name)) = trim(lower(pt.product_name)) AND po3.is_active = true
          LIMIT 1
        )
      ) AS offer_domain
    FROM pix_transactions pt
    LEFT JOIN auth.users u ON pt.user_id = u.id
    LEFT JOIN product_offers po_direct ON pt.offer_id = po_direct.id
    WHERE
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
      AND (p_status = 'all' OR pt.status::text = p_status)
      AND (
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

  RETURN json_build_object(
    'transactions', COALESCE(v_transactions, '[]'::json),
    'total_count', v_total_count
  );
END;
$function$;