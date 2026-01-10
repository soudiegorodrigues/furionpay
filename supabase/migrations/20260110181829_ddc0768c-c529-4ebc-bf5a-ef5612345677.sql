-- Primeiro remover a função existente, depois recriar com filtro corrigido
DROP FUNCTION IF EXISTS get_user_transactions_paginated(uuid,text,text,text,text,integer,integer,timestamp with time zone,timestamp with time zone);

CREATE OR REPLACE FUNCTION get_user_transactions_paginated(
  p_user_id uuid,
  p_date_filter text,
  p_status_filter text,
  p_platform_filter text,
  p_search text,
  p_page integer,
  p_per_page integer,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS TABLE (transactions jsonb, total bigint, pages integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date timestamptz;
  v_end_date timestamptz;
  v_offset integer;
  v_total bigint;
  v_pages integer;
  v_transactions jsonb;
BEGIN
  v_offset := (p_page - 1) * p_per_page;

  -- Calcular datas baseado no filtro
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
    WHEN 'all' THEN
      v_start_date := NULL;
      v_end_date := NULL;
    ELSE
      v_start_date := date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
      v_end_date := v_start_date + interval '1 day';
  END CASE;

  -- Contar total com filtro de plataforma CORRIGIDO para incluir FB, IG, etc.
  SELECT COUNT(*)
  INTO v_total
  FROM pix_transactions pt
  WHERE pt.user_id = p_user_id
    AND (v_start_date IS NULL OR pt.created_at >= v_start_date)
    AND (v_end_date IS NULL OR pt.created_at < v_end_date)
    AND (p_status_filter = 'all' OR pt.status::text = p_status_filter)
    AND (p_search = '' OR 
         pt.donor_name ILIKE '%' || p_search || '%' OR 
         pt.donor_email ILIKE '%' || p_search || '%' OR
         pt.product_name ILIKE '%' || p_search || '%' OR
         pt.txid ILIKE '%' || p_search || '%')
    -- CORREÇÃO: Incluir FB, IG e todas as variações
    AND (p_platform_filter = 'all' OR 
         (p_platform_filter = 'facebook' AND (
           LOWER(pt.utm_data->>'utm_source') LIKE '%facebook%' OR
           LOWER(pt.utm_data->>'utm_source') LIKE '%instagram%' OR
           LOWER(TRIM(pt.utm_data->>'utm_source')) = 'fb' OR
           LOWER(TRIM(pt.utm_data->>'utm_source')) = 'ig' OR
           LOWER(pt.utm_data->>'referrer') LIKE '%facebook.com%' OR
           LOWER(pt.utm_data->>'referrer') LIKE '%instagram.com%'
         )) OR
         (p_platform_filter = 'google' AND (
           LOWER(pt.utm_data->>'utm_source') LIKE '%google%' OR
           LOWER(pt.utm_data->>'utm_source') LIKE '%youtube%' OR
           LOWER(TRIM(pt.utm_data->>'utm_source')) = 'gads'
         )) OR
         (p_platform_filter = 'tiktok' AND (
           LOWER(pt.utm_data->>'utm_source') LIKE '%tiktok%' OR
           LOWER(pt.utm_data->>'utm_source') LIKE '%bytedance%'
         )) OR
         (p_platform_filter = 'other' AND (
           pt.utm_data IS NULL OR 
           pt.utm_data->>'utm_source' IS NULL OR
           LOWER(TRIM(pt.utm_data->>'utm_source')) = 'direct' OR
           TRIM(pt.utm_data->>'utm_source') = ''
         )));

  v_pages := CEIL(v_total::numeric / p_per_page);

  -- Buscar transações com mesmo filtro corrigido
  SELECT jsonb_agg(t ORDER BY t.created_at DESC)
  INTO v_transactions
  FROM (
    SELECT 
      pt.id, pt.created_at, pt.amount, pt.status, pt.donor_name, pt.donor_email,
      pt.donor_cpf, pt.donor_phone, pt.product_name, pt.product_code, pt.txid,
      pt.pix_code, pt.paid_at, pt.expired_at, pt.fee_percentage, pt.fee_fixed,
      pt.popup_model, pt.utm_data, pt.order_bumps, pt.acquirer,
      pt.is_manual_approval, pt.approved_by_email, pt.donor_cep, pt.donor_street,
      pt.donor_number, pt.donor_complement, pt.donor_neighborhood, pt.donor_city,
      pt.donor_state, pt.donor_birthdate, pt.client_ip, pt.fingerprint_hash
    FROM pix_transactions pt
    WHERE pt.user_id = p_user_id
      AND (v_start_date IS NULL OR pt.created_at >= v_start_date)
      AND (v_end_date IS NULL OR pt.created_at < v_end_date)
      AND (p_status_filter = 'all' OR pt.status::text = p_status_filter)
      AND (p_search = '' OR 
           pt.donor_name ILIKE '%' || p_search || '%' OR 
           pt.donor_email ILIKE '%' || p_search || '%' OR
           pt.product_name ILIKE '%' || p_search || '%' OR
           pt.txid ILIKE '%' || p_search || '%')
      -- CORREÇÃO: Mesmo filtro de plataforma
      AND (p_platform_filter = 'all' OR 
           (p_platform_filter = 'facebook' AND (
             LOWER(pt.utm_data->>'utm_source') LIKE '%facebook%' OR
             LOWER(pt.utm_data->>'utm_source') LIKE '%instagram%' OR
             LOWER(TRIM(pt.utm_data->>'utm_source')) = 'fb' OR
             LOWER(TRIM(pt.utm_data->>'utm_source')) = 'ig' OR
             LOWER(pt.utm_data->>'referrer') LIKE '%facebook.com%' OR
             LOWER(pt.utm_data->>'referrer') LIKE '%instagram.com%'
           )) OR
           (p_platform_filter = 'google' AND (
             LOWER(pt.utm_data->>'utm_source') LIKE '%google%' OR
             LOWER(pt.utm_data->>'utm_source') LIKE '%youtube%' OR
             LOWER(TRIM(pt.utm_data->>'utm_source')) = 'gads'
           )) OR
           (p_platform_filter = 'tiktok' AND (
             LOWER(pt.utm_data->>'utm_source') LIKE '%tiktok%' OR
             LOWER(pt.utm_data->>'utm_source') LIKE '%bytedance%'
           )) OR
           (p_platform_filter = 'other' AND (
             pt.utm_data IS NULL OR 
             pt.utm_data->>'utm_source' IS NULL OR
             LOWER(TRIM(pt.utm_data->>'utm_source')) = 'direct' OR
             TRIM(pt.utm_data->>'utm_source') = ''
           )))
    ORDER BY pt.created_at DESC
    LIMIT p_per_page
    OFFSET v_offset
  ) t;

  RETURN QUERY SELECT COALESCE(v_transactions, '[]'::jsonb), v_total, v_pages;
END;
$$;