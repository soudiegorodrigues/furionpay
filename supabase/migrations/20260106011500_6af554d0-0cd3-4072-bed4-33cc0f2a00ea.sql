-- Corrigir bug de timezone na função get_user_transactions_paginated
-- O problema: transações após 21:00 SP (00:00 UTC) não apareciam no filtro "today"

CREATE OR REPLACE FUNCTION public.get_user_transactions_paginated(
  p_user_id uuid,
  p_date_filter text DEFAULT 'today',
  p_status_filter text DEFAULT 'all',
  p_search text DEFAULT '',
  p_platform_filter text DEFAULT 'all',
  p_page integer DEFAULT 1,
  p_per_page integer DEFAULT 25,
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS TABLE(
  transactions jsonb,
  total_count bigint,
  total_pages integer
)
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
  -- Calcular offset para paginação
  v_offset := (p_page - 1) * p_per_page;

  -- CORREÇÃO: Usar timezone de São Paulo corretamente
  -- date_trunc + AT TIME ZONE garante que a meia-noite seja do horário de SP
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
    WHEN 'last7days' THEN
      v_start_date := (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') - interval '6 days') AT TIME ZONE 'America/Sao_Paulo';
      v_end_date := now();
    WHEN '15days' THEN
      v_start_date := (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') - interval '14 days') AT TIME ZONE 'America/Sao_Paulo';
      v_end_date := now();
    WHEN 'month' THEN
      v_start_date := date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';
      v_end_date := now();
    WHEN 'thisMonth' THEN
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

  -- Contar total de registros
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
         pt.donor_cpf ILIKE '%' || p_search || '%' OR
         pt.product_name ILIKE '%' || p_search || '%' OR
         pt.txid ILIKE '%' || p_search || '%')
    AND (p_platform_filter = 'all' OR 
         (p_platform_filter = 'facebook' AND pt.utm_data->>'utm_source' ILIKE '%facebook%') OR
         (p_platform_filter = 'google' AND pt.utm_data->>'utm_source' ILIKE '%google%') OR
         (p_platform_filter = 'tiktok' AND pt.utm_data->>'utm_source' ILIKE '%tiktok%') OR
         (p_platform_filter = 'organic' AND (pt.utm_data IS NULL OR pt.utm_data->>'utm_source' IS NULL)));

  -- Calcular páginas
  v_pages := CEIL(v_total::numeric / p_per_page);

  -- Buscar transações
  SELECT jsonb_agg(t ORDER BY t.created_at DESC)
  INTO v_transactions
  FROM (
    SELECT 
      pt.id,
      pt.created_at,
      pt.amount,
      pt.status,
      pt.donor_name,
      pt.donor_email,
      pt.donor_cpf,
      pt.donor_phone,
      pt.product_name,
      pt.product_code,
      pt.txid,
      pt.pix_code,
      pt.paid_at,
      pt.expired_at,
      pt.fee_percentage,
      pt.fee_fixed,
      pt.popup_model,
      pt.utm_data,
      pt.order_bumps,
      pt.acquirer,
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
      pt.client_ip,
      pt.fingerprint_hash
    FROM pix_transactions pt
    WHERE pt.user_id = p_user_id
      AND (v_start_date IS NULL OR pt.created_at >= v_start_date)
      AND (v_end_date IS NULL OR pt.created_at < v_end_date)
      AND (p_status_filter = 'all' OR pt.status::text = p_status_filter)
      AND (p_search = '' OR 
           pt.donor_name ILIKE '%' || p_search || '%' OR 
           pt.donor_email ILIKE '%' || p_search || '%' OR
           pt.donor_cpf ILIKE '%' || p_search || '%' OR
           pt.product_name ILIKE '%' || p_search || '%' OR
           pt.txid ILIKE '%' || p_search || '%')
      AND (p_platform_filter = 'all' OR 
           (p_platform_filter = 'facebook' AND pt.utm_data->>'utm_source' ILIKE '%facebook%') OR
           (p_platform_filter = 'google' AND pt.utm_data->>'utm_source' ILIKE '%google%') OR
           (p_platform_filter = 'tiktok' AND pt.utm_data->>'utm_source' ILIKE '%tiktok%') OR
           (p_platform_filter = 'organic' AND (pt.utm_data IS NULL OR pt.utm_data->>'utm_source' IS NULL)))
    ORDER BY pt.created_at DESC
    LIMIT p_per_page
    OFFSET v_offset
  ) t;

  RETURN QUERY SELECT COALESCE(v_transactions, '[]'::jsonb), v_total, v_pages;
END;
$$;