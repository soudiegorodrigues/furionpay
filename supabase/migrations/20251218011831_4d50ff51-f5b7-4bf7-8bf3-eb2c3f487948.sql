-- Drop existing function and recreate with acquirer field
DROP FUNCTION IF EXISTS public.get_global_transactions_v2(INT, INT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.get_global_transactions_v2(
  p_limit INT DEFAULT 10,
  p_offset INT DEFAULT 0,
  p_status TEXT DEFAULT NULL,
  p_date_filter TEXT DEFAULT NULL,
  p_email_search TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  txid TEXT,
  amount NUMERIC,
  status pix_status,
  created_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  donor_name TEXT,
  product_name TEXT,
  user_email TEXT,
  utm_data JSONB,
  acquirer TEXT,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total BIGINT;
  v_start_date TIMESTAMPTZ;
BEGIN
  -- Check if user is admin
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  -- Calculate date filter
  IF p_date_filter IS NOT NULL THEN
    CASE p_date_filter
      WHEN 'today' THEN
        v_start_date := (NOW() AT TIME ZONE 'America/Sao_Paulo')::date;
      WHEN '7days' THEN
        v_start_date := ((NOW() AT TIME ZONE 'America/Sao_Paulo') - INTERVAL '7 days')::date;
      WHEN 'month' THEN
        v_start_date := DATE_TRUNC('month', NOW() AT TIME ZONE 'America/Sao_Paulo');
      WHEN 'year' THEN
        v_start_date := DATE_TRUNC('year', NOW() AT TIME ZONE 'America/Sao_Paulo');
      ELSE
        v_start_date := NULL;
    END CASE;
  END IF;

  -- Get total count
  SELECT COUNT(*)
  INTO v_total
  FROM pix_transactions pt
  LEFT JOIN auth.users u ON pt.user_id = u.id
  WHERE (p_status IS NULL OR pt.status::TEXT = p_status)
    AND (v_start_date IS NULL OR pt.created_at >= v_start_date)
    AND (p_email_search IS NULL OR p_email_search = '' OR u.email ILIKE '%' || p_email_search || '%');

  -- Return results
  RETURN QUERY
  SELECT 
    pt.id,
    pt.txid,
    pt.amount,
    pt.status,
    pt.created_at,
    pt.paid_at,
    pt.donor_name,
    pt.product_name,
    u.email as user_email,
    pt.utm_data,
    pt.acquirer,
    v_total as total_count
  FROM pix_transactions pt
  LEFT JOIN auth.users u ON pt.user_id = u.id
  WHERE (p_status IS NULL OR pt.status::TEXT = p_status)
    AND (v_start_date IS NULL OR pt.created_at >= v_start_date)
    AND (p_email_search IS NULL OR p_email_search = '' OR u.email ILIKE '%' || p_email_search || '%')
  ORDER BY pt.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;