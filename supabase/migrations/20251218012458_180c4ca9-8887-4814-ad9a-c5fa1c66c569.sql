-- Drop the existing function
DROP FUNCTION IF EXISTS public.get_global_transactions_v2(integer, integer, text, text, text);

-- Recreate with proper CAST for email field
CREATE OR REPLACE FUNCTION public.get_global_transactions_v2(
  p_limit INT DEFAULT 10,
  p_offset INT DEFAULT 0,
  p_status TEXT DEFAULT 'all',
  p_date_filter TEXT DEFAULT 'all',
  p_email_search TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  amount NUMERIC,
  status pix_status,
  created_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  donor_name TEXT,
  product_name TEXT,
  txid TEXT,
  user_email TEXT,
  acquirer TEXT,
  utm_data JSONB,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total BIGINT;
  v_today_start TIMESTAMPTZ;
  v_date_start TIMESTAMPTZ;
BEGIN
  -- Calculate Brazil timezone start of today
  v_today_start := (NOW() AT TIME ZONE 'America/Sao_Paulo')::date::timestamptz;
  
  -- Calculate date filter start
  v_date_start := CASE p_date_filter
    WHEN 'today' THEN v_today_start
    WHEN '7days' THEN v_today_start - INTERVAL '7 days'
    WHEN 'month' THEN date_trunc('month', NOW() AT TIME ZONE 'America/Sao_Paulo')::timestamptz
    WHEN 'year' THEN date_trunc('year', NOW() AT TIME ZONE 'America/Sao_Paulo')::timestamptz
    ELSE NULL
  END;

  -- Get total count
  SELECT COUNT(*)
  INTO v_total
  FROM pix_transactions pt
  LEFT JOIN auth.users u ON pt.user_id = u.id
  WHERE 
    (p_status = 'all' OR pt.status::text = p_status)
    AND (v_date_start IS NULL OR pt.created_at >= v_date_start)
    AND (p_email_search IS NULL OR p_email_search = '' OR u.email ILIKE '%' || p_email_search || '%');

  -- Return results
  RETURN QUERY
  SELECT 
    pt.id,
    pt.amount,
    pt.status,
    pt.created_at,
    pt.paid_at,
    pt.donor_name,
    pt.product_name,
    pt.txid,
    CAST(u.email AS TEXT) as user_email,
    pt.acquirer,
    pt.utm_data,
    v_total as total_count
  FROM pix_transactions pt
  LEFT JOIN auth.users u ON pt.user_id = u.id
  WHERE 
    (p_status = 'all' OR pt.status::text = p_status)
    AND (v_date_start IS NULL OR pt.created_at >= v_date_start)
    AND (p_email_search IS NULL OR p_email_search = '' OR u.email ILIKE '%' || p_email_search || '%')
  ORDER BY pt.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;