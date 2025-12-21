-- Função otimizada para paginação no servidor com filtros
CREATE OR REPLACE FUNCTION get_user_transactions_paginated(
  p_page integer DEFAULT 1,
  p_per_page integer DEFAULT 10,
  p_date_filter text DEFAULT 'today',
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_status text DEFAULT 'all',
  p_search text DEFAULT ''
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_effective_owner_id uuid;
  v_offset integer;
  v_start_date timestamptz;
  v_end_date timestamptz;
  v_now timestamptz;
  v_result JSON;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('transactions', '[]'::json, 'total_count', 0);
  END IF;
  
  v_effective_owner_id := public.get_effective_owner_id(v_user_id);
  v_offset := (p_page - 1) * p_per_page;
  v_now := NOW() AT TIME ZONE 'America/Sao_Paulo';
  
  -- Calcular datas baseado no filtro
  CASE p_date_filter
    WHEN 'today' THEN
      v_start_date := date_trunc('day', v_now);
      v_end_date := v_now;
    WHEN 'yesterday' THEN
      v_start_date := date_trunc('day', v_now - interval '1 day');
      v_end_date := date_trunc('day', v_now);
    WHEN '7days' THEN
      v_start_date := date_trunc('day', v_now - interval '7 days');
      v_end_date := v_now;
    WHEN '15days' THEN
      v_start_date := date_trunc('day', v_now - interval '15 days');
      v_end_date := v_now;
    WHEN 'month' THEN
      v_start_date := date_trunc('month', v_now);
      v_end_date := v_now;
    WHEN 'year' THEN
      v_start_date := date_trunc('year', v_now);
      v_end_date := v_now;
    WHEN 'custom' THEN
      v_start_date := COALESCE(p_start_date, '1970-01-01'::timestamptz);
      v_end_date := COALESCE(p_end_date, v_now);
    ELSE -- 'all'
      v_start_date := '1970-01-01'::timestamptz;
      v_end_date := v_now;
  END CASE;

  SELECT json_build_object(
    'transactions', COALESCE((
      SELECT json_agg(t ORDER BY t.created_at DESC)
      FROM (
        SELECT 
          id,
          amount,
          status,
          txid,
          donor_name,
          product_name,
          created_at,
          paid_at,
          fee_percentage,
          fee_fixed,
          utm_data,
          popup_model,
          acquirer
        FROM pix_transactions
        WHERE user_id = v_effective_owner_id
          AND created_at >= v_start_date
          AND created_at <= v_end_date
          AND (p_status = 'all' OR status::text = p_status)
          AND (
            p_search = '' 
            OR donor_name ILIKE '%' || p_search || '%'
            OR product_name ILIKE '%' || p_search || '%'
            OR txid ILIKE '%' || p_search || '%'
          )
        ORDER BY created_at DESC
        LIMIT p_per_page
        OFFSET v_offset
      ) t
    ), '[]'::json),
    'total_count', (
      SELECT COUNT(*)
      FROM pix_transactions
      WHERE user_id = v_effective_owner_id
        AND created_at >= v_start_date
        AND created_at <= v_end_date
        AND (p_status = 'all' OR status::text = p_status)
        AND (
          p_search = '' 
          OR donor_name ILIKE '%' || p_search || '%'
          OR product_name ILIKE '%' || p_search || '%'
          OR txid ILIKE '%' || p_search || '%'
        )
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;