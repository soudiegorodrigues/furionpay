-- Otimizar função get_user_transactions_paginated para limitar "all" a 365 dias
CREATE OR REPLACE FUNCTION public.get_user_transactions_paginated(
  p_page integer DEFAULT 1, 
  p_items_per_page integer DEFAULT 10, 
  p_date_filter text DEFAULT 'all'::text, 
  p_status_filter text DEFAULT 'all'::text, 
  p_platform_filter text DEFAULT 'all'::text, 
  p_search_query text DEFAULT ''::text, 
  p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, 
  p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_effective_owner_id uuid;
  v_start_date timestamptz;
  v_end_date timestamptz;
  v_offset integer;
  v_total_count integer;
  v_transactions jsonb;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated', 'transactions', '[]'::jsonb, 'total', 0);
  END IF;

  -- Get effective owner id (for collaborators)
  SELECT get_effective_owner_id(v_user_id) INTO v_effective_owner_id;

  -- Calculate offset
  v_offset := (p_page - 1) * p_items_per_page;

  -- Set date range based on filter (OPTIMIZED: "all" now means 365 days to prevent timeout)
  CASE p_date_filter
    WHEN 'today' THEN
      v_start_date := date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
      v_end_date := v_start_date + interval '1 day';
    WHEN 'yesterday' THEN
      v_start_date := (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') - interval '1 day') AT TIME ZONE 'America/Sao_Paulo';
      v_end_date := date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
    WHEN '7days', 'last7days' THEN
      v_start_date := (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') - interval '6 days') AT TIME ZONE 'America/Sao_Paulo';
      v_end_date := now();
    WHEN '15days' THEN
      v_start_date := (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') - interval '14 days') AT TIME ZONE 'America/Sao_Paulo';
      v_end_date := now();
    WHEN 'month', 'thisMonth' THEN
      v_start_date := date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
      v_end_date := now();
    WHEN 'year' THEN
      v_start_date := date_trunc('year', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
      v_end_date := now();
    WHEN 'custom' THEN
      v_start_date := COALESCE(p_start_date, now() - interval '30 days');
      v_end_date := COALESCE(p_end_date, now());
    WHEN 'all' THEN
      -- OTIMIZAÇÃO: Limitar "all" a 365 dias para evitar timeout
      v_start_date := (now() AT TIME ZONE 'America/Sao_Paulo' - interval '365 days') AT TIME ZONE 'America/Sao_Paulo';
      v_end_date := now();
    ELSE
      -- Default to today with correct timezone
      v_start_date := date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
      v_end_date := v_start_date + interval '1 day';
  END CASE;

  -- Count total matching records (using index-friendly query)
  SELECT COUNT(*)
  INTO v_total_count
  FROM pix_transactions pt
  WHERE pt.user_id = v_effective_owner_id
    AND pt.created_at >= v_start_date
    AND pt.created_at < v_end_date
    AND (p_status_filter = 'all' OR pt.status::text = p_status_filter)
    AND (p_platform_filter = 'all' OR 
         (p_platform_filter = 'facebook' AND pt.utm_data->>'utm_source' ILIKE '%facebook%') OR
         (p_platform_filter = 'google' AND pt.utm_data->>'utm_source' ILIKE '%google%') OR
         (p_platform_filter = 'tiktok' AND pt.utm_data->>'utm_source' ILIKE '%tiktok%') OR
         (p_platform_filter = 'other' AND (
           pt.utm_data->>'utm_source' IS NULL OR
           (pt.utm_data->>'utm_source' NOT ILIKE '%facebook%' AND 
            pt.utm_data->>'utm_source' NOT ILIKE '%google%' AND 
            pt.utm_data->>'utm_source' NOT ILIKE '%tiktok%')
         ))
    )
    AND (p_search_query = '' OR 
         pt.donor_name ILIKE '%' || p_search_query || '%' OR
         pt.donor_email ILIKE '%' || p_search_query || '%' OR
         pt.donor_cpf ILIKE '%' || p_search_query || '%' OR
         pt.product_name ILIKE '%' || p_search_query || '%' OR
         pt.id::text ILIKE '%' || p_search_query || '%'
    );

  -- Get paginated transactions
  SELECT jsonb_agg(t)
  INTO v_transactions
  FROM (
    SELECT 
      jsonb_build_object(
        'id', pt.id,
        'amount', pt.amount,
        'status', pt.status,
        'created_at', pt.created_at,
        'paid_at', pt.paid_at,
        'donor_name', pt.donor_name,
        'donor_email', pt.donor_email,
        'donor_cpf', pt.donor_cpf,
        'donor_phone', pt.donor_phone,
        'product_name', pt.product_name,
        'product_code', pt.product_code,
        'popup_model', pt.popup_model,
        'utm_data', pt.utm_data,
        'fee_percentage', pt.fee_percentage,
        'fee_fixed', pt.fee_fixed,
        'txid', pt.txid,
        'acquirer', pt.acquirer,
        'order_bumps', pt.order_bumps,
        'client_ip', pt.client_ip
      ) as t
    FROM pix_transactions pt
    WHERE pt.user_id = v_effective_owner_id
      AND pt.created_at >= v_start_date
      AND pt.created_at < v_end_date
      AND (p_status_filter = 'all' OR pt.status::text = p_status_filter)
      AND (p_platform_filter = 'all' OR 
           (p_platform_filter = 'facebook' AND pt.utm_data->>'utm_source' ILIKE '%facebook%') OR
           (p_platform_filter = 'google' AND pt.utm_data->>'utm_source' ILIKE '%google%') OR
           (p_platform_filter = 'tiktok' AND pt.utm_data->>'utm_source' ILIKE '%tiktok%') OR
           (p_platform_filter = 'other' AND (
             pt.utm_data->>'utm_source' IS NULL OR
             (pt.utm_data->>'utm_source' NOT ILIKE '%facebook%' AND 
              pt.utm_data->>'utm_source' NOT ILIKE '%google%' AND 
              pt.utm_data->>'utm_source' NOT ILIKE '%tiktok%')
           ))
      )
      AND (p_search_query = '' OR 
           pt.donor_name ILIKE '%' || p_search_query || '%' OR
           pt.donor_email ILIKE '%' || p_search_query || '%' OR
           pt.donor_cpf ILIKE '%' || p_search_query || '%' OR
           pt.product_name ILIKE '%' || p_search_query || '%' OR
           pt.id::text ILIKE '%' || p_search_query || '%'
      )
    ORDER BY pt.created_at DESC
    LIMIT p_items_per_page
    OFFSET v_offset
  ) sub;

  -- Return result
  RETURN jsonb_build_object(
    'transactions', COALESCE(v_transactions, '[]'::jsonb),
    'total', v_total_count
  );
END;
$function$;