-- Drop and recreate get_user_transactions_paginated with offer data
CREATE OR REPLACE FUNCTION public.get_user_transactions_paginated(
  p_user_id UUID,
  p_status TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_page_size INT DEFAULT 50,
  p_cursor TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  amount NUMERIC,
  status TEXT,
  donor_name TEXT,
  donor_email TEXT,
  donor_phone TEXT,
  donor_cpf TEXT,
  product_name TEXT,
  product_code TEXT,
  popup_model TEXT,
  created_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  txid TEXT,
  pix_code TEXT,
  acquirer TEXT,
  fee_percentage NUMERIC,
  fee_fixed NUMERIC,
  client_ip TEXT,
  utm_data JSONB,
  order_bumps JSONB,
  offer_id UUID,
  offer_code TEXT,
  offer_domain TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pt.id,
    pt.amount,
    pt.status::TEXT,
    pt.donor_name,
    pt.donor_email,
    pt.donor_phone,
    pt.donor_cpf,
    pt.product_name,
    pt.product_code,
    pt.popup_model,
    pt.created_at,
    pt.paid_at,
    pt.expired_at,
    pt.txid,
    pt.pix_code,
    pt.acquirer,
    pt.fee_percentage,
    pt.fee_fixed,
    pt.client_ip,
    pt.utm_data,
    pt.order_bumps,
    pt.offer_id,
    po.offer_code,
    po.domain
  FROM public.pix_transactions pt
  LEFT JOIN public.product_offers po ON pt.offer_id = po.id
  WHERE pt.user_id = p_user_id
    AND (p_status IS NULL OR pt.status::TEXT = p_status)
    AND (p_search IS NULL OR 
         pt.donor_name ILIKE '%' || p_search || '%' OR 
         pt.donor_email ILIKE '%' || p_search || '%' OR
         pt.donor_cpf ILIKE '%' || p_search || '%' OR
         pt.product_name ILIKE '%' || p_search || '%')
    AND (p_start_date IS NULL OR pt.created_at >= p_start_date)
    AND (p_end_date IS NULL OR pt.created_at <= p_end_date)
    AND (p_cursor IS NULL OR pt.created_at < p_cursor)
  ORDER BY pt.created_at DESC
  LIMIT p_page_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate get_global_transactions_paginated with offer data
CREATE OR REPLACE FUNCTION public.get_global_transactions_paginated(
  p_status TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_page_size INT DEFAULT 50,
  p_cursor TIMESTAMPTZ DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  amount NUMERIC,
  status TEXT,
  donor_name TEXT,
  donor_email TEXT,
  donor_phone TEXT,
  donor_cpf TEXT,
  product_name TEXT,
  product_code TEXT,
  popup_model TEXT,
  created_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  txid TEXT,
  pix_code TEXT,
  acquirer TEXT,
  fee_percentage NUMERIC,
  fee_fixed NUMERIC,
  client_ip TEXT,
  utm_data JSONB,
  order_bumps JSONB,
  user_id UUID,
  offer_id UUID,
  offer_code TEXT,
  offer_domain TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pt.id,
    pt.amount,
    pt.status::TEXT,
    pt.donor_name,
    pt.donor_email,
    pt.donor_phone,
    pt.donor_cpf,
    pt.product_name,
    pt.product_code,
    pt.popup_model,
    pt.created_at,
    pt.paid_at,
    pt.expired_at,
    pt.txid,
    pt.pix_code,
    pt.acquirer,
    pt.fee_percentage,
    pt.fee_fixed,
    pt.client_ip,
    pt.utm_data,
    pt.order_bumps,
    pt.user_id,
    pt.offer_id,
    po.offer_code,
    po.domain
  FROM public.pix_transactions pt
  LEFT JOIN public.product_offers po ON pt.offer_id = po.id
  WHERE (p_status IS NULL OR pt.status::TEXT = p_status)
    AND (p_user_id IS NULL OR pt.user_id = p_user_id)
    AND (p_search IS NULL OR 
         pt.donor_name ILIKE '%' || p_search || '%' OR 
         pt.donor_email ILIKE '%' || p_search || '%' OR
         pt.donor_cpf ILIKE '%' || p_search || '%' OR
         pt.product_name ILIKE '%' || p_search || '%')
    AND (p_start_date IS NULL OR pt.created_at >= p_start_date)
    AND (p_end_date IS NULL OR pt.created_at <= p_end_date)
    AND (p_cursor IS NULL OR pt.created_at < p_cursor)
  ORDER BY pt.created_at DESC
  LIMIT p_page_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;