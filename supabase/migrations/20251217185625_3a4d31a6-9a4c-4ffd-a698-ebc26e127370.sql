-- Drop both duplicate function versions
DROP FUNCTION IF EXISTS public.get_global_transactions_v2(text, text, integer, integer, text);
DROP FUNCTION IF EXISTS public.get_global_transactions_v2(integer, integer, text, text, text);

-- Recreate single correct version
CREATE OR REPLACE FUNCTION public.get_global_transactions_v2(
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0,
  p_status TEXT DEFAULT NULL,
  p_date_filter TEXT DEFAULT NULL,
  p_email_search TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  txid TEXT,
  amount NUMERIC,
  status pix_status,
  donor_name TEXT,
  product_name TEXT,
  created_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  user_email TEXT,
  utm_data JSONB,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_start_date TIMESTAMPTZ;
  v_total BIGINT;
BEGIN
  -- Only admins can view global transactions
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only admins can view global transactions';
  END IF;

  -- Calculate start date based on filter
  CASE p_date_filter
    WHEN 'today' THEN
      v_start_date := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE::TIMESTAMPTZ;
    WHEN '7days' THEN
      v_start_date := NOW() - INTERVAL '7 days';
    WHEN 'month' THEN
      v_start_date := DATE_TRUNC('month', NOW() AT TIME ZONE 'America/Sao_Paulo')::TIMESTAMPTZ;
    WHEN 'year' THEN
      v_start_date := DATE_TRUNC('year', NOW() AT TIME ZONE 'America/Sao_Paulo')::TIMESTAMPTZ;
    ELSE
      v_start_date := NULL;
  END CASE;

  -- Get total count for pagination
  SELECT COUNT(*) INTO v_total
  FROM pix_transactions pt
  LEFT JOIN auth.users u ON u.id = pt.user_id
  WHERE (p_status IS NULL OR pt.status::TEXT = p_status)
    AND (v_start_date IS NULL OR pt.created_at >= v_start_date)
    AND (p_email_search IS NULL OR p_email_search = '' OR u.email ILIKE '%' || p_email_search || '%');

  -- Return results with total count
  RETURN QUERY
  SELECT 
    pt.id,
    pt.txid,
    pt.amount,
    pt.status,
    pt.donor_name,
    pt.product_name,
    pt.created_at,
    pt.paid_at,
    u.email::TEXT as user_email,
    pt.utm_data,
    v_total as total_count
  FROM pix_transactions pt
  LEFT JOIN auth.users u ON u.id = pt.user_id
  WHERE (p_status IS NULL OR pt.status::TEXT = p_status)
    AND (v_start_date IS NULL OR pt.created_at >= v_start_date)
    AND (p_email_search IS NULL OR p_email_search = '' OR u.email ILIKE '%' || p_email_search || '%')
  ORDER BY pt.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;