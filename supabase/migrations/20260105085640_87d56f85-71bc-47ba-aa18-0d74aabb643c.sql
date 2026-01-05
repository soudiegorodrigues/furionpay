-- Dropar TODAS as versões existentes da função para eliminar conflitos
DROP FUNCTION IF EXISTS get_user_transactions_paginated(integer, integer, text, timestamp with time zone, timestamp with time zone, text, text);
DROP FUNCTION IF EXISTS get_user_transactions_paginated(integer, integer, text, timestamp with time zone, timestamp with time zone, text, text, text);
DROP FUNCTION IF EXISTS get_user_transactions_paginated(integer, integer, text, text, text, timestamp with time zone, timestamp with time zone);
DROP FUNCTION IF EXISTS get_user_transactions_paginated(integer, integer, text, text, text, text, timestamp with time zone, timestamp with time zone);

-- Criar versão única e definitiva da função
CREATE OR REPLACE FUNCTION get_user_transactions_paginated(
  p_page integer DEFAULT 1,
  p_per_page integer DEFAULT 10,
  p_date_filter text DEFAULT 'today',
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL,
  p_status text DEFAULT 'all',
  p_search text DEFAULT '',
  p_platform text DEFAULT 'all'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_offset integer;
  v_start_date timestamp with time zone;
  v_end_date timestamp with time zone;
  v_result json;
BEGIN
  -- Get the authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('transactions', '[]'::json, 'total', 0);
  END IF;

  -- Calculate offset
  v_offset := (p_page - 1) * p_per_page;

  -- Calculate date range based on filter
  IF p_date_filter = 'custom' AND p_start_date IS NOT NULL AND p_end_date IS NOT NULL THEN
    v_start_date := p_start_date;
    v_end_date := p_end_date;
  ELSIF p_date_filter = 'today' THEN
    v_start_date := (NOW() AT TIME ZONE 'America/Sao_Paulo')::date::timestamp AT TIME ZONE 'America/Sao_Paulo';
    v_end_date := v_start_date + interval '1 day';
  ELSIF p_date_filter = 'yesterday' THEN
    v_start_date := ((NOW() AT TIME ZONE 'America/Sao_Paulo')::date - interval '1 day')::timestamp AT TIME ZONE 'America/Sao_Paulo';
    v_end_date := v_start_date + interval '1 day';
  ELSIF p_date_filter = 'last7days' THEN
    v_start_date := ((NOW() AT TIME ZONE 'America/Sao_Paulo')::date - interval '6 days')::timestamp AT TIME ZONE 'America/Sao_Paulo';
    v_end_date := (NOW() AT TIME ZONE 'America/Sao_Paulo')::date::timestamp AT TIME ZONE 'America/Sao_Paulo' + interval '1 day';
  ELSIF p_date_filter = 'last30days' THEN
    v_start_date := ((NOW() AT TIME ZONE 'America/Sao_Paulo')::date - interval '29 days')::timestamp AT TIME ZONE 'America/Sao_Paulo';
    v_end_date := (NOW() AT TIME ZONE 'America/Sao_Paulo')::date::timestamp AT TIME ZONE 'America/Sao_Paulo' + interval '1 day';
  ELSIF p_date_filter = 'thismonth' THEN
    v_start_date := date_trunc('month', NOW() AT TIME ZONE 'America/Sao_Paulo')::timestamp AT TIME ZONE 'America/Sao_Paulo';
    v_end_date := (date_trunc('month', NOW() AT TIME ZONE 'America/Sao_Paulo') + interval '1 month')::timestamp AT TIME ZONE 'America/Sao_Paulo';
  ELSIF p_date_filter = 'lastmonth' THEN
    v_start_date := (date_trunc('month', NOW() AT TIME ZONE 'America/Sao_Paulo') - interval '1 month')::timestamp AT TIME ZONE 'America/Sao_Paulo';
    v_end_date := date_trunc('month', NOW() AT TIME ZONE 'America/Sao_Paulo')::timestamp AT TIME ZONE 'America/Sao_Paulo';
  ELSE
    v_start_date := (NOW() AT TIME ZONE 'America/Sao_Paulo')::date::timestamp AT TIME ZONE 'America/Sao_Paulo';
    v_end_date := v_start_date + interval '1 day';
  END IF;

  -- Build the result
  SELECT json_build_object(
    'transactions', COALESCE((
      SELECT json_agg(t ORDER BY t.created_at DESC)
      FROM (
        SELECT 
          id,
          amount,
          status,
          donor_name,
          donor_email,
          donor_cpf,
          donor_phone,
          product_name,
          created_at,
          paid_at,
          expired_at,
          pix_code,
          txid,
          popup_model,
          fee_percentage,
          fee_fixed,
          order_bumps,
          utm_data,
          acquirer,
          client_ip
        FROM pix_transactions
        WHERE user_id = v_user_id
          AND created_at >= v_start_date
          AND created_at < v_end_date
          AND (p_status = 'all' OR status::text = p_status)
          AND (
            p_search = '' 
            OR donor_name ILIKE '%' || p_search || '%'
            OR donor_email ILIKE '%' || p_search || '%'
            OR donor_cpf ILIKE '%' || p_search || '%'
            OR product_name ILIKE '%' || p_search || '%'
            OR txid ILIKE '%' || p_search || '%'
          )
          AND (
            p_platform = 'all'
            OR (p_platform = 'facebook' AND utm_data->>'utm_source' ILIKE '%facebook%')
            OR (p_platform = 'facebook' AND utm_data->>'utm_source' ILIKE '%fb%')
            OR (p_platform = 'google' AND utm_data->>'utm_source' ILIKE '%google%')
            OR (p_platform = 'tiktok' AND utm_data->>'utm_source' ILIKE '%tiktok%')
            OR (p_platform = 'kwai' AND utm_data->>'utm_source' ILIKE '%kwai%')
            OR (p_platform = 'organic' AND (utm_data->>'utm_source' IS NULL OR utm_data->>'utm_source' = ''))
          )
        ORDER BY created_at DESC
        LIMIT p_per_page
        OFFSET v_offset
      ) t
    ), '[]'::json),
    'total', (
      SELECT COUNT(*)
      FROM pix_transactions
      WHERE user_id = v_user_id
        AND created_at >= v_start_date
        AND created_at < v_end_date
        AND (p_status = 'all' OR status::text = p_status)
        AND (
          p_search = '' 
          OR donor_name ILIKE '%' || p_search || '%'
          OR donor_email ILIKE '%' || p_search || '%'
          OR donor_cpf ILIKE '%' || p_search || '%'
          OR product_name ILIKE '%' || p_search || '%'
          OR txid ILIKE '%' || p_search || '%'
        )
        AND (
          p_platform = 'all'
          OR (p_platform = 'facebook' AND utm_data->>'utm_source' ILIKE '%facebook%')
          OR (p_platform = 'facebook' AND utm_data->>'utm_source' ILIKE '%fb%')
          OR (p_platform = 'google' AND utm_data->>'utm_source' ILIKE '%google%')
          OR (p_platform = 'tiktok' AND utm_data->>'utm_source' ILIKE '%tiktok%')
          OR (p_platform = 'kwai' AND utm_data->>'utm_source' ILIKE '%kwai%')
          OR (p_platform = 'organic' AND (utm_data->>'utm_source' IS NULL OR utm_data->>'utm_source' = ''))
        )
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;