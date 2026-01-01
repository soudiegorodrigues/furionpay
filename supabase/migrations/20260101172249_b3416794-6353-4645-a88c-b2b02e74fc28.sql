-- 1) Hardening: ensure predictable search_path for app functions
ALTER FUNCTION public.get_offer_clicks_chart(uuid, integer) SET search_path = public, extensions;
ALTER FUNCTION public.get_products_paginated(uuid, integer, integer, text, text, uuid) SET search_path = public, extensions;
ALTER FUNCTION public.increment_offer_clicks(uuid) SET search_path = public, extensions;

-- 2) Move pg_trgm out of public schema (addresses linter warning)
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

-- 3) Update RPC used by /admin/vendas to include order_bumps
CREATE OR REPLACE FUNCTION public.get_user_transactions_paginated(
  p_page integer DEFAULT 1,
  p_per_page integer DEFAULT 10,
  p_date_filter text DEFAULT 'today'::text,
  p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_status text DEFAULT 'all'::text,
  p_search text DEFAULT ''::text,
  p_platform text DEFAULT 'all'::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_result JSON;
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
  v_offset INTEGER;
  v_effective_owner_id uuid;
  v_now_brazil timestamp;
  v_today_brazil date;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('transactions', '[]'::json, 'total', 0, 'page', p_page, 'per_page', p_per_page, 'total_pages', 0);
  END IF;

  v_effective_owner_id := public.get_effective_owner_id(auth.uid());
  v_offset := (p_page - 1) * p_per_page;

  -- Get current time in Brazil as timestamp without timezone
  v_now_brazil := NOW() AT TIME ZONE 'America/Sao_Paulo';
  v_today_brazil := v_now_brazil::date;

  -- If custom dates provided, use them
  IF p_start_date IS NOT NULL AND p_end_date IS NOT NULL THEN
    v_start_date := p_start_date;
    v_end_date := p_end_date;
  ELSE
    CASE p_date_filter
      WHEN 'today' THEN
        v_start_date := v_today_brazil::timestamp AT TIME ZONE 'America/Sao_Paulo';
        v_end_date := NOW();
      WHEN 'yesterday' THEN
        v_start_date := (v_today_brazil - 1)::timestamp AT TIME ZONE 'America/Sao_Paulo';
        v_end_date := v_today_brazil::timestamp AT TIME ZONE 'America/Sao_Paulo';
      WHEN '7days' THEN
        v_start_date := (v_today_brazil - 6)::timestamp AT TIME ZONE 'America/Sao_Paulo';
        v_end_date := NOW();
      WHEN '15days' THEN
        v_start_date := (v_today_brazil - 14)::timestamp AT TIME ZONE 'America/Sao_Paulo';
        v_end_date := NOW();
      WHEN '30days' THEN
        v_start_date := (v_today_brazil - 29)::timestamp AT TIME ZONE 'America/Sao_Paulo';
        v_end_date := NOW();
      WHEN 'month' THEN
        v_start_date := date_trunc('month', v_now_brazil)::timestamp AT TIME ZONE 'America/Sao_Paulo';
        v_end_date := NOW();
      WHEN 'year' THEN
        v_start_date := date_trunc('year', v_now_brazil)::timestamp AT TIME ZONE 'America/Sao_Paulo';
        v_end_date := NOW();
      WHEN 'all' THEN
        v_start_date := '1970-01-01'::timestamptz;
        v_end_date := NOW();
      ELSE
        v_start_date := v_today_brazil::timestamp AT TIME ZONE 'America/Sao_Paulo';
        v_end_date := NOW();
    END CASE;
  END IF;

  WITH filtered_transactions AS (
    SELECT
      t.id,
      t.amount,
      t.status,
      t.txid,
      t.donor_name,
      t.donor_email,
      t.product_name,
      t.popup_model,
      t.created_at,
      t.paid_at,
      t.expired_at,
      t.fee_fixed,
      t.fee_percentage,
      t.utm_data,
      t.acquirer,
      t.is_manual_approval,
      t.approved_by_email,
      t.order_bumps
    FROM pix_transactions t
    WHERE t.user_id = v_effective_owner_id
      AND t.created_at >= v_start_date
      AND t.created_at < v_end_date
      AND (p_status = 'all' OR t.status::text = p_status)
      AND (
        p_search = ''
        OR t.donor_name ILIKE '%' || p_search || '%'
        OR t.donor_email ILIKE '%' || p_search || '%'
        OR t.txid ILIKE '%' || p_search || '%'
        OR t.product_name ILIKE '%' || p_search || '%'
        OR EXISTS (
          SELECT 1 FROM products p
          WHERE p.name = t.product_name
            AND p.user_id = v_effective_owner_id
            AND p.product_code ILIKE '%' || p_search || '%'
        )
      )
      -- Platform filter based on utm_source
      AND (
        p_platform = 'all'
        OR (
          p_platform = 'facebook' AND (
            LOWER(COALESCE(t.utm_data->>'utm_source', '')) LIKE '%facebook%'
            OR LOWER(COALESCE(t.utm_data->>'utm_source', '')) LIKE '%fb%'
            OR LOWER(COALESCE(t.utm_data->>'utm_source', '')) LIKE '%instagram%'
            OR LOWER(COALESCE(t.utm_data->>'utm_source', '')) LIKE '%ig%'
            OR LOWER(COALESCE(t.utm_data->>'utm_source', '')) = 'meta'
          )
        )
        OR (
          p_platform = 'google' AND (
            LOWER(COALESCE(t.utm_data->>'utm_source', '')) LIKE '%google%'
            OR LOWER(COALESCE(t.utm_data->>'utm_source', '')) LIKE '%gads%'
            OR LOWER(COALESCE(t.utm_data->>'utm_source', '')) LIKE '%youtube%'
            OR LOWER(COALESCE(t.utm_data->>'utm_source', '')) LIKE '%yt%'
          )
        )
        OR (
          p_platform = 'tiktok' AND (
            LOWER(COALESCE(t.utm_data->>'utm_source', '')) LIKE '%tiktok%'
            OR LOWER(COALESCE(t.utm_data->>'utm_source', '')) LIKE '%tt%'
          )
        )
        OR (
          p_platform = 'kwai' AND (
            LOWER(COALESCE(t.utm_data->>'utm_source', '')) LIKE '%kwai%'
          )
        )
        OR (
          p_platform = 'outros' AND (
            LOWER(COALESCE(t.utm_data->>'utm_source', '')) NOT LIKE '%facebook%'
            AND LOWER(COALESCE(t.utm_data->>'utm_source', '')) NOT LIKE '%fb%'
            AND LOWER(COALESCE(t.utm_data->>'utm_source', '')) NOT LIKE '%instagram%'
            AND LOWER(COALESCE(t.utm_data->>'utm_source', '')) NOT LIKE '%ig%'
            AND LOWER(COALESCE(t.utm_data->>'utm_source', '')) != 'meta'
            AND LOWER(COALESCE(t.utm_data->>'utm_source', '')) NOT LIKE '%google%'
            AND LOWER(COALESCE(t.utm_data->>'utm_source', '')) NOT LIKE '%gads%'
            AND LOWER(COALESCE(t.utm_data->>'utm_source', '')) NOT LIKE '%youtube%'
            AND LOWER(COALESCE(t.utm_data->>'utm_source', '')) NOT LIKE '%yt%'
            AND LOWER(COALESCE(t.utm_data->>'utm_source', '')) NOT LIKE '%tiktok%'
            AND LOWER(COALESCE(t.utm_data->>'utm_source', '')) NOT LIKE '%tt%'
            AND LOWER(COALESCE(t.utm_data->>'utm_source', '')) NOT LIKE '%kwai%'
          )
        )
      )
  ),
  total_count AS (
    SELECT COUNT(*) as total FROM filtered_transactions
  )
  SELECT json_build_object(
    'transactions', COALESCE(
      (SELECT json_agg(row_to_json(ft.*) ORDER BY ft.created_at DESC)
       FROM (SELECT * FROM filtered_transactions ORDER BY created_at DESC LIMIT p_per_page OFFSET v_offset) ft),
      '[]'::json
    ),
    'total', (SELECT total FROM total_count),
    'page', p_page,
    'per_page', p_per_page,
    'total_pages', CEIL((SELECT total FROM total_count)::float / p_per_page)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;