
-- Fix timezone bug in get_user_stats_by_period
-- The issue: casting date to timestamptz interprets it as UTC midnight, not Brazil midnight
-- Fix: explicitly convert using AT TIME ZONE to get correct Brazil midnight in UTC

CREATE OR REPLACE FUNCTION public.get_user_stats_by_period(
  p_period text DEFAULT 'all'::text,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSON;
  v_start_date TIMESTAMPTZ;
  v_end_date TIMESTAMPTZ;
  v_effective_owner_id uuid;
  v_now_brazil timestamp;
  v_today_brazil date;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object(
      'total_generated', 0,
      'total_paid', 0,
      'total_expired', 0,
      'total_amount_generated', 0,
      'total_amount_paid', 0,
      'total_fees', 0
    );
  END IF;

  v_effective_owner_id := public.get_effective_owner_id(auth.uid());
  
  -- Get current time in Brazil as timestamp without timezone
  v_now_brazil := NOW() AT TIME ZONE 'America/Sao_Paulo';
  v_today_brazil := v_now_brazil::date;

  -- If custom dates provided, use them
  IF p_start_date IS NOT NULL AND p_end_date IS NOT NULL THEN
    v_start_date := p_start_date;
    v_end_date := p_end_date;
  ELSE
    CASE p_period
      WHEN 'today' THEN
        -- Midnight today in Brazil, converted back to UTC
        v_start_date := v_today_brazil::timestamp AT TIME ZONE 'America/Sao_Paulo';
        v_end_date := NOW();
      WHEN 'yesterday' THEN
        -- Midnight yesterday in Brazil
        v_start_date := (v_today_brazil - 1)::timestamp AT TIME ZONE 'America/Sao_Paulo';
        -- Midnight today in Brazil
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

  SELECT json_build_object(
    'total_generated', COALESCE(COUNT(*), 0),
    'total_paid', COALESCE(COUNT(*) FILTER (WHERE status = 'paid'), 0),
    'total_expired', COALESCE(COUNT(*) FILTER (WHERE status = 'expired'), 0),
    'total_amount_generated', COALESCE(SUM(amount), 0),
    'total_amount_paid', COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0),
    'total_fees', COALESCE(SUM(
      CASE WHEN status = 'paid' THEN
        (amount * COALESCE(fee_percentage, 0) / 100) + COALESCE(fee_fixed, 0)
      ELSE 0 END
    ), 0)
  )
  INTO v_result
  FROM public.pix_transactions
  WHERE user_id = v_effective_owner_id
    AND created_at >= v_start_date
    AND created_at < v_end_date;

  RETURN v_result;
END;
$function$;

-- Fix timezone bug in get_user_transactions_paginated
CREATE OR REPLACE FUNCTION public.get_user_transactions_paginated(
  p_status text DEFAULT 'all'::text,
  p_date_filter text DEFAULT 'today'::text,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_per_page integer DEFAULT 10,
  p_search text DEFAULT ''::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
        -- Midnight today in Brazil, converted back to UTC
        v_start_date := v_today_brazil::timestamp AT TIME ZONE 'America/Sao_Paulo';
        v_end_date := NOW();
      WHEN 'yesterday' THEN
        -- Midnight yesterday in Brazil
        v_start_date := (v_today_brazil - 1)::timestamp AT TIME ZONE 'America/Sao_Paulo';
        -- Midnight today in Brazil
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
      t.approved_by_email
    FROM pix_transactions t
    WHERE t.user_id = v_effective_owner_id
      AND t.created_at >= v_start_date
      AND t.created_at < v_end_date
      AND (p_status = 'all' OR t.status::text = p_status)
      AND (
        p_search = '' 
        OR t.donor_name ILIKE '%' || p_search || '%'
        OR t.txid ILIKE '%' || p_search || '%'
        OR t.product_name ILIKE '%' || p_search || '%'
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
