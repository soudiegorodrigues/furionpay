-- Drop existing function first to allow parameter name changes
DROP FUNCTION IF EXISTS public.get_user_transactions_paginated(integer, integer, text, timestamptz, timestamptz, text, text, text);

-- Recreate with proper parameters and updated date filter support
CREATE OR REPLACE FUNCTION public.get_user_transactions_paginated(
  p_page integer DEFAULT 1,
  p_items_per_page integer DEFAULT 10,
  p_date_filter text DEFAULT 'today',
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_status_filter text DEFAULT 'all',
  p_search text DEFAULT '',
  p_platform_filter text DEFAULT 'all'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_total integer;
  v_transactions jsonb;
  v_offset integer;
  v_start_date timestamptz;
  v_end_date timestamptz;
BEGIN
  v_user_id := public.get_effective_owner_id(auth.uid());
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('total', 0, 'transactions', '[]'::jsonb);
  END IF;

  -- Support both old and new filter value naming
  CASE p_date_filter
    WHEN 'today' THEN
      v_start_date := (now() AT TIME ZONE 'America/Sao_Paulo')::date::timestamptz;
      v_end_date := v_start_date + interval '1 day';
    WHEN 'yesterday' THEN
      v_start_date := ((now() AT TIME ZONE 'America/Sao_Paulo')::date - interval '1 day')::timestamptz;
      v_end_date := (now() AT TIME ZONE 'America/Sao_Paulo')::date::timestamptz;
    WHEN '7days', 'last7days' THEN
      v_start_date := ((now() AT TIME ZONE 'America/Sao_Paulo')::date - interval '7 days')::timestamptz;
      v_end_date := now();
    WHEN '15days' THEN
      v_start_date := ((now() AT TIME ZONE 'America/Sao_Paulo')::date - interval '15 days')::timestamptz;
      v_end_date := now();
    WHEN 'month', 'thisMonth' THEN
      v_start_date := date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo')::timestamptz;
      v_end_date := now();
    WHEN 'year' THEN
      v_start_date := date_trunc('year', now() AT TIME ZONE 'America/Sao_Paulo')::timestamptz;
      v_end_date := now();
    WHEN 'custom' THEN
      v_start_date := COALESCE(p_start_date, now() - interval '30 days');
      v_end_date := COALESCE(p_end_date, now());
    WHEN 'all' THEN
      v_start_date := NULL;
      v_end_date := NULL;
    ELSE
      v_start_date := (now() AT TIME ZONE 'America/Sao_Paulo')::date::timestamptz;
      v_end_date := v_start_date + interval '1 day';
  END CASE;

  v_offset := (p_page - 1) * p_items_per_page;

  SELECT COUNT(*)
  INTO v_total
  FROM pix_transactions t
  WHERE t.user_id = v_user_id
    AND (v_start_date IS NULL OR t.created_at >= v_start_date)
    AND (v_end_date IS NULL OR t.created_at < v_end_date)
    AND (p_status_filter = 'all' OR t.status::text = p_status_filter)
    AND (p_platform_filter = 'all' OR 
         (p_platform_filter = 'facebook' AND t.utm_data->>'utm_source' ILIKE '%facebook%') OR
         (p_platform_filter = 'google' AND t.utm_data->>'utm_source' ILIKE '%google%') OR
         (p_platform_filter = 'tiktok' AND t.utm_data->>'utm_source' ILIKE '%tiktok%') OR
         (p_platform_filter = 'other' AND (
           t.utm_data->>'utm_source' IS NULL OR
           (t.utm_data->>'utm_source' NOT ILIKE '%facebook%' AND
            t.utm_data->>'utm_source' NOT ILIKE '%google%' AND
            t.utm_data->>'utm_source' NOT ILIKE '%tiktok%')
         ))
    )
    AND (p_search IS NULL OR p_search = '' OR
         t.donor_name ILIKE '%' || p_search || '%' OR
         t.donor_email ILIKE '%' || p_search || '%' OR
         t.donor_cpf ILIKE '%' || p_search || '%' OR
         t.product_name ILIKE '%' || p_search || '%' OR
         t.txid ILIKE '%' || p_search || '%' OR
         t.product_code ILIKE '%' || p_search || '%'
    );

  SELECT jsonb_agg(row_to_json(t_data)::jsonb ORDER BY t_data.created_at DESC)
  INTO v_transactions
  FROM (
    SELECT 
      t.id,
      t.amount,
      t.status,
      t.created_at,
      t.paid_at,
      t.expired_at,
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
      t.product_name,
      t.product_code,
      t.popup_model,
      t.txid,
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
    WHERE t.user_id = v_user_id
      AND (v_start_date IS NULL OR t.created_at >= v_start_date)
      AND (v_end_date IS NULL OR t.created_at < v_end_date)
      AND (p_status_filter = 'all' OR t.status::text = p_status_filter)
      AND (p_platform_filter = 'all' OR 
           (p_platform_filter = 'facebook' AND t.utm_data->>'utm_source' ILIKE '%facebook%') OR
           (p_platform_filter = 'google' AND t.utm_data->>'utm_source' ILIKE '%google%') OR
           (p_platform_filter = 'tiktok' AND t.utm_data->>'utm_source' ILIKE '%tiktok%') OR
           (p_platform_filter = 'other' AND (
             t.utm_data->>'utm_source' IS NULL OR
             (t.utm_data->>'utm_source' NOT ILIKE '%facebook%' AND
              t.utm_data->>'utm_source' NOT ILIKE '%google%' AND
              t.utm_data->>'utm_source' NOT ILIKE '%tiktok%')
           ))
      )
      AND (p_search IS NULL OR p_search = '' OR
           t.donor_name ILIKE '%' || p_search || '%' OR
           t.donor_email ILIKE '%' || p_search || '%' OR
           t.donor_cpf ILIKE '%' || p_search || '%' OR
           t.product_name ILIKE '%' || p_search || '%' OR
           t.txid ILIKE '%' || p_search || '%' OR
           t.product_code ILIKE '%' || p_search || '%'
      )
    ORDER BY t.created_at DESC
    LIMIT p_items_per_page
    OFFSET v_offset
  ) t_data;

  RETURN jsonb_build_object(
    'total', v_total,
    'transactions', COALESCE(v_transactions, '[]'::jsonb)
  );
END;
$$;