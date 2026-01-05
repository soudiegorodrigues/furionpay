-- Update get_user_transactions_paginated (JSON version with p_date_filter) to search by product_code
CREATE OR REPLACE FUNCTION public.get_user_transactions_paginated(
  p_page INTEGER DEFAULT 1,
  p_per_page INTEGER DEFAULT 10,
  p_date_filter TEXT DEFAULT 'all',
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_platform TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_offset INTEGER;
  v_total INTEGER;
  v_items JSON;
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  -- Get the authenticated user's ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('items', '[]'::json, 'total', 0);
  END IF;

  -- Calculate date range based on filter
  CASE p_date_filter
    WHEN 'today' THEN
      v_start_date := CURRENT_DATE;
      v_end_date := CURRENT_DATE;
    WHEN 'yesterday' THEN
      v_start_date := CURRENT_DATE - INTERVAL '1 day';
      v_end_date := CURRENT_DATE - INTERVAL '1 day';
    WHEN 'last7days' THEN
      v_start_date := CURRENT_DATE - INTERVAL '7 days';
      v_end_date := CURRENT_DATE;
    WHEN 'last30days' THEN
      v_start_date := CURRENT_DATE - INTERVAL '30 days';
      v_end_date := CURRENT_DATE;
    WHEN 'thisMonth' THEN
      v_start_date := DATE_TRUNC('month', CURRENT_DATE);
      v_end_date := CURRENT_DATE;
    WHEN 'lastMonth' THEN
      v_start_date := DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month');
      v_end_date := DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day';
    WHEN 'custom' THEN
      v_start_date := COALESCE(p_start_date, CURRENT_DATE - INTERVAL '30 days');
      v_end_date := COALESCE(p_end_date, CURRENT_DATE);
    ELSE
      v_start_date := NULL;
      v_end_date := NULL;
  END CASE;

  -- Calculate offset
  v_offset := (p_page - 1) * p_per_page;

  -- Get total count with filters
  SELECT COUNT(*)
  INTO v_total
  FROM pix_transactions t
  WHERE t.user_id = v_user_id
    AND (v_start_date IS NULL OR t.created_at::date >= v_start_date)
    AND (v_end_date IS NULL OR t.created_at::date <= v_end_date)
    AND (p_status IS NULL OR p_status = '' OR t.status::text = p_status)
    AND (p_platform IS NULL OR p_platform = '' OR t.acquirer = p_platform)
    AND (
      p_search IS NULL 
      OR p_search = '' 
      OR t.donor_name ILIKE '%' || p_search || '%'
      OR t.donor_email ILIKE '%' || p_search || '%'
      OR t.donor_cpf ILIKE '%' || p_search || '%'
      OR t.txid ILIKE '%' || p_search || '%'
      OR t.product_name ILIKE '%' || p_search || '%'
      OR t.product_code ILIKE '%' || p_search || '%'
    );

  -- Get paginated items
  SELECT json_agg(row_to_json(tx))
  INTO v_items
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
      t.txid,
      t.product_name,
      t.product_code,
      t.popup_model,
      t.acquirer,
      t.fee_percentage,
      t.fee_fixed,
      t.pix_code,
      t.order_bumps,
      t.utm_data,
      t.is_manual_approval,
      t.approved_by_email,
      t.donor_cep,
      t.donor_street,
      t.donor_number,
      t.donor_complement,
      t.donor_neighborhood,
      t.donor_city,
      t.donor_state,
      t.donor_birthdate
    FROM pix_transactions t
    WHERE t.user_id = v_user_id
      AND (v_start_date IS NULL OR t.created_at::date >= v_start_date)
      AND (v_end_date IS NULL OR t.created_at::date <= v_end_date)
      AND (p_status IS NULL OR p_status = '' OR t.status::text = p_status)
      AND (p_platform IS NULL OR p_platform = '' OR t.acquirer = p_platform)
      AND (
        p_search IS NULL 
        OR p_search = '' 
        OR t.donor_name ILIKE '%' || p_search || '%'
        OR t.donor_email ILIKE '%' || p_search || '%'
        OR t.donor_cpf ILIKE '%' || p_search || '%'
        OR t.txid ILIKE '%' || p_search || '%'
        OR t.product_name ILIKE '%' || p_search || '%'
        OR t.product_code ILIKE '%' || p_search || '%'
      )
    ORDER BY t.created_at DESC
    LIMIT p_per_page
    OFFSET v_offset
  ) tx;

  RETURN json_build_object(
    'items', COALESCE(v_items, '[]'::json),
    'total', v_total
  );
END;
$$;