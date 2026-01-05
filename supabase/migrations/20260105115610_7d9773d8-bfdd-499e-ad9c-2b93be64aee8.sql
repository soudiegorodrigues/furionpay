-- 1. Adicionar coluna product_code na tabela pix_transactions
ALTER TABLE public.pix_transactions 
ADD COLUMN IF NOT EXISTS product_code TEXT;

-- 2. Preencher dados existentes baseado no product_name
UPDATE public.pix_transactions t
SET product_code = p.product_code
FROM public.products p
WHERE t.product_name = p.name
AND t.product_code IS NULL
AND p.product_code IS NOT NULL;

-- 3. Atualizar a função get_user_transactions_paginated para incluir product_code na busca
CREATE OR REPLACE FUNCTION public.get_user_transactions_paginated(
  p_user_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_platform TEXT DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_per_page INTEGER DEFAULT 20
)
RETURNS TABLE (
  transactions JSONB,
  total_count BIGINT,
  total_pages INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset INTEGER;
  v_total BIGINT;
  v_pages INTEGER;
  v_is_admin BOOLEAN;
  v_requesting_user UUID;
BEGIN
  v_requesting_user := auth.uid();
  v_is_admin := has_role(v_requesting_user, 'admin');
  
  IF NOT v_is_admin AND (p_user_id IS NULL OR p_user_id != v_requesting_user) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  v_offset := (p_page - 1) * p_per_page;

  SELECT COUNT(*) INTO v_total
  FROM pix_transactions t
  WHERE (p_user_id IS NULL OR t.user_id = p_user_id)
    AND (p_status IS NULL OR t.status = p_status)
    AND (p_platform IS NULL OR 
         (p_platform = 'facebook' AND t.utm_data->>'utm_source' ILIKE '%facebook%') OR
         (p_platform = 'google' AND t.utm_data->>'utm_source' ILIKE '%google%') OR
         (p_platform = 'tiktok' AND t.utm_data->>'utm_source' ILIKE '%tiktok%') OR
         (p_platform = 'organic' AND (t.utm_data IS NULL OR t.utm_data->>'utm_source' IS NULL OR t.utm_data->>'utm_source' = ''))
        )
    AND (p_start_date IS NULL OR t.created_at >= p_start_date)
    AND (p_end_date IS NULL OR t.created_at <= p_end_date)
    AND (p_search IS NULL OR p_search = '' OR 
         t.donor_name ILIKE '%' || p_search || '%' OR
         t.donor_email ILIKE '%' || p_search || '%' OR
         t.donor_cpf ILIKE '%' || p_search || '%' OR
         t.product_name ILIKE '%' || p_search || '%' OR
         t.product_code ILIKE '%' || p_search || '%' OR
         t.txid ILIKE '%' || p_search || '%'
        );

  v_pages := CEIL(v_total::NUMERIC / p_per_page);

  RETURN QUERY
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'amount', t.amount,
        'status', t.status,
        'donor_name', t.donor_name,
        'donor_email', t.donor_email,
        'donor_cpf', t.donor_cpf,
        'product_name', t.product_name,
        'product_code', t.product_code,
        'popup_model', t.popup_model,
        'created_at', t.created_at,
        'paid_at', t.paid_at,
        'expired_at', t.expired_at,
        'txid', t.txid,
        'utm_data', t.utm_data,
        'fee_percentage', t.fee_percentage,
        'fee_fixed', t.fee_fixed,
        'order_bump_items', t.order_bump_items,
        'acquirer', t.acquirer
      ) ORDER BY t.created_at DESC
    ),
    v_total,
    v_pages
  FROM pix_transactions t
  WHERE (p_user_id IS NULL OR t.user_id = p_user_id)
    AND (p_status IS NULL OR t.status = p_status)
    AND (p_platform IS NULL OR 
         (p_platform = 'facebook' AND t.utm_data->>'utm_source' ILIKE '%facebook%') OR
         (p_platform = 'google' AND t.utm_data->>'utm_source' ILIKE '%google%') OR
         (p_platform = 'tiktok' AND t.utm_data->>'utm_source' ILIKE '%tiktok%') OR
         (p_platform = 'organic' AND (t.utm_data IS NULL OR t.utm_data->>'utm_source' IS NULL OR t.utm_data->>'utm_source' = ''))
        )
    AND (p_start_date IS NULL OR t.created_at >= p_start_date)
    AND (p_end_date IS NULL OR t.created_at <= p_end_date)
    AND (p_search IS NULL OR p_search = '' OR 
         t.donor_name ILIKE '%' || p_search || '%' OR
         t.donor_email ILIKE '%' || p_search || '%' OR
         t.donor_cpf ILIKE '%' || p_search || '%' OR
         t.product_name ILIKE '%' || p_search || '%' OR
         t.product_code ILIKE '%' || p_search || '%' OR
         t.txid ILIKE '%' || p_search || '%'
        )
  LIMIT p_per_page
  OFFSET v_offset;
END;
$$;