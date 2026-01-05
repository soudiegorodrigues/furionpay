-- Drop existing function versions first
DROP FUNCTION IF EXISTS public.get_user_transactions_paginated(integer, integer, text, timestamp with time zone, timestamp with time zone, text, text, text);

-- Create the unified and corrected function
CREATE OR REPLACE FUNCTION public.get_user_transactions_paginated(
  p_page integer DEFAULT 1,
  p_per_page integer DEFAULT 25,
  p_date_filter text DEFAULT 'today',
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL,
  p_status text DEFAULT 'all',
  p_search text DEFAULT '',
  p_platform text DEFAULT 'all'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_effective_owner_id uuid;
  v_offset integer;
  v_start_date timestamp with time zone;
  v_end_date timestamp with time zone;
  v_total bigint;
  v_result jsonb;
BEGIN
  -- Get effective owner ID (works for both owners and collaborators)
  v_effective_owner_id := public.get_effective_owner_id(auth.uid());
  
  -- Calculate offset
  v_offset := (p_page - 1) * p_per_page;
  
  -- If custom dates provided, use them
  IF p_start_date IS NOT NULL AND p_end_date IS NOT NULL THEN
    v_start_date := p_start_date;
    v_end_date := p_end_date;
  ELSE
    -- Handle date filter values from UI
    CASE LOWER(COALESCE(p_date_filter, 'today'))
      WHEN 'all' THEN
        v_start_date := NULL;
        v_end_date := NULL;
      WHEN 'today' THEN
        v_start_date := (CURRENT_DATE AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
        v_end_date := ((CURRENT_DATE + interval '1 day') AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
      WHEN 'yesterday' THEN
        v_start_date := ((CURRENT_DATE - interval '1 day') AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
        v_end_date := (CURRENT_DATE AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
      WHEN '7days', 'last7days' THEN
        v_start_date := ((CURRENT_DATE - interval '7 days') AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
        v_end_date := ((CURRENT_DATE + interval '1 day') AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
      WHEN '15days', 'last15days' THEN
        v_start_date := ((CURRENT_DATE - interval '15 days') AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
        v_end_date := ((CURRENT_DATE + interval '1 day') AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
      WHEN 'month', 'thismonth', 'last30days' THEN
        v_start_date := (date_trunc('month', CURRENT_DATE) AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
        v_end_date := ((CURRENT_DATE + interval '1 day') AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
      WHEN 'year', 'thisyear' THEN
        v_start_date := (date_trunc('year', CURRENT_DATE) AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
        v_end_date := ((CURRENT_DATE + interval '1 day') AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
      WHEN 'custom' THEN
        v_start_date := p_start_date;
        v_end_date := p_end_date;
      ELSE
        -- Default to today if unknown filter
        v_start_date := (CURRENT_DATE AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
        v_end_date := ((CURRENT_DATE + interval '1 day') AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
    END CASE;
  END IF;

  -- Get total count with filters
  SELECT COUNT(*)
  INTO v_total
  FROM pix_transactions t
  WHERE t.user_id = v_effective_owner_id
    AND (v_start_date IS NULL OR t.created_at >= v_start_date)
    AND (v_end_date IS NULL OR t.created_at < v_end_date)
    AND (p_status = 'all' OR t.status::text = p_status)
    AND (
      p_search = '' OR p_search IS NULL
      OR t.donor_name ILIKE '%' || p_search || '%'
      OR t.donor_email ILIKE '%' || p_search || '%'
      OR t.donor_cpf ILIKE '%' || p_search || '%'
      OR t.product_name ILIKE '%' || p_search || '%'
      OR t.txid ILIKE '%' || p_search || '%'
    )
    AND (
      p_platform = 'all'
      OR (p_platform = 'facebook' AND (t.utm_data->>'utm_source' ILIKE '%facebook%' OR t.utm_data->>'utm_source' ILIKE '%fb%' OR t.utm_data->>'utm_source' ILIKE '%meta%' OR t.utm_data->>'utm_source' ILIKE '%instagram%' OR t.utm_data->>'utm_source' ILIKE '%ig%'))
      OR (p_platform = 'google' AND (t.utm_data->>'utm_source' ILIKE '%google%' OR t.utm_data->>'utm_source' ILIKE '%gads%' OR t.utm_data->>'utm_source' ILIKE '%youtube%'))
      OR (p_platform = 'tiktok' AND (t.utm_data->>'utm_source' ILIKE '%tiktok%' OR t.utm_data->>'utm_source' ILIKE '%tt%'))
      OR (p_platform = 'other' AND (
        t.utm_data->>'utm_source' IS NULL 
        OR t.utm_data->>'utm_source' = ''
        OR (
          t.utm_data->>'utm_source' NOT ILIKE '%facebook%' 
          AND t.utm_data->>'utm_source' NOT ILIKE '%fb%'
          AND t.utm_data->>'utm_source' NOT ILIKE '%meta%'
          AND t.utm_data->>'utm_source' NOT ILIKE '%instagram%'
          AND t.utm_data->>'utm_source' NOT ILIKE '%ig%'
          AND t.utm_data->>'utm_source' NOT ILIKE '%google%'
          AND t.utm_data->>'utm_source' NOT ILIKE '%gads%'
          AND t.utm_data->>'utm_source' NOT ILIKE '%youtube%'
          AND t.utm_data->>'utm_source' NOT ILIKE '%tiktok%'
          AND t.utm_data->>'utm_source' NOT ILIKE '%tt%'
        )
      ))
    );

  -- Get paginated transactions
  SELECT jsonb_build_object(
    'transactions', COALESCE(jsonb_agg(row_to_json(tx) ORDER BY tx.created_at DESC), '[]'::jsonb),
    'total', v_total,
    'page', p_page,
    'per_page', p_per_page,
    'total_pages', CEIL(v_total::numeric / p_per_page)
  )
  INTO v_result
  FROM (
    SELECT 
      t.id,
      t.txid,
      t.amount,
      t.status,
      t.donor_name,
      t.donor_email,
      t.donor_cpf,
      t.donor_phone,
      t.donor_cep,
      t.donor_street,
      t.donor_number,
      t.donor_complement,
      t.donor_neighborhood,
      t.donor_city,
      t.donor_state,
      t.donor_birthdate,
      t.product_name,
      t.popup_model,
      t.created_at,
      t.paid_at,
      t.expired_at,
      t.pix_code,
      t.fee_percentage,
      t.fee_fixed,
      t.utm_data,
      t.order_bumps,
      t.acquirer,
      t.is_manual_approval,
      t.approved_by_email,
      t.client_ip
    FROM pix_transactions t
    WHERE t.user_id = v_effective_owner_id
      AND (v_start_date IS NULL OR t.created_at >= v_start_date)
      AND (v_end_date IS NULL OR t.created_at < v_end_date)
      AND (p_status = 'all' OR t.status::text = p_status)
      AND (
        p_search = '' OR p_search IS NULL
        OR t.donor_name ILIKE '%' || p_search || '%'
        OR t.donor_email ILIKE '%' || p_search || '%'
        OR t.donor_cpf ILIKE '%' || p_search || '%'
        OR t.product_name ILIKE '%' || p_search || '%'
        OR t.txid ILIKE '%' || p_search || '%'
      )
      AND (
        p_platform = 'all'
        OR (p_platform = 'facebook' AND (t.utm_data->>'utm_source' ILIKE '%facebook%' OR t.utm_data->>'utm_source' ILIKE '%fb%' OR t.utm_data->>'utm_source' ILIKE '%meta%' OR t.utm_data->>'utm_source' ILIKE '%instagram%' OR t.utm_data->>'utm_source' ILIKE '%ig%'))
        OR (p_platform = 'google' AND (t.utm_data->>'utm_source' ILIKE '%google%' OR t.utm_data->>'utm_source' ILIKE '%gads%' OR t.utm_data->>'utm_source' ILIKE '%youtube%'))
        OR (p_platform = 'tiktok' AND (t.utm_data->>'utm_source' ILIKE '%tiktok%' OR t.utm_data->>'utm_source' ILIKE '%tt%'))
        OR (p_platform = 'other' AND (
          t.utm_data->>'utm_source' IS NULL 
          OR t.utm_data->>'utm_source' = ''
          OR (
            t.utm_data->>'utm_source' NOT ILIKE '%facebook%' 
            AND t.utm_data->>'utm_source' NOT ILIKE '%fb%'
            AND t.utm_data->>'utm_source' NOT ILIKE '%meta%'
            AND t.utm_data->>'utm_source' NOT ILIKE '%instagram%'
            AND t.utm_data->>'utm_source' NOT ILIKE '%ig%'
            AND t.utm_data->>'utm_source' NOT ILIKE '%google%'
            AND t.utm_data->>'utm_source' NOT ILIKE '%gads%'
            AND t.utm_data->>'utm_source' NOT ILIKE '%youtube%'
            AND t.utm_data->>'utm_source' NOT ILIKE '%tiktok%'
            AND t.utm_data->>'utm_source' NOT ILIKE '%tt%'
          )
        ))
      )
    ORDER BY t.created_at DESC
    LIMIT p_per_page
    OFFSET v_offset
  ) tx;

  RETURN v_result;
END;
$$;