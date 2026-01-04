CREATE OR REPLACE FUNCTION public.get_global_transactions_paginated(
  p_page integer DEFAULT 1,
  p_per_page integer DEFAULT 50,
  p_status text DEFAULT NULL,
  p_start_date timestamp with time zone DEFAULT NULL,
  p_end_date timestamp with time zone DEFAULT NULL,
  p_search text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_offset integer;
  v_total bigint;
  v_result json;
BEGIN
  v_offset := (p_page - 1) * p_per_page;

  SELECT count(*) INTO v_total
  FROM pix_transactions pt
  LEFT JOIN auth.users u ON pt.user_id = u.id
  WHERE 
    (p_status IS NULL OR pt.status::text = p_status)
    AND (p_start_date IS NULL OR pt.created_at >= p_start_date)
    AND (p_end_date IS NULL OR pt.created_at <= p_end_date)
    AND (p_search IS NULL OR p_search = '' OR 
         pt.donor_name ILIKE '%' || p_search || '%' OR
         pt.txid ILIKE '%' || p_search || '%' OR
         pt.id::text ILIKE '%' || p_search || '%' OR
         u.email ILIKE '%' || p_search || '%' OR
         pt.product_name ILIKE '%' || p_search || '%' OR
         pt.client_ip ILIKE '%' || p_search || '%');

  SELECT json_build_object(
    'data', COALESCE(json_agg(row_to_json(t)), '[]'::json),
    'total', v_total,
    'page', p_page,
    'per_page', p_per_page,
    'total_pages', CEIL(v_total::float / p_per_page)
  ) INTO v_result
  FROM (
    SELECT
      pt.id,
      pt.amount,
      pt.status::text,
      pt.txid,
      pt.donor_name,
      pt.product_name,
      pt.created_at,
      pt.paid_at,
      u.email as user_email,
      pt.utm_data,
      pt.acquirer,
      pt.approved_by_email,
      pt.is_manual_approval,
      pt.client_ip
    FROM pix_transactions pt
    LEFT JOIN auth.users u ON pt.user_id = u.id
    WHERE 
      (p_status IS NULL OR pt.status::text = p_status)
      AND (p_start_date IS NULL OR pt.created_at >= p_start_date)
      AND (p_end_date IS NULL OR pt.created_at <= p_end_date)
      AND (p_search IS NULL OR p_search = '' OR 
           pt.donor_name ILIKE '%' || p_search || '%' OR
           pt.txid ILIKE '%' || p_search || '%' OR
           pt.id::text ILIKE '%' || p_search || '%' OR
           u.email ILIKE '%' || p_search || '%' OR
           pt.product_name ILIKE '%' || p_search || '%' OR
           pt.client_ip ILIKE '%' || p_search || '%')
    ORDER BY pt.created_at DESC
    LIMIT p_per_page
    OFFSET v_offset
  ) t;

  RETURN v_result;
END;
$function$;