-- Drop e recriar as funções para buscar offer_code/domain pelo product_code
DROP FUNCTION IF EXISTS get_user_transactions_paginated(UUID, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, INT, INT);
DROP FUNCTION IF EXISTS get_global_transactions_paginated(TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, INT, INT);

-- Recriar RPC do usuário
CREATE OR REPLACE FUNCTION get_user_transactions_paginated(
  p_user_id UUID,
  p_status TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_popup_model TEXT DEFAULT NULL,
  p_page_number INT DEFAULT 1,
  p_page_size INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  txid TEXT,
  amount NUMERIC,
  status TEXT,
  donor_name TEXT,
  donor_email TEXT,
  donor_cpf TEXT,
  donor_phone TEXT,
  donor_cep TEXT,
  donor_street TEXT,
  donor_number TEXT,
  donor_complement TEXT,
  donor_neighborhood TEXT,
  donor_city TEXT,
  donor_state TEXT,
  product_name TEXT,
  product_code TEXT,
  popup_model TEXT,
  pix_code TEXT,
  created_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  acquirer TEXT,
  utm_data JSONB,
  is_manual_approval BOOLEAN,
  approved_by_email TEXT,
  offer_id UUID,
  order_bumps JSONB,
  offer_code TEXT,
  offer_domain TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pt.id,
    pt.txid,
    pt.amount,
    pt.status::TEXT,
    pt.donor_name,
    pt.donor_email,
    pt.donor_cpf,
    pt.donor_phone,
    pt.donor_cep,
    pt.donor_street,
    pt.donor_number,
    pt.donor_complement,
    pt.donor_neighborhood,
    pt.donor_city,
    pt.donor_state,
    pt.product_name,
    pt.product_code,
    pt.popup_model,
    pt.pix_code,
    pt.created_at,
    pt.paid_at,
    pt.expired_at,
    pt.acquirer,
    pt.utm_data,
    pt.is_manual_approval,
    pt.approved_by_email,
    pt.offer_id,
    pt.order_bumps,
    COALESCE(
      po_direct.offer_code,
      (SELECT po2.offer_code FROM product_offers po2 
       JOIN products p ON p.id = po2.product_id 
       WHERE p.product_code = pt.product_code AND po2.is_active = true 
       LIMIT 1)
    ) AS offer_code,
    COALESCE(
      po_direct.domain,
      (SELECT po2.domain FROM product_offers po2 
       JOIN products p ON p.id = po2.product_id 
       WHERE p.product_code = pt.product_code AND po2.is_active = true 
       LIMIT 1)
    ) AS offer_domain
  FROM pix_transactions pt
  LEFT JOIN product_offers po_direct ON pt.offer_id = po_direct.id
  WHERE pt.user_id = p_user_id
    AND (p_status IS NULL OR pt.status::TEXT = p_status)
    AND (p_popup_model IS NULL OR pt.popup_model = p_popup_model)
    AND (p_start_date IS NULL OR pt.created_at >= p_start_date)
    AND (p_end_date IS NULL OR pt.created_at <= p_end_date)
    AND (p_search IS NULL OR p_search = '' OR 
         pt.donor_name ILIKE '%' || p_search || '%' OR 
         pt.donor_email ILIKE '%' || p_search || '%' OR 
         pt.donor_cpf ILIKE '%' || p_search || '%' OR
         pt.txid ILIKE '%' || p_search || '%')
  ORDER BY pt.created_at DESC
  LIMIT p_page_size
  OFFSET (p_page_number - 1) * p_page_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar RPC global
CREATE OR REPLACE FUNCTION get_global_transactions_paginated(
  p_status TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_popup_model TEXT DEFAULT NULL,
  p_page_number INT DEFAULT 1,
  p_page_size INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  txid TEXT,
  amount NUMERIC,
  status TEXT,
  donor_name TEXT,
  donor_email TEXT,
  donor_cpf TEXT,
  donor_phone TEXT,
  donor_cep TEXT,
  donor_street TEXT,
  donor_number TEXT,
  donor_complement TEXT,
  donor_neighborhood TEXT,
  donor_city TEXT,
  donor_state TEXT,
  product_name TEXT,
  product_code TEXT,
  popup_model TEXT,
  pix_code TEXT,
  created_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  acquirer TEXT,
  utm_data JSONB,
  is_manual_approval BOOLEAN,
  approved_by_email TEXT,
  offer_id UUID,
  order_bumps JSONB,
  user_id UUID,
  offer_code TEXT,
  offer_domain TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pt.id,
    pt.txid,
    pt.amount,
    pt.status::TEXT,
    pt.donor_name,
    pt.donor_email,
    pt.donor_cpf,
    pt.donor_phone,
    pt.donor_cep,
    pt.donor_street,
    pt.donor_number,
    pt.donor_complement,
    pt.donor_neighborhood,
    pt.donor_city,
    pt.donor_state,
    pt.product_name,
    pt.product_code,
    pt.popup_model,
    pt.pix_code,
    pt.created_at,
    pt.paid_at,
    pt.expired_at,
    pt.acquirer,
    pt.utm_data,
    pt.is_manual_approval,
    pt.approved_by_email,
    pt.offer_id,
    pt.order_bumps,
    pt.user_id,
    COALESCE(
      po_direct.offer_code,
      (SELECT po2.offer_code FROM product_offers po2 
       JOIN products p ON p.id = po2.product_id 
       WHERE p.product_code = pt.product_code AND po2.is_active = true 
       LIMIT 1)
    ) AS offer_code,
    COALESCE(
      po_direct.domain,
      (SELECT po2.domain FROM product_offers po2 
       JOIN products p ON p.id = po2.product_id 
       WHERE p.product_code = pt.product_code AND po2.is_active = true 
       LIMIT 1)
    ) AS offer_domain
  FROM pix_transactions pt
  LEFT JOIN product_offers po_direct ON pt.offer_id = po_direct.id
  WHERE (p_status IS NULL OR pt.status::TEXT = p_status)
    AND (p_popup_model IS NULL OR pt.popup_model = p_popup_model)
    AND (p_start_date IS NULL OR pt.created_at >= p_start_date)
    AND (p_end_date IS NULL OR pt.created_at <= p_end_date)
    AND (p_search IS NULL OR p_search = '' OR 
         pt.donor_name ILIKE '%' || p_search || '%' OR 
         pt.donor_email ILIKE '%' || p_search || '%' OR 
         pt.donor_cpf ILIKE '%' || p_search || '%' OR
         pt.txid ILIKE '%' || p_search || '%')
  ORDER BY pt.created_at DESC
  LIMIT p_page_size
  OFFSET (p_page_number - 1) * p_page_size;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;